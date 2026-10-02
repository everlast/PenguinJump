"""Native 24-pixel polar bear: two walk poses, both directions, squash pose."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, uuid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art-source/bear'
OUT.mkdir(exist_ok=True)
INK = '#071821'; SHADE = '#86c06c'; WHITE = '#e0f8cf'; TRANS = '#65ff00'
def uid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'penguin-jump/polar-bear/' + name))

def walk(pose):
    im = Image.new('RGB', (24, 32), TRANS)
    d = ImageDraw.Draw(im)
    # Round tail, arched back, long body, and rounded ears distinguish a bear.
    d.rectangle((0, 18, 4, 22), fill=INK)
    d.rectangle((1, 19, 3, 21), fill=WHITE)
    d.polygon([(3,17),(6,14),(15,14),(19,18),(20,26),(16,28),(5,28),(2,24)], fill=INK)
    d.polygon([(4,18),(7,15),(15,15),(18,18),(19,25),(15,27),(5,27),(3,23)], fill=WHITE)
    d.rectangle((6,25,16,27), fill=SHADE)
    # Four paws alternate without changing the body silhouette.
    legs = [(5,9),(15,19)] if pose == 0 else [(3,7),(17,21)]
    for x0,x1 in legs:
        d.rectangle((x0,26,x1,31), fill=INK)
        d.rectangle((x0+1,26,x1-1,29), fill=WHITE)
        d.line((x0+1,30,x1-1,30), fill=SHADE)
    d.rectangle((12,8,16,13), fill=INK)
    d.rectangle((13,9,15,12), fill=WHITE)
    d.point((14,10), fill=SHADE)
    d.polygon([(16,11),(20,11),(22,13),(22,16),(23,16),(23,21),(20,23),(14,22),(12,18),(13,13)], fill=INK)
    d.polygon([(16,12),(20,12),(21,14),(21,17),(22,17),(22,20),(20,22),(15,21),(13,18),(14,14)], fill=WHITE)
    d.line((15,21,20,21), fill=SHADE)
    d.point((19,15), fill=INK)
    d.rectangle((22,17,23,18), fill=INK)
    d.line((20,20,22,20), fill=INK)
    return im

frames = [walk(0), walk(1)]
frames += [im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for im in frames]
flat = Image.new('RGB',(24,32),TRANS); d = ImageDraw.Draw(flat)
d.rounded_rectangle((2,24,22,31), radius=3, fill=INK)
d.rounded_rectangle((3,25,21,30), radius=2, fill=WHITE)
d.line((6,29,17,29), fill=SHADE)
for x in (8,16):
    d.line((x-1,26,x+1,28), fill=INK); d.line((x-1,28,x+1,26), fill=INK)
frames.append(flat)
sheet = Image.new('RGB',(120,32),TRANS)
for i,im in enumerate(frames):
    im.save(OUT/f'pose-{i}.png'); sheet.paste(im,(i*24,0))
source = OUT/'polar_bear.png'; sheet.save(source)

native_frames=[]
for i in range(5):
    tiles=[]
    for y in ([0] if i==4 else [0,16]):
        for x in (0,8,16):
            tiles.append({'id':uid(f'{i}/{x}/{y}'),'x':x,'y':y,'sliceX':i*24+x,'sliceY':16-y,
                          'flipX':False,'flipY':False,'palette':0,'paletteIndex':4,'objPalette':'OBP0','priority':False})
    native_frames.append({'id':uid(f'frame/{i}'),'tiles':tiles})
animations=[{'id':uid(f'animation/{i}'),'frames':native_frames if i==0 else [{'id':uid(f'empty/{i}'),'tiles':[]}]} for i in range(8)]
metadata={'_resourceType':'sprite','id':uid('sprite'),'name':'しろくま','symbol':'sprite_polar_bear',
          'states':[{'id':uid('state'),'name':'','animationType':'fixed','flipLeft':False,'animations':animations}],
          'numTiles':21,'canvasOriginX':0,'canvasOriginY':0,'canvasWidth':24,'canvasHeight':32,
          'boundsX':2,'boundsY':-12,'boundsWidth':20,'boundsHeight':20,'animSpeed':255,
          'filename':'polar_bear.png','width':120,'height':32,'checksum':hashlib.sha1(source.read_bytes()).hexdigest()}
sidecar=OUT/'polar_bear.png.gbsres';sidecar.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
(OUT/'animation.json').write_text(json.dumps({'size':[24,32],'frames':['right-0','right-1','left-0','left-1','squash'],'walkFrameUpdates':8,'squashUpdates':18,'sourcePalette':[INK,SHADE,WHITE,TRANS]},indent=2)+'\n')
print(json.dumps({'id':metadata['id'],'sourcePath':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'metadataPath':str(sidecar),'metadataSha256':hashlib.sha256(sidecar.read_bytes()).hexdigest()}))
