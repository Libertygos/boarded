#!/usr/bin/env python3
"""x4 (RealESRGAN) every source the round 2 deck uses, saved 2048 wide (the map 4096). Resumable."""
import glob, json, os, subprocess, sys, tempfile
sys.path.insert(0, '.'); sys.path.insert(0, 'r2')
import plates
from PIL import Image
from cards import CARDS
from opts import OPTS
sys.argv = ['x', '--lo']
import final
HL = os.path.expanduser('~/git-projects/homelab-day-1106')
src = set()
for c in CARDS:
    if c['family'] == 'abordage': continue
    if c['key'] in final.PICK: src.add(final.raw(f"{c['art']}_v{final.PICK[c['key']]}"))
src |= {final.raw('boardscene_a_v1'), final.raw('boardscene_d_v1'), final.raw('back_events_v2')}
for k, o in OPTS.items():
    for n, s, _ in o: src.add(glob.glob(f'r2/gen/{n}/s{s}/*.png')[0])
for n, s in (('tresor_a', 29782), ('tresor_b', 21864), ('tresor_b', 29783), ('tresor_c', 21865)): src.add(glob.glob(f'r2/gen/{n}/s{s}/*.png')[0])
for n in ('d_map_a', 'd_map_b'): src.add(glob.glob(f'r2/gen/{n}/s0/*.png')[0])
print(len(src), flush=True)
for p in sorted(src):
    q = p.replace('r2/gen/', 'r2/gen_hi/', 1) if p.startswith('r2/gen/') else p.replace('gen/', 'gen_hi/', 1)
    if os.path.exists(q): continue
    os.makedirs(os.path.dirname(q), exist_ok=True)
    with tempfile.TemporaryDirectory(dir='r2') as t:
        for a in range(3):
            r = subprocess.run([f'{HL}/scripts/imagegen', 'run', '--workflow', 'upscale-x4', '--image', os.path.abspath(p), '--prompt', '-', '--out', os.path.abspath(t)], cwd=HL, capture_output=True, text=True)
            f = glob.glob(t + '/*.png')
            if f: break
            print('retry', p, r.stderr[-120:], flush=True)
        if not f: print('FAILED', p, flush=True); continue
        im = Image.open(f[0]).convert('RGB')
        wd = 4096 if 'd_map' in p else 2048
        im.resize((wd, wd * im.height // im.width), Image.LANCZOS).save(q)
    print('ok', q, flush=True)
print('UPDONE', flush=True)
