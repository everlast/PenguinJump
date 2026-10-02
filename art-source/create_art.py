from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT=Path(__file__).resolve().parents[1]
GAME_VERSION='V19'
BG=ROOT/'assets/backgrounds'
SP=ROOT/'assets/sprites'
INK='#071821'; MID='#306850'; PALE='#86c06c'; WHITE='#e0f8cf'; TRANS='#65ff00'
FONT={
'A':['01110','10001','10001','11111','10001','10001','10001'],
'B':['11110','10001','10001','11110','10001','10001','11110'],
'C':['01111','10000','10000','10000','10000','10000','01111'],
'D':['11110','10001','10001','10001','10001','10001','11110'],
'E':['11111','10000','10000','11110','10000','10000','11111'],
'F':['11111','10000','10000','11110','10000','10000','10000'],
'G':['01111','10000','10000','10111','10001','10001','01111'],
'H':['10001','10001','10001','11111','10001','10001','10001'],
'I':['111','010','010','010','010','010','111'],
'J':['00111','00010','00010','00010','10010','10010','01100'],
'K':['10001','10010','10100','11000','10100','10010','10001'],
'L':['10000','10000','10000','10000','10000','10000','11111'],
'M':['10001','11011','10101','10101','10001','10001','10001'],
'N':['10001','11001','10101','10011','10001','10001','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],
'P':['11110','10001','10001','11110','10000','10000','10000'],
'Q':['01110','10001','10001','10001','10101','10010','01101'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],
'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['10001','10001','10001','10001','10001','10001','01110'],
'V':['10001','10001','10001','10001','10001','01010','00100'],
'W':['10001','10001','10001','10101','10101','10101','01010'],
'X':['10001','10001','01010','00100','01010','10001','10001'],
'Y':['10001','10001','01010','00100','00100','00100','00100'],
'Z':['11111','00001','00010','00100','01000','10000','11111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],
'1':['010','110','010','010','010','010','111'],
'2':['01110','10001','00001','00010','00100','01000','11111'],
'3':['11110','00001','00001','01110','00001','00001','11110'],
'4':['00010','00110','01010','10010','11111','00010','00010'],
'5':['11111','10000','10000','11110','00001','00001','11110'],
'6':['01110','10000','10000','11110','10001','10001','01110'],
'7':['11111','00001','00010','00100','01000','01000','01000'],
'8':['01110','10001','10001','01110','10001','10001','01110'],
'9':['01110','10001','10001','01111','00001','00001','01110'],
' ':['000']*7,'-':['00000','00000','00000','11111','00000','00000','00000'],
':':['0','1','0','0','1','0','0'],'/':['00001','00010','00010','00100','01000','01000','10000']}
def text(im,s,x,y,color=WHITE,scale=1):
 d=ImageDraw.Draw(im)
 for c in s:
  g=FONT[c]
  for j,row in enumerate(g):
   for i,v in enumerate(row):
    if v=='1':d.rectangle((x+i*scale,y+j*scale,x+(i+1)*scale-1,y+(j+1)*scale-1),fill=color)
  x+=(len(g[0])+1)*scale
def centered(im,s,y,color=WHITE,scale=1):
 w=sum((len(FONT[c][0])+1)*scale for c in s)-scale
 text(im,s,(im.width-w)//2,y,color,scale)

# Three opaque colors plus the hardware transparent key. Two deliberate running frames.
PENGUIN=[
'.....DDDDDD.....',
'....DDDDDDDD....',
'...DDDDDDWDDD...',
'...DDDDWWDWDD...',
'...DDDWWWWWDOOO.',
'...DDDWWWWWDOOO.',
'...DDDDWWWDDD...',
'..DDDDWWWWDDD...',
'.DDDDDWWWWWDD...',
'.DDDDDWWWWWDD...',
'..DDDDWWWWWDDD..',
'...DDDWWWWWDDD..',
'...DDDDWWWDDD...',
'....DDDDDDDD....',
'...OOOODDOOOO...',
'..OOOO...OOOOO..']
def penguin(frame=0):
 im=Image.new('RGB',(16,16),TRANS)
 for y,row in enumerate(PENGUIN):
  for x,c in enumerate(row):
   if c!='.':im.putpixel((x,y),ImageColor[c])
 if frame:
  d=ImageDraw.Draw(im);d.rectangle((0,14,15,15),fill=TRANS)
  d.rectangle((5,14,10,14),fill=INK);d.rectangle((6,15,13,15),fill=PALE)
 return im
ImageColor={'D':(7,24,33),'W':(224,248,207),'O':(134,192,108)}
sheet=Image.new('RGB',(96,16),TRANS)
for i in range(6):sheet.paste(penguin(i%2),(i*16,0))
sheet.save(SP/'penguin.png')

def stars(im,width):
 d=ImageDraw.Draw(im)
 # Repeat deliberately to conserve unique Game Boy tiles.
 for k in range(0,width,160):
  for x,y in [(12,20),(40,40),(88,24),(136,48),(104,60),(24,64)]:
   d.point((k+x,y),fill=PALE)
  d.line((k+118,14,k+122,14),fill=WHITE);d.line((k+120,12,k+120,16),fill=WHITE)
def landscape(width):
 im=Image.new('RGB',(width,144),INK);d=ImageDraw.Draw(im);stars(im,width)
 for k in range(-128,width,128):
  d.polygon([(k,104),(k+40,64),(k+72,96),(k+96,72),(k+144,112)],fill=MID)
  d.polygon([(k+24,80),(k+40,64),(k+56,80),(k+44,76),(k+36,80)],fill=PALE)
  d.polygon([(k+80,88),(k+96,72),(k+112,88),(k+96,84)],fill=PALE)
 d.rectangle((0,104,width-1,119),fill=MID)
 for k in range(0,width,32):
  d.line((k,110,k+14,110),fill=PALE);d.line((k+16,115,k+24,115),fill=PALE)
 d.rectangle((0,120,width-1,123),fill=WHITE)
 d.rectangle((0,124,width-1,135),fill=PALE)
 d.rectangle((0,136,width-1,143),fill=MID)
 for k in range(0,width,16):
  d.line((k,124,k+5,129),fill=WHITE);d.line((k+9,136,k+13,140),fill=INK)
 return im
course=landscape(2032);d=ImageDraw.Draw(course)
text(course,'A: DOUBLE JUMP',16,32,WHITE)
text(course,'FISH 100: STAR',16,48,PALE)
text(course,'PRESS A TWICE',16,64,WHITE)
text(course,'STOMP BEARS',16,80,WHITE)
# Finish gate, behind the route.
d.rectangle((1968,80,1971,119),fill=WHITE)
for yy in range(80,96,4):
 for xx in range(1972,1996,4):
  d.rectangle((xx,yy,xx+3,yy+3),fill=WHITE if ((xx//4+yy//4)%2) else INK)
text(course,'GOAL',1960,64,WHITE)
course.save(BG/'ice_run.png')
title=landscape(160);d=ImageDraw.Draw(title)
d.rectangle((0,8,159,71),fill=INK)
centered(title,'PENGUIN',14,PALE,3);centered(title,'JUMP',40,WHITE,4)
# A 24-pixel penguin leaves room for the mode selector below the animation.
title_frames=[]
for frame,hop in enumerate((0,0,3,6,8,6,3,0)):
 region=title.crop((64,72,96,104))
 p=penguin(frame&1).resize((24,24),Image.Resampling.NEAREST)
 for y in range(24):
  for x in range(24):
   v=p.getpixel((x,y))
   if v!=(101,255,0):region.putpixel((4+x,8-hop+y),v)
 title_frames.append(region)
title.paste(title_frames[0],(64,72))
colors={tuple(bytes.fromhex(c)):i for i,c in enumerate(('e0f8cf','86c06c','306850','071821'))}
def encode_tiles(frame):
 tiles=[]
 for ty in range(0,frame.height,8):
  for tx in range(0,frame.width,8):
   data=[]
   for y in range(8):
    pixels=[colors[frame.getpixel((tx+x,ty+y))] for x in range(8)]
    data.extend(sum(((p>>bit)&1)<<(7-x) for x,p in enumerate(pixels)) for bit in range(2))
   tiles.append(tuple(data))
 return tiles
encoded=[sum((list(t) for t in encode_tiles(frame)),[]) for frame in title_frames]
menu_frames=[];menu_tiles=[];menu_maps=[]
for mode in range(2):
 menu=Image.new('RGB',(160,40),INK);d=ImageDraw.Draw(menu)
 centered(menu,'GAME MODE',2,WHITE)
 for choice,word,x0,x1,tx in ((0,'NORMAL',17,75,29),(1,'HARD',85,143,103)):
  d.rounded_rectangle((x0,12,x1,25),radius=2,fill=WHITE if mode==choice else INK,outline=WHITE if mode==choice else MID)
  text(menu,word,tx,16,INK if mode==choice else PALE)
 d.polygon([(6,18),(11,15),(11,21)],fill=PALE)
 d.polygon([(154,18),(149,15),(149,21)],fill=PALE)
 centered(menu,'PRESS A OR START',31,WHITE)
 menu_frames.append(menu);tilemap=[]
 for tile in encode_tiles(menu):
  if tile not in menu_tiles:menu_tiles.append(tile)
  tilemap.append(144+menu_tiles.index(tile))
 menu_maps.append(tilemap)
assert len(menu_tiles)<=112, 'Title menu must fit in bank 1 tiles 144..255'
title.paste(menu_frames[0],(0,104))
c_array=lambda values:','.join(f'0x{v:02x}' for v in values)
(ROOT/'plugins/penguin-runner/engine/include/states/penguin_title.h').write_text(
 '/* Generated by art-source/create_art.py. */\n'
 'static const unsigned char pj_title_frames[8][256] = {\n'+
 ',\n'.join('{'+c_array(frame)+'}' for frame in encoded)+'\n};\n'+
 f'#define PJ_MENU_TILE_COUNT {len(menu_tiles)}\n'+
 'static const unsigned char pj_menu_tiles[] = {'+c_array(sum((list(t) for t in menu_tiles),[]))+'};\n'+
 'static const unsigned char pj_menu_maps[2][100] = {\n'+
 ',\n'.join('{'+c_array(tilemap)+'}' for tilemap in menu_maps)+'\n};\n')
# タイトル右上の余白に、配布ROMと同じバージョンを表示する。
version_width=sum(len(FONT[c][0])+1 for c in GAME_VERSION)-1
text(title,GAME_VERSION,title.width-version_width-4,3,WHITE)
title.save(BG/'title.png')

# Native 8-pixel fish: one 8x16 hardware sprite, drawn in the top-left cell.
fish=Image.new('RGB',(16,16),TRANS)
fish_rows=['........','........','........','..WW....','.WWOO..O','WWDOOOOO','.WWOO..O','..WW....']
for yy,row in enumerate(fish_rows):
 for xx,c in enumerate(row):
  if c!='.':fish.putpixel((xx,yy+3),ImageColor[c])
fish.save(SP/'fish.png')
ice=Image.new('RGB',(272,64),TRANS)
for i,h in enumerate([16,24]):
 d=ImageDraw.Draw(ice);x=i*16;y=32-h
 d.rectangle((x,y,x+15,31),fill=INK)
 d.rectangle((x+1,y+1,x+14,30),fill=PALE)
 d.polygon([(x+2,y+2),(x+12,y+2),(x+5,y+10),(x+2,28)],fill=WHITE)
 d.line((x+13,y+6,x+13,29),fill=INK)
# Two deliberate gap frames, with icy lips and dark water below ground level.
for i,h in enumerate([48,56]):
 d=ImageDraw.Draw(ice);x=112+i*16;y=64-h
 d.rectangle((x,y,x+15,63),fill=INK)
 d.rectangle((x+1,y+1,x+14,62),fill=PALE)
 d.polygon([(x+2,y+2),(x+12,y+2),(x+5,y+16),(x+2,60)],fill=WHITE)
 d.line((x+13,y+6,x+13,61),fill=INK)
 for yy in range(y+16,63,16):
  d.line((x+1,yy,x+14,yy),fill=INK)
  d.line((x+2,yy+1,x+12,yy+1),fill=WHITE)
for x,w in [(32,32),(72,40),(144,56),(208,64)]:
 d=ImageDraw.Draw(ice)
 d.rectangle((x,0,x+w-1,7),fill=INK)
 d.line((x,0,x+1,0),fill=WHITE)
 d.line((x+w-2,0,x+w-1,0),fill=WHITE)
 d.line((x,1,x+1,5),fill=PALE)
 d.line((x+w-2,5,x+w-1,1),fill=PALE)
 d.line((x+7,6,x+13,6),fill=PALE)
 d.line((x+w-12,7,x+w-7,7),fill=PALE)
ice.save(SP/'ice.png')

# Fixed-width HUD tiles occupy the engine's unused dialogue tile range.
glyphs=' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:/-'
tilebytes=[]
for c in glyphs:
 for y in range(8):
  row=FONT[c][y] if y<7 else ''
  bits=sum(1<<(6-x) for x,v in enumerate(row) if v=='1')
  tilebytes.extend([bits^255,bits^255])
# F4..FC: zero through eight filled pixels; FD/FE: left and right caps.
for filled in range(9):
 for y in range(8):
  bits=255 if y in (1,6) else ((255 << (8-filled)) & 255) if 2<=y<=5 else 0
  tilebytes.extend([bits^255,bits^255])
for cap in ('left','right'):
 for y in range(8):
  bits=(15 if cap=='left' else 240) if y in (1,6) else (8 if cap=='left' else 16) if 2<=y<=5 else 0
  tilebytes.extend([bits^255,bits^255])
header=ROOT/'plugins/penguin-runner/engine/include/states/penguin_font.h'
header.write_text('/* Generated by art-source/create_art.py. */\nstatic const unsigned char pj_font[] = {\n'+',\n'.join(','.join(f'0x{v:02x}' for v in tilebytes[i:i+16]) for i in range(0,len(tilebytes),16))+'\n};\n')
(ROOT/'art-source').mkdir(exist_ok=True)
(ROOT/'art-source/course.json').write_text(json.dumps({'width': 2032, 'groundY': 120, 'generator': 'plugins/penguin-runner/engine/src/states/penguin.c', 'obstaclesPerCourse': 10, 'bearsPerCourse': 2, 'bearPatrolRadius': 16, 'bearWidth': 24, 'bearCollisionTop': 100, 'stompBounceSubpixels': -104, 'holesPerCourse': 4, 'holeWidths': [32, 40, 56, 64], 'iceHeights': [16, 24, 48, 56], 'largestObstaclesFromCourse': 3, 'maxJumps': 2, 'fishPerCourse': 60, 'minimumObstacleGap': 160, 'invincibilityFrames': 480, 'invincibilityGaugePixels': 80, 'invincibilityProtectsFromHoles': True, 'speedSubpixelsPerUpdate': {'initial': 56, 'perClear': 1, 'maximum': 84, 'maximumAfterClears': 28}, 'jumpPhysicsScaledWithSpeed': True, 'floatingBlock': {'width': 16, 'top': 80, 'bottom': 96, 'safeGroundRoute': True}, 'snowballs': {'fromStage': 5, 'windupUpdates': 12, 'throwPoseUpdates': 10, 'maximumActive': 2, 'speedMatchesScroll': True, 'centerY': 108, 'invincibilityProtects': True}, 'icicle': {'fromStage': 10, 'width': 16, 'height': 32, 'warningDistance': 112, 'warningPhysicsTicks': 24, 'groundedPhysicsTicks': 48, 'shatterPhysicsTicks': 10, 'physicsScaledWithSpeed': True, 'minimumDistanceToNextObstacle': 160, 'invincibilityProtects': True, 'perCourseRange': [1, 3], 'candidateObstacleIndices': [0, 'safe slot 5 or 6', 9], 'sampling': 'uniform count; shuffle candidates without replacement; visit in course order', 'replacesSelectedObstacle': True, 'maximumActive': 1}, 'menuReturn': {'gameOverButton': 'B', 'preserveSessionBest': True, 'resetsMusicTempo': True}, 'icePerCourseBeforeStage10': 3, 'floatingBlocksPerCourseBeforeStage10': 1, 'blackBear': {'fromStage': 15, 'perCourse': 1, 'replacesRandomPolarBear': True, 'stationary': True, 'stompable': True, 'throwsSnowballs': False, 'hammersPerCourse': 1, 'windupBaseTicks': 16, 'windupScaledWithSpeed': True}, 'hammer': {'width': 16, 'height': 16, 'frames': 4, 'startY': 96, 'startOffsetX': -8, 'horizontalSubpixelsPerPhysicsTick': -32, 'initialVerticalSubpixelsPerPhysicsTick': -160, 'gravitySubpixelsPerPhysicsTick': 12, 'physicsScaledWithSpeed': True, 'despawnY': 128, 'normalContactFatal': True, 'invincibilityProtects': True}},indent=2)+'\n')
# 新機能の設計情報も、素材再生成のたびに同じ内容を出力する。
design_path=ROOT/'art-source/course.json'
design=json.loads(design_path.read_text())
design['titleAnimation']={'frames':8,'frameUpdates':8,'region':[64,72,32,32],'version':GAME_VERSION,'vramBank':1,'tileStart':128}
design['gameModes']={'default':'NORMAL','selection':'left/right or SELECT','start':'A or START','hardInitialEquivalentStage':20,'hardInitialSpeed':75,'normalInitialSpeed':56,'scoreStartsAtZero':True,'sessionBestsSeparate':True,'retryRetainsMode':True,'menuRetainsSelection':True}
design['fishGauge']={'pixels':80,'threshold':100,'fillDirection':'left-to-right','totalFishShownInResults':True,'sharedWithStarGauge':True}
design['meteor']={'fromStage':20,'perCourse':1,'replacesSafeFirstPairObstacle':True,'candidateObstacleIndices':[1,2],'warningDistance':112,'warningPhysicsTicks':24,'startOffsetX':64,'startY':16,'horizontalSubpixelsPerPhysicsTick':-64,'verticalSubpixelsPerPhysicsTick':80,'despawnY':120,'maximumActive':1,'normalContactFatal':True,'invincibilityProtects':True,'physicsScaledWithSpeed':True,'flameTrailIsDecorative':True}
for hazard in ('icicle', 'meteor'):
 design[hazard]['activationDistance']=design[hazard].pop('warningDistance')
 design[hazard]['silentDelayPhysicsTicks']=design[hazard].pop('warningPhysicsTicks')
 design[hazard]['warningMarker']=False
 design[hazard]['warningSound']=False
 design[hazard]['fishY']=112
design['icicle']['visibleBeforeFalling']=False
design['icicle']['collisionBeforeFalling']=False
design['weatherModes']={'fromStage':20,'hardStartsEligible':True,'independentPerCourse':True,'probabilityEach':0.1,'combinationsAllowed':True,'preserveOrdinaryLayout':True,'blizzard':{'whiteHaze':True,'animatedSkySnow':True,'hudUnaffected':True},'icicleStorm':{'multiplier':3,'perCourseRange':[3,9],'volleyOffsetX':[-16,0,16],'delayPhysicsTicks':[24,32,40]},'meteorStorm':{'multiplier':3,'perCourse':3,'volleyOffsetX':[0,16,32],'delayPhysicsTicks':[24,32,40]},'hudLegend':{'S':'SNOW','I':'ICE','M':'METEOR'}}
design_path.write_text(json.dumps(design,indent=2)+'\n')
print('Created native PNG artwork and editable obstacle data.')
