#!/usr/bin/env node
/**
 * Rulebook capture driver (homelab #1764). DEV ONLY.
 *
 *   pnpm --filter @boarded/engine build && pnpm --filter @boarded/server build
 *   NODE_PATH=<a node_modules holding playwright> node tools/captures/capture.cjs \
 *       tools/captures/scenarios/<file>.json <out-dir>
 *
 * Starts the server (server/dist, DEV_AUTH=1, BOARDED_SCENARIO=<file>) and the Vite client,
 * logs the scenario's 4 pirates in 4 browser contexts (dev auth, one session each), the
 * first seat creates the room, the others join by code, all click « Je suis prêt », then
 * the `steps` run in order. Everything started is stopped at the end.
 *
 * Every context is a phone (390x844, deviceScaleFactor 2). A `shot` writes
 * <out>/<name>-phone.png, then switches that page to 1440x900 and writes
 * <out>/<name>-desktop.png at one pixel per CSS pixel, then back to the phone.
 * CAPTURE_VIEW=phone|desktop instead runs the whole scenario at that one size (shots of
 * timed animations stay faithful): run the scenario once per view. Recordings are made
 * in the phone view only.
 *
 * Steps (`as` = the pirate whose page acts or is captured):
 *   {"start": true}                         host clicks « Lancer la partie »
 *   {"shot": "03-s6-revelation", "as": "Anne", "only": "phone"|"desktop",
 *    "scroll": "<css selector to bring into view>", "delay": 800, "toasts": true}
 *        The log toasts (.annonces, bottom right) are hidden for the still (capture-only
 *        CSS) unless "toasts": true, for stills whose subject is the announcement.
 *   {"pick": "<card id>", "as": "Anne"}     click a revealed event (waits for the turn)
 *   {"hover": "<card id>", "as": "Anne"}
 *   {"choose": "Bruno", "as": "Anne"}       click the prompt button holding this text
 *   {"nth": 0, "as": "Anne"}                click the n-th prompt choice button
 *   {"combat": "skip"|"close", "as": "Anne"} skip the combat animation / close the box
 *   {"waitFor": "<css selector>", "as": "Anne"}
 *   {"curse": "<card id>", "play": true|false, "as": "Anne"}  open the curse in the
 *        window prompt, then Jouer (play) or Ignorer
 *   {"recruits": ["<card id>", ...], "as": "Anne"}  tick recruits in the prompt, Valider
 *   {"button": "Fermer", "as": "Anne"}     click a button by its accessible name
 *   {"wait": 1000}
 *   {"record": "start", "as": "Anne"} … {"record": "stop", "as": "Anne", "name": "03-s6-distribution-phone"}
 *        CDP screencast of that page (phone) → <name>.webm + <name>.gif (≤390 px, 12 fps).
 *        With "desktop": true on both steps, a CAPTURE_VIEW=desktop run records too:
 *        the name's -phone suffix becomes -desktop, GIF 960 px wide.
 * Before any click on a page, an open combat box there is closed (other seats' boxes
 * would otherwise intercept the click).
 * The scenario keys seed/seats/master/eventsTop/treasuresTop/players feed the server
 * (server/src/rooms/scenario.ts); `steps` is read here only.
 */
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const [scenarioArg, outArg] = process.argv.slice(2);
if (!scenarioArg || !outArg) {
  console.error('usage: capture.cjs <scenario.json> <out-dir>');
  process.exit(2);
}
const scenarioFile = path.resolve(scenarioArg);
const OUT = path.resolve(outArg);
fs.mkdirSync(OUT, { recursive: true });
const sc = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
const CLIENT = 'http://localhost:5173';
/** Server/vite logs and screencast frames (CAPTURE_TMP, default the OS temp dir). */
const TMP = process.env.CAPTURE_TMP || os.tmpdir();
fs.mkdirSync(TMP, { recursive: true });
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const VIEW = process.env.CAPTURE_VIEW || '';

const procs = [];
function start(cmd, args, env, cwd) {
  const p = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  const log = fs.createWriteStream(path.join(TMP, `capture-${path.basename(cmd)}-${p.pid}.log`));
  p.stdout.pipe(log);
  p.stderr.pipe(log);
  procs.push(p);
  return p;
}
function stopAll() {
  for (const p of procs) {
    try {
      process.kill(-p.pid, 'SIGTERM');
    } catch {}
  }
}
process.on('exit', stopAll);
process.on('SIGINT', () => process.exit(130));

async function waitHttp(url, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`timeout waiting for ${url}`);
}

