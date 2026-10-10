#!/usr/bin/env bash
# Local pipeline for boarded on the M900 (homelab #698). GitHub Actions is OFF
# on every Libertygos repo (Jules, 2026-10-10), so this script does what
# `.github/workflows/ci.yml` did: check + test, image build, ghcr push, homelab retarget.
# The workflow file stays in place: re-enabling Actions is a separate decision.
#
#   scripts/ci-local.sh [--only check|image] [--push [--dry-run]] [--retarget] [--latest] [ref]
#   ref defaults to HEAD (committed state only: commit, or stash, first).
#
#   check    pnpm install --frozen-lockfile; build engine; typecheck; engine + server + client tests; build engine, server, client
#   image    docker build -t ghcr.io/libertygos/boarded:<sha> from the same tree (always built
#            locally; this is the image that gets pushed, never rebuilt)
#   --push   push ghcr.io/libertygos/boarded:<sha> to ghcr.io. The sha tag is immutable and no
#            manifest in homelab follows a moving tag (infra/boarded pins newTag to a sha), so a push
#            deploys nothing by itself. The workflow also pushed `latest`; nothing follows it, so it is opt-in here (--latest).
#            Auth: an existing `docker login ghcr.io`, or GHCR_TOKEN (a PAT with
#            write:packages; GHCR_USER defaults to Libertygos) which is used in
#            a throwaway DOCKER_CONFIG and never printed or stored.
#   --latest  also push :latest.
#   --dry-run  with --push / --retarget: print what would happen, change nothing.
#   --retarget  with --push: the deploy. Commit to Libertygos/homelab main bumping
#            infra/boarded/kustomization.yaml newTag to the pushed sha (what the
#            workflow's `retarget` job did); ArgoCD does the rest. A real
#            deploy: only on purpose. Always try it with --dry-run first.
#
# Nothing runs by default beyond check + image build: a push is always explicit.
# Checks run in a node:22 container (with git, some tests shell out to it) on a
# clone of the repo checked out at the ref, as the calling
# user, so nothing root-owned is left behind.
set -euo pipefail

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; }

IMAGE=ghcr.io/libertygos/boarded
ONLY="" PUSH=0 DRY=0 RETARGET=0 LATEST="" REF=HEAD
while [ $# -gt 0 ]; do
  case $1 in
    --only) ONLY=${2:?--only needs check or image}; shift ;;
    --only=*) ONLY=${1#--only=} ;;
    --push) PUSH=1 ;;
    --dry-run) DRY=1 ;;
    --retarget) RETARGET=1 ;;
    --latest) LATEST=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
    *) REF=$1 ;;
  esac
  shift
done
case "$ONLY" in ""|check|image) ;; *) echo "--only: check or image" >&2; exit 2 ;; esac
[ $DRY = 0 ] || [ $PUSH = 1 ] || { echo "--dry-run only makes sense with --push" >&2; exit 2; }
[ $RETARGET = 0 ] || [ $PUSH = 1 ] || { echo "--retarget needs --push" >&2; exit 2; }

REPO=$(git rev-parse --show-toplevel)
SHA=$(git -C "$REPO" rev-parse --verify "$REF^{commit}")
if [ $RETARGET = 1 ] && [ $DRY = 0 ]; then
  [ -z "$ONLY" ] || { echo "--retarget (real) needs the full run: no --only" >&2; exit 2; }
  git -C "$REPO" fetch -q origin main
  git -C "$REPO" merge-base --is-ancestor "$SHA" origin/main ||
    { echo "--retarget (real) refused: $SHA is not on origin/main (land it first)" >&2; exit 2; }
