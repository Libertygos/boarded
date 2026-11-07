#!/usr/bin/env python3
"""x4 every r3 source listed in opts3 (and any path given), saved 2048 wide into r4/gen_hi. Resumable."""
import glob, os, subprocess, sys, tempfile
sys.path.insert(0, 'r4')
from PIL import Image
from opts4 import OPTS, BACK_PARTS
HL = os.path.expanduser('~/git-projects/homelab')
src = {glob.glob(f'r4/gen/{n}/s{s}/*.png')[0] for o in OPTS.values() for n, s, _ in o} | {glob.glob(f'r4/gen/{n}/s{s}/*.png')[0] for n, s in BACK_PARTS}
print(len(src), flush=True)
for p in sorted(src):
    q = p.replace('r4/gen/', 'r4/gen_hi/', 1)
    if os.path.exists(q): continue
    os.makedirs(os.path.dirname(q), exist_ok=True)
    with tempfile.TemporaryDirectory(dir='r4') as t:
        for a in range(3):
            r = subprocess.run([f'{HL}/scripts/imagegen', 'run', '--workflow', 'upscale-x4', '--image', os.path.abspath(p), '--prompt', '-', '--out', os.path.abspath(t)], cwd=HL, capture_output=True, text=True)
            f = glob.glob(t + '/*.png')
            if f: break
            print('retry', p, r.stderr[-120:], flush=True)
        if not f: print('FAILED', p, flush=True); continue
        im = Image.open(f[0]).convert('RGB')
        im.resize((2048, 2048 * im.height // im.width), Image.LANCZOS).save(q)
    print('ok', q, flush=True)
print('UPDONE', flush=True)