function chromiumPath() {
  const base = path.join(os.homedir(), '.cache/ms-playwright');
  try {
    chromium.executablePath();
    if (fs.existsSync(chromium.executablePath())) return undefined;
  } catch {}
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort() : [];
  for (const d of dirs.reverse()) {
    const exe = path.join(base, d, 'chrome-linux64/chrome');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

async function closeCombat(page) {
  for (let i = 0; i < 3; i++) {
    const box = page.locator('.panneau-combat');
    if ((await box.count()) === 0) return;
    const btn = box.getByRole('button', { name: 'Continuer' });
    if (await btn.count()) await btn.click();
    else await page.locator('.voile').first().click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(150);
  }
}

const HIDE_TOASTS = '.annonces { visibility: hidden !important; }';
async function shot(page, name, step) {
  if (step.delay) await page.waitForTimeout(step.delay);
  const hide = step.toasts ? null : await page.addStyleTag({ content: HIDE_TOASTS });
  try {
    await shotInner(page, name, step);
  } finally {
    if (hide) await hide.evaluate((el) => el.remove());
  }
}
async function shotInner(page, name, step) {
  if (VIEW) {
    if (step.scroll) await page.locator(step.scroll).first().scrollIntoViewIfNeeded();
    else await page.evaluate(() => window.scrollTo(0, 0));
    if (!step.only || step.only === VIEW) {
      await page.screenshot({ path: path.join(OUT, `${name}-${VIEW}.png`) });
      console.log('shot', name, VIEW);
    }
    return;
  }
  if (step.scroll) await page.locator(step.scroll).first().scrollIntoViewIfNeeded();
  else await page.evaluate(() => window.scrollTo(0, 0));
  if (step.only !== 'desktop') await page.screenshot({ path: path.join(OUT, `${name}-phone.png`) });
  if (step.only !== 'phone') {
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(400);
    if (step.scroll) await page.locator(step.scroll).first().scrollIntoViewIfNeeded();
    else await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(OUT, `${name}-desktop.png`), scale: 'css' });
    await page.setViewportSize(PHONE);
    await page.waitForTimeout(200);
  }
  console.log('shot', name);
}