fi
NODE=docker.io/library/node:22-bookworm
CACHE=${CI_LOCAL_CACHE:-$HOME/.cache/boarded-ci-local}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/boarded-ci.XXXXXX")
RUNID=bd-ci-$$
NET=$RUNID
DOCKER_CONFIG_TMP=""
cleanup() {
  docker ps -aq --filter "label=agent.run=$RUNID" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK" "$DOCKER_CONFIG_TMP"
}
trap cleanup EXIT
trap 'echo; echo "ci-local: interrupted" >&2; exit 130' INT TERM HUP
mkdir -p "$CACHE/npm"
git clone -q --no-hardlinks "$REPO" "$WORK/src" && git -C "$WORK/src" checkout -q --detach "$SHA"
TREE=$WORK/src
echo "ci-local: ${SHA:0:12} ($REF), work dir $WORK"
T0=$SECONDS
PNPM_V=$(sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' "$TREE/package.json")
[ -n "$PNPM_V" ] || { echo "cannot read packageManager from package.json" >&2; exit 1; }
PNPM="npx -y pnpm@$PNPM_V"
mkdir -p "$CACHE/pnpm-store"
run_in_node() { # run_in_node <env...> -- <shell command>: throwaway node container on the tree
  local envs=()
  while [ "$1" != -- ]; do envs+=(-e "$1"); shift; done
  shift
  docker run --rm --label "agent.run=$RUNID" -u "$(id -u):$(id -g)" --network "$NET" \
    -e HOME=/tmp -e CI=true -e npm_config_cache=/cache/npm -e npm_config_store_dir=/cache/pnpm-store "${envs[@]}" \
    -v "$CACHE:/cache" -v "$TREE:/w" -w /w "$NODE" bash -ec "$1"
}
docker network create --label "agent.run=$RUNID" "$NET" >/dev/null

mkdir -p "$CACHE/logs"
step() { # step <name> <shell command> [ENV=value]: one check, log kept in $CACHE/logs
  local t=$SECONDS log="$CACHE/logs/$1.log" rc=0
  printf '%-10s ... ' "$1"
  run_in_node ${3:+"$3"} -- "$2" >"$log" 2>&1 || rc=$?
  if [ $rc != 0 ]; then
    echo "FAIL ($((SECONDS - t))s)"; tail -60 "$log"
    echo "ci-local: FAILED at step '$1'; full log: $log" >&2; exit 1
  fi
  echo "ok ($((SECONDS - t))s)"
}

if [ "$ONLY" != image ]; then
  step install "$PNPM install --frozen-lockfile"
  step engine "$PNPM --filter @boarded/engine build"
  step typecheck "$PNPM typecheck"
  step test "$PNPM --filter @boarded/engine test && $PNPM --filter @boarded/server test && $PNPM --filter @boarded/client test"
  step build "$PNPM --filter @boarded/engine build && $PNPM --filter @boarded/server build && $PNPM --filter @boarded/client build"
fi

if [ "$ONLY" != check ]; then
  printf '%-10s ... ' image; t=$SECONDS
  docker build -q -t "$IMAGE:$SHA" "$TREE" >/dev/null
  echo "ok ($((SECONDS - t))s)  $IMAGE:${SHA:0:12}"
fi

if [ $PUSH = 1 ]; then
  [ "$ONLY" != check ] || { echo "--push needs the image step" >&2; exit 2; }
  tags=("$IMAGE:$SHA" ${LATEST:+"$IMAGE:latest"})
  [ -z "$LATEST" ] || docker tag "$IMAGE:$SHA" "$IMAGE:latest"
  if [ $DRY = 1 ]; then
    for t in "${tags[@]}"; do echo "push       DRY-RUN: docker push $t"; done
  else
    if [ -n "${GHCR_TOKEN:-}" ]; then
      DOCKER_CONFIG_TMP=$(mktemp -d "${TMPDIR:-/tmp}/ghcr-login.XXXXXX")
      export DOCKER_CONFIG=$DOCKER_CONFIG_TMP
      printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-Libertygos}" --password-stdin >/dev/null
    elif ! grep -q '"ghcr.io"' "${DOCKER_CONFIG:-$HOME/.docker}/config.json" 2>/dev/null; then
      echo "push: not logged in to ghcr.io (no docker login, no GHCR_TOKEN); the image is built but not pushed" >&2
      exit 1
    fi
    for t in "${tags[@]}"; do docker push -q "$t" >/dev/null; echo "push       ok  $t"; done
  fi
fi

if [ $RETARGET = 1 ]; then
  HL=$WORK/homelab-deploy
  f=infra/boarded/kustomization.yaml
  git clone -q --depth 1 https://github.com/Libertygos/homelab.git "$HL"
  sed -i -E "s/^(\s*newTag:\s*).*/\1\"${SHA}\"/" "$HL/$f"
  if git -C "$HL" diff --quiet -- "$f"; then echo "retarget: no-op bump (already $SHA?)" >&2; exit 1; fi
  if [ $DRY = 1 ]; then
    echo "retarget   DRY-RUN: would commit and push to Libertygos/homelab main:"
    git -C "$HL" diff -U0 -- "$f" | grep '^[+-]' | grep -v '^\(+++\|---\)'
  else
    git -C "$HL" -c user.name=boarded-ci -c user.email=boarded-ci@users.noreply.github.com \
      commit -qam "boarded: image -> ${SHA:0:12} (ci-local retarget)"
    git -C "$HL" push -q origin HEAD:main
    echo "retarget   ok  homelab main -> ${SHA:0:12}"
  fi
fi
echo "ci-local: green ($((SECONDS - T0))s)"
