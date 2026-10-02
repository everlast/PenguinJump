"""Native 16x32 icicle cells and a compact ground warning marker."""
from pathlib import Path
from PIL import Image
import hashlib, json, uuid

root = Path(__file__).resolve().parents[1]
out = root / 'art-source/icicle'
out.mkdir(exist_ok=True)
colors = {'.': '#65ff00', 'D': '#071821', 'W': '#e0f8cf', 'S': '#86c06c'}

def make(name, canvash, frames, palette):
    uid = lambda label: str(uuid.uuid5(uuid.NAMESPACE_URL, f'penguin-jump/{name}/{label}'))
    im = Image.new('RGB', (16*len(frames),canvash), colors['.'])
    native = []
    for f,rows in enumerate(frames):
        for y,row in enumerate(rows):
            for x,c in enumerate(row): im.putpixel((16*f+x,y),tuple(bytes.fromhex(colors[c][1:])))
        tiles=[]
        for y in range(0,canvash,16):
            for x in ([4] if name == 'icicle' and f >= 2 else range(0,16,8)):
                if not any(c!='.' for row in rows[y:y+16] for c in row[x:x+8]): continue
                tiles.append({'id':uid(f'tile/{f}/{x}/{y}'),'x':x,'y':canvash-16-y,'sliceX':16*f+x,'sliceY':y,'flipX':False,'flipY':False,'palette':0,'paletteIndex':palette,'objPalette':'OBP0','priority':False})
        native.append({'id':uid(f'frame/{f}'),'tiles':tiles})
    png=out/f'{name}.png';im.save(png)
    animations=[{'id':uid(f'anim/{i}'),'frames':native if i==0 else [{'id':uid(f'empty/{i}'),'tiles':[]}]} for i in range(8)]
    meta={'_resourceType':'sprite','id':uid('sprite'),'name':name,'symbol':f'sprite_{name}','states':[{'id':uid('state'),'name':'','animationType':'fixed','flipLeft':False,'animations':animations}], 'numTiles':sum(len(f['tiles']) for f in native),'canvasOriginX':0,'canvasOriginY':0,'canvasWidth':16,'canvasHeight':canvash,'boundsX':3,'boundsY':-canvash+10,'boundsWidth':10,'boundsHeight':canvash-4,'animSpeed':255,'checksum':hashlib.sha1(png.read_bytes()).hexdigest(),'filename':png.name,'width':im.width,'height':im.height}
    sidecar=out/f'{name}.png.gbsres';sidecar.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    return {'name':name,'sourcePath':str(png.relative_to(root)),'sourceSha256':hashlib.sha256(png.read_bytes()).hexdigest(),'metadataPath':str(sidecar.relative_to(root)),'metadataSha256':hashlib.sha256(sidecar.read_bytes()).hexdigest()}

ice=[]
for y in range(32):
    half=max(1,7-y//5)
    row=['.']*16
    for x in range(8-half,8+half): row[x]='D' if x in (8-half,7+half) or y==0 else 'S' if x>=9 else 'W'
    ice.append(''.join(row))
shatter=['.'*16 for _ in range(32)]
for y,row in {22:'...DW.......DS..',23:'..DWWD.....DSS..',24:'...DD.......D...',27:'......DW........',28:'.....DWWD...DW..',29:'......DD....DD..'}.items():shatter[y]=row
storm=[]
for y in range(32):
    half=max(1,4-y//9)
    cells=['.']*16
    for x in range(8-half,8+half):
        cells[x]='D' if x in (8-half,7+half) or y==0 else 'S' if x>=9 else 'W'
    storm.append(''.join(cells))
storm_shatter=['.'*16 for _ in range(32)]
for y,cells in {22:'DW....DS',23:'WWD..DSS',24:'DD....DD',27:'...DW...',28:'..DWWD..',29:'...DD...'}.items():
    storm_shatter[y]='....'+cells+'....'
warning=['................']*16
for y,row in enumerate(['..DDDD..','..DWWD..','..DWWD..','..DWWD..','..DWWD..','..DDDD..','........','..DWWD..','..DDDD..']):warning[y+3]=row+'........'
print(json.dumps([make('icicle',32,[ice,shatter,storm,storm_shatter],1),make('icicle_warning',16,[warning],0)]))

# Preserve the imported sprite and its existing frame IDs while adding storm art.
asset=root/'assets/sprites/icicle.png'
sidecar=asset.with_suffix('.png.gbsres')
if sidecar.exists():
    original=json.loads(sidecar.read_text())
    generated=json.loads((out/'icicle.png.gbsres').read_text())
    assert Image.open(asset).crop((0,0,32,32)).tobytes()==Image.open(out/'icicle.png').crop((0,0,32,32)).tobytes()
    for key in ('width','height','checksum','numTiles'):original[key]=generated[key]
    frames=original['states'][0]['animations'][0]['frames']
    original['states'][0]['animations'][0]['frames']=frames[:2]+generated['states'][0]['animations'][0]['frames'][2:]
    sidecar.write_text(json.dumps(original,ensure_ascii=False,indent=2)+'\n')
    asset.write_bytes((out/'icicle.png').read_bytes())
