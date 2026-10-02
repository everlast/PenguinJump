"""隕石の炎2フレームとGB Studio用ネイティブメタデータを生成する。"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, uuid
root=Path(__file__).resolve().parents[1]
out=root/'art-source/meteor';out.mkdir(exist_ok=True)
T,D,S,W=[tuple(bytes.fromhex(c)) for c in ('65ff00','071821','86c06c','e0f8cf')]
frames=[]
for f in range(2):
 im=Image.new('RGB',(16,32),T);d=ImageDraw.Draw(im)
 # The tail points upper right, opposite the down-left trajectory.
 d.polygon([(5,22),(8,13),(12,9-f*3),(11,15),(15,3+f*3),(15,21),(12,28)],fill=S)
 d.polygon([(7,24),(10,17),(11,20),(14,12+f*2),(13,27)],fill=W)
 d.ellipse((1,16,14,29),fill=D)
 d.ellipse((2,17,13,27),fill=S)
 d.ellipse((3,18,10,24),fill=W)
 d.line((3,25,6,27),fill=D);d.point((11,23),fill=D)
 frames.append(im)
uid=lambda s:str(uuid.uuid5(uuid.NAMESPACE_URL,'penguin-jump/meteor/'+s))
sheet=Image.new('RGB',(32,32),T);native=[];patterns=set()
for f,im in enumerate(frames):
 sheet.paste(im,(f*16,0));tiles=[]
 for y in (0,16):
  for x in (0,8):
   crop=im.crop((x,y,x+8,y+16))
   if all(p==T for p in crop.getdata()):continue
   patterns.add(crop.tobytes())
   tiles.append({'id':uid(f'tile/{f}/{x}/{y}'),'x':x,'y':16-y,'sliceX':f*16+x,'sliceY':y,'flipX':False,'flipY':False,'palette':0,'paletteIndex':6,'objPalette':'OBP0','priority':False})
 native.append({'id':uid(f'frame/{f}'),'tiles':tiles})
png=out/'meteor.png';sheet.save(png)
animations=[{'id':uid(f'animation/{i}'),'frames':native if i==0 else [{'id':uid(f'empty/{i}'),'tiles':[]}]} for i in range(8)]
meta={'_resourceType':'sprite','id':uid('sprite'),'name':'隕石','symbol':'sprite_meteor','filename':png.name,'width':32,'height':32,'checksum':hashlib.sha1(png.read_bytes()).hexdigest(),'numTiles':len(patterns),'canvasOriginX':0,'canvasOriginY':0,'canvasWidth':16,'canvasHeight':32,'boundsX':2,'boundsY':4,'boundsWidth':12,'boundsHeight':13,'animSpeed':255,'states':[{'id':uid('state'),'name':'','animationType':'fixed','flipLeft':False,'animations':animations}]}
sidecar=out/'meteor.png.gbsres';sidecar.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sourcePath':str(png.relative_to(root)),'sourceSha256':hashlib.sha256(png.read_bytes()).hexdigest(),'metadataPath':str(sidecar.relative_to(root)),'metadataSha256':hashlib.sha256(sidecar.read_bytes()).hexdigest()}))