const recordings = new Map();
async function recordStart(ctx, page, who, desktop) {
  const dir = fs.mkdtempSync(path.join(TMP, 'capture-rec-'));
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId });
    } catch {}
  });
  await cdp.send(
    'Page.startScreencast',
    desktop
      ? { format: 'jpeg', quality: 90, maxWidth: 1440, maxHeight: 900 }
      : { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688 },
  );
  recordings.set(who, { cdp, frames, dir, t0: Date.now() / 1000, desktop });
}
async function recordStop(who, name) {
  const r = recordings.get(who);
  recordings.delete(who);
  await new Promise((res) => setTimeout(res, 300));
  await r.cdp.send('Page.stopScreencast');
  const end = Date.now() / 1000;
  if (r.frames.length === 0) throw new Error('no frames recorded');
  const lines = [];
  r.frames.forEach((f, i) => {
    const next = i + 1 < r.frames.length ? r.frames[i + 1].t : end;
    lines.push(`file '${f.file}'`, `duration ${Math.max(0.01, next - f.t).toFixed(3)}`);
  });
  lines.push(`file '${r.frames[r.frames.length - 1].file}'`);
  const list = path.join(r.dir, 'list.txt');
  fs.writeFileSync(list, lines.join('\n') + '\n');
  const webm = path.join(OUT, `${name}.webm`);
  const gif = path.join(OUT, `${name}.gif`);
  const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
  const [vw, gw] = r.desktop ? [1440, 960] : [780, 390];
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-vf', `fps=25,scale=${vw}:-2`, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', webm]);
  ff([
    '-i', webm,
    '-vf', `fps=12,scale=${gw}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    gif,
  ]);
  fs.rmSync(r.dir, { recursive: true, force: true });
  console.log('recorded', name, `${r.frames.length} frames`, `${(fs.statSync(gif).size / 1e6).toFixed(1)} MB gif`);
}

(async () => {
  start('node', ['server/dist/index.js'], {
    SESSION_JWT_SECRET: 'dev',
    DEV_AUTH: '1',
    PORT: '2567',
    BOARDED_SCENARIO: scenarioFile,
  }, ROOT);
  // A production build served by `vite preview` (same proxy as dev): the dev server's
  // StrictMode double-mount races the room adoption and can leave a page on « Connexion… ».
  const vite = path.join(ROOT, 'client/node_modules/.bin/vite');
  const env = { ...process.env, VITE_SERVER_WS: 'ws://localhost:2567', VITE_DEV_AUTH: '1' };
  if (!process.env.CAPTURE_NO_BUILD) execFileSync(vite, ['build', '--logLevel', 'error'], { cwd: path.join(ROOT, 'client'), env, stdio: 'inherit' });
  start(vite, ['preview', '--port', '5173', '--strictPort'], env, path.join(ROOT, 'client'));
  await waitHttp('http://localhost:2567/healthz');
  await waitHttp(CLIENT);

  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const pages = {};
  const ctxs = {};
  try {
    for (const name of sc.seats) {
      const ctx = await browser.newContext(
        VIEW === 'desktop'
          ? { viewport: DESKTOP, deviceScaleFactor: 1, locale: 'fr-FR' }
          : { viewport: PHONE, deviceScaleFactor: 2, locale: 'fr-FR' },
      );
      const page = await ctx.newPage();
      page.setDefaultTimeout(20000);
      page.on('console', (m) => process.env.CAPTURE_DEBUG && console.log(`[${name}] ${m.type()}: ${m.text()}`));
      page.on('pageerror', (e) => console.log(`[${name}] pageerror: ${e.message}`));
      await page.goto(CLIENT);
      await page.getByPlaceholder('Votre nom de pirate').fill(name);
      await page.getByRole('button', { name: 'Jouer' }).click();
      ctxs[name] = ctx;
      pages[name] = page;
    }
    const host = pages[sc.seats[0]];
    await host.getByRole('button', { name: 'Créer une salle' }).click();
    const code = (await host.locator('.lobby-code').innerText()).trim();
    if (process.env.CAPTURE_DEBUG) {
      console.log('room', code, host.url());
      await host.waitForTimeout(3000);
      await host.screenshot({ path: path.join(OUT, '_debug-host.png') });
      console.log('after 3s', host.url());
    }
    for (const name of sc.seats.slice(1)) {
      const p = pages[name];
      await p.getByLabel('CODE').fill(code);
      await p.getByRole('button', { name: 'Rejoindre' }).click();
      await p.locator('.lobby-code').waitFor();
    }
    for (const name of sc.seats) await pages[name].getByRole('button', { name: 'Je suis prêt' }).click();
    await host.getByRole('button', { name: 'Lancer la partie' }).and(host.locator(':enabled')).waitFor();

    for (const step of sc.steps ?? []) {
      const page = step.as ? pages[step.as] : host;
      if (step.wait) await page.waitForTimeout(step.wait);
      if (step.start) {
        await host.getByRole('button', { name: 'Lancer la partie' }).click();
        await host.locator('.jeu').waitFor();
      } else if (step.shot) {
        await shot(page, step.shot, step);
      } else if (step.pick || step.hover) {
        const btn = page.locator(`.carte-revelee[data-card-id="${step.pick ?? step.hover}"]`);
        if (step.pick) await closeCombat(page);
        await btn.and(page.locator(':enabled')).waitFor();
        if (step.pick) await btn.click();
        else await btn.hover();
      } else if (step.choose !== undefined || step.nth !== undefined) {
        await closeCombat(page);
        const btns = page.locator('.prompt .choix button');
        const btn = step.choose !== undefined ? btns.filter({ hasText: step.choose }).first() : btns.nth(step.nth);
        await btn.and(page.locator(':enabled')).waitFor();
        await btn.click();
      } else if (step.combat) {
        const box = page.locator('.panneau-combat');
        await box.waitFor();
        if (step.combat === 'skip') await page.locator('.voile').first().click({ position: { x: 5, y: 5 } });
        else await closeCombat(page);
      } else if (step.waitFor) {
        await page.locator(step.waitFor).first().waitFor();
      } else if (step.curse) {
        await closeCombat(page);
        const card = page.locator(`.prompt .choix-cartes button[data-card-id="${step.curse}"]`);
        await card.and(page.locator(':enabled')).waitFor();
        await card.click();
        const btn = page.locator('.zoom-carte').getByRole('button', { name: step.play ? 'Jouer' : 'Ignorer' });
        await btn.and(page.locator(':enabled')).waitFor();
        await btn.click();
      } else if (step.recruits) {
        await closeCombat(page);
        for (const id of step.recruits) {
          const card = page.locator(`.prompt .choix-cartes button[data-card-id="${id}"]`);
          await card.and(page.locator(':enabled')).waitFor();
          await card.click();
        }
        const ok = page.locator('.prompt').getByRole('button', { name: 'Valider' });
        await ok.and(page.locator(':enabled')).waitFor();
        await ok.click();
      } else if (step.button) {
        const btn = page.getByRole('button', { name: step.button, exact: true }).first();
        await btn.and(page.locator(':enabled')).waitFor();
        await btn.click();
      } else if (step.record && VIEW === 'desktop' && !step.desktop) {
        // recordings: phone view only, unless the step asks for desktop too
      } else if (step.record === 'start') {
        await recordStart(ctxs[step.as], page, step.as, VIEW === 'desktop');
      } else if (step.record === 'stop') {
        const base = step.name.replace(/-(phone|desktop)$/, '');
        await recordStop(step.as, `${base}-${VIEW === 'desktop' ? 'desktop' : 'phone'}`);
      }
    }
  } catch (e) {
    for (const [n, p] of Object.entries(pages)) {
      await p.screenshot({ path: path.join(OUT, `_error-${n}.png`) }).catch(() => {});
    }
    throw e;
  } finally {
    await browser.close();
    stopAll();
  }
})().catch((e) => {
  console.error(e);
  stopAll();
  process.exit(1);
});
