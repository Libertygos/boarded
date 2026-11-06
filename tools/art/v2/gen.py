#!/usr/bin/env python3
"""Run the art v2 prompts on the image station, resumable. gen.py <prompts.json> <outdir> <seeds_per_version> [family...]"""
import json, subprocess, sys, os, glob, time
HL = os.path.expanduser('~/git-projects/homelab-day-1106')
pj, out, n = sys.argv[1], os.path.abspath(sys.argv[2]), int(sys.argv[3])
fams = set(sys.argv[4:])
A = json.load(open(pj))
if fams: A = [a for a in A if a['family'] in fams]
# breadth first: every asset's first seed before any second seed
jobs = [(i, a) for i in range(n) for a in A]
for i, a in jobs:
    seed = 1000 + sum(ord(c) for c in a['id']) % 5000 + i * 7919 + int(os.environ.get('SEED_OFFSET', 0))
    d = f"{out}/{a['id']}/s{seed}"
    if glob.glob(d + '/*.png'): continue
    os.makedirs(d, exist_ok=True)
    wf = a.get('workflow', 'flux2-klein-base-4b')
    t = time.time()
    for attempt in range(3):
        r = subprocess.run([f'{HL}/scripts/imagegen', 'run', '--workflow', wf, '--lora', 'abordink-klein4b-s2000.safetensors:1.0',
                            '--prompt', a['prompt'], '--seed', str(seed), '--width', str(a['width']), '--height', str(a['height']), '--out', d],
                           cwd=HL, capture_output=True, text=True)
        if r.returncode == 0 and glob.glob(d + '/*.png'): break
        print('RETRY', a['id'], seed, r.returncode, r.stderr[-200:], flush=True); time.sleep(30)
    else:
        print('FAILED', a['id'], seed, flush=True); continue
    print('ok', a['id'], seed, round(time.time() - t), flush=True)
print('ALLDONE', flush=True)
