#!/usr/bin/env python3
"""Inventory and manifest of the art v2 round (#1757): which seed and prompt made every version."""
import json,glob,csv,os
from cards import CARDS,EXTRA
P={p['id']:p for p in json.load(open('prompts.json'))}
C=json.load(open('choice.json'))
rows=[]
for vid,p in sorted(P.items()):
    c=C.get(vid,{}); seed=c.get('seed')
    fs=sorted(glob.glob(f'gen/{vid}/*/*.png'))
    if c.get('file'): f=c['file']
    else:
        m=[x for x in fs if seed and f'/s{seed}/' in x] or fs; f=m[0] if m else ''
    used_seed=f.split('/')[2][1:] if f else ''
    sc=f[:-4]+'.json'; pr=json.load(open(sc))['prompt'] if os.path.exists(sc) else p['prompt']
    rows.append(dict(id=vid,family=p['family'],asset=p.get('asset',''),version=p.get('version',''),seed=used_seed,workflow=p.get('workflow','flux2-klein-base-4b'),lora='abordink-klein4b-s2000.safetensors:1.0',width=p['width'],height=p['height'],source_file=f,subject=p.get('subject',''),prompt=pr))
w=csv.DictWriter(open('manifest.csv','w',newline=''),fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
fam={}
for r in rows: fam[r['family']]=fam.get(r['family'],0)+1
print(len(rows),fam,sum(1 for r in rows if not r['seed']))
