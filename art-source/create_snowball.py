"""Exact native snowball cells: one 8x16 OAM object with an 8x8 visible ball."""
from pathlib import Path
from PIL import Image
import hashlib, json, uuid

root = Path(__file__).resolve().parents[1]
out = root / 'art-source/snowball'
out.mkdir(exist_ok=True)
colors = {'.': '#65ff00', 'D': '#071821', 'W': '#e0f8cf', 'S': '#86c06c'}
rows = ['..DDDD..', '.DWWWWD.', 'DWWWWWWD', 'DWWWWWWD', 'DWWWWSSD', 'DWWWSSSD', '.DSSSSD.', '..DDDD..']
im = Image.new('RGB', (16,16), colors['.'])
for y, row in enumerate(rows):
    for x, c in enumerate(row):
        im.putpixel((x, y+4), tuple(bytes.fromhex(colors[c][1:])))
png = out / 'snowball.png'; im.save(png)
uid = lambda label: str(uuid.uuid5(uuid.NAMESPACE_URL, 'penguin-jump/snowball/' + label))
tile = {'id':uid('tile'), 'x':0, 'y':0, 'sliceX':0, 'sliceY':0, 'flipX':False, 'flipY':False, 'palette':0, 'paletteIndex':4, 'objPalette':'OBP0', 'priority':False}
animations = [{'id':uid(f'anim/{i}'), 'frames':[{'id':uid(f'frame/{i}'), 'tiles':[tile] if i==0 else []}]} for i in range(8)]
meta = {'_resourceType':'sprite', 'id':uid('sprite'), 'name':'雪玉', 'symbol':'sprite_snowball', 'states':[{'id':uid('state'), 'name':'', 'animationType':'fixed', 'flipLeft':False, 'animations':animations}], 'numTiles':1, 'canvasOriginX':0, 'canvasOriginY':0, 'canvasWidth':16, 'canvasHeight':16, 'boundsX':1, 'boundsY':-3, 'boundsWidth':6, 'boundsHeight':7, 'animSpeed':255, 'checksum':hashlib.sha1(png.read_bytes()).hexdigest(), 'filename':'snowball.png', 'width':16, 'height':16}
sidecar = out / 'snowball.png.gbsres'; sidecar.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'id':meta['id'], 'sourcePath':str(png), 'sourceSha256':hashlib.sha256(png.read_bytes()).hexdigest(), 'metadataPath':str(sidecar), 'metadataSha256':hashlib.sha256(sidecar.read_bytes()).hexdigest()}))
