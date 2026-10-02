"""Native black bear and four rotating hammer frames, derived from local art."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, uuid

root = Path(__file__).resolve().parents[1]
out = root / 'art-source/black-bear'
out.mkdir(exist_ok=True)
T, D, S, W = [tuple(bytes.fromhex(c)) for c in ('65ff00','071821','86c06c','e0f8cf')]
source = Image.open(root/'assets/sprites/polar_bear.png').convert('RGB')
frames=[]
for f in range(7):
    im=source.crop((f*24,0,f*24+24,32))
    im.putdata([S if c==W else D if c==S else c for c in im.getdata()])
    d=ImageDraw.Draw(im)
    if f!=4:
        right=f<2
        def point(x,y,color):d.point((x if right else 23-x,y),fill=color)
        for y in range(18,20):
            for x in range(20,23):point(x,y,W)
        point(18,15,W);point(19,15,D)
        for x,y in ((14,23),(15,24),(16,24),(17,23)):point(x,y,W)
    frames.append(im)
# A raised steel hammer makes the wind-up distinct from the polar bear's snowball.
frames[5]=frames[2].copy();d=ImageDraw.Draw(frames[5])
d.rectangle((8,10,10,21),fill=D);d.line((9,10,9,20),fill=W)
d.rectangle((4,5,14,11),fill=D);d.rectangle((5,6,13,9),fill=W)
d.line((5,10,13,10),fill=S)

hammer=Image.new('RGB',(16,16),T);d=ImageDraw.Draw(hammer)
d.rectangle((7,4,9,13),fill=D);d.line((8,5,8,12),fill=S)
d.rectangle((3,2,12,6),fill=D);d.rectangle((4,3,11,4),fill=W)
d.line((4,5,11,5),fill=S)
hammers=[hammer]+[hammer.transpose(t) for t in (Image.Transpose.ROTATE_90,Image.Transpose.ROTATE_180,Image.Transpose.ROTATE_270)]

def save(name,frames,palette):
    w,h=frames[0].size
    uid=lambda s:str(uuid.uuid5(uuid.NAMESPACE_URL,f'penguin-jump/{name}/{s}'))
    sheet=Image.new('RGB',(w*len(frames),h),T);native=[];patterns=set()
    for f,im in enumerate(frames):
        sheet.paste(im,(f*w,0));tiles=[]
        for y in range(0,h,16):
            for x in range(0,w,8):
                crop=im.crop((x,y,x+8,y+16))
                if all(p==T for p in crop.getdata()):continue
                patterns.add(crop.tobytes())
                tiles.append({'id':uid(f'tile/{f}/{x}/{y}'),'x':x-(w-16)//2,'y':h-16-y,'sliceX':f*w+x,'sliceY':y,'flipX':False,'flipY':False,'palette':0,'paletteIndex':palette,'objPalette':'OBP0','priority':False})
        native.append({'id':uid(f'frame/{f}'),'tiles':tiles})
    png=out/f'{name}.png';sheet.save(png)
    animations=[{'id':uid(f'animation/{i}'),'frames':native if i==0 else [{'id':uid(f'empty/{i}'),'tiles':[]}]} for i in range(8)]
    meta={'_resourceType':'sprite','id':uid('sprite'),'name':name,'symbol':f'sprite_{name}','filename':png.name,'width':sheet.width,'height':h,'checksum':hashlib.sha1(png.read_bytes()).hexdigest(),'numTiles':len(patterns),'canvasOriginX':-(w-16)//2,'canvasOriginY':0,'canvasWidth':w,'canvasHeight':h,'boundsX':2,'boundsY':-h+20,'boundsWidth':w-4,'boundsHeight':h-4,'animSpeed':255,'states':[{'id':uid('state'),'name':'','animationType':'fixed','flipLeft':False,'animations':animations}]}
    sidecar=out/f'{name}.png.gbsres';sidecar.write_text(json.dumps(meta,indent=2)+'\n')
    return {'name':name,'sourcePath':str(png.relative_to(root)),'sourceSha256':hashlib.sha256(png.read_bytes()).hexdigest(),'metadataPath':str(sidecar.relative_to(root)),'metadataSha256':hashlib.sha256(sidecar.read_bytes()).hexdigest()}
print(json.dumps([save('black_bear',frames,5),save('hammer',hammers,4)]))
