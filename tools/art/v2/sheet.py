import glob,sys,json
from PIL import Image,ImageDraw
pat,out=sys.argv[1],sys.argv[2];c=int(sys.argv[3]) if len(sys.argv)>3 else 6
fs=sorted(glob.glob(f'gen/{pat}/*/*.png'))
W,H=260,364
s=Image.new('RGB',(c*W,((len(fs)+c-1)//c)*(H+16)),'#222');d=ImageDraw.Draw(s)
for i,f in enumerate(fs):
    x,y=(i%c)*W,(i//c)*(H+16);im=Image.open(f).convert('RGB');im.thumbnail((W-4,H));s.paste(im,(x,y+16));d.text((x+3,y+2),f.split('/')[1]+' '+f.split('/')[2],fill='white')
s.save(out);print(len(fs))
