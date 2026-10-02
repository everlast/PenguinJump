"""ホスト上で実ソースの抽選・配置・落下処理を検査する。ROM実行とは区別する。"""
from pathlib import Path
import json, re, subprocess, tempfile

root=Path(__file__).resolve().parents[1]
src=(root/'plugins/penguin-runner/engine/src/states/penguin.c').read_text()
def function(name):
    start=src.index('static ',src.index('static '+('UWORD' if name=='random16' else 'UBYTE' if name=='roll_ten_percent' else 'void')+' '+name))
    brace=src.index('{',start);depth=1;i=brace+1
    while depth:
        depth+=(src[i]=='{')-(src[i]=='}');i+=1
    return src[start:i]
prefix='''#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <assert.h>
typedef uint8_t UBYTE; typedef uint16_t UWORD; typedef int16_t INT16;
typedef struct {UWORD x,y;} point_t;
typedef struct {point_t pos;UBYTE flags;} actor_t;
typedef struct {UWORD c0,c1,c2,c3;} palette_entry_t;
typedef struct {UBYTE bank;void *ptr;} far_ptr_t;
actor_t player;
UBYTE pj_game_mode,pj_music_rate;
#define PLAYER player
#define PJ_MODE_HARD 1
#define PX_TO_SUBPX(x) ((UWORD)((x)*32))
#define SUBPX_TO_PX(x) ((x)>>5)
#define DIR_RIGHT 1
#define TRUE 1
#define ACTOR_FLAG_HIDDEN 2
#define ACTOR_FLAG_DISABLED 4
#define CLR_FLAG(a,b) ((a)&=~(b))
#define actor_set_dir(a,b,c) ((void)0)
#define tone(a,b) ((void)0)
static void apply_weather(void) {}
'''
defs=src[src.index('#define PJ_GROUND'):src.index('static UBYTE pj_row')]
code=prefix+defs+'\n'+'\n'.join(function(n) for n in ['random16','roll_ten_percent','generate_course','update_icicle','update_meteor'])+r'''
int main(void){
 unsigned counts[8]={0}, seeds=65535, i, s, j, simulated=0, stages=0;
 for(s=1;s<=seeds;++s){
   pj_game_mode=1;pj_courses=0;pj_rng=s;generate_course();
   assert(pj_level==19);++counts[pj_weather];
   assert(pj_icicle_volley==((pj_weather&2)?3:1));
   assert(pj_meteor_volley==((pj_weather&4)?3:1));
   unsigned pits=0,bears=0,ice=0,meteors=0;
   for(i=0;i<10;++i){pits+=pj_hole_w[i]!=0;bears+=pj_ice_h[i]==255;ice+=pj_ice_h[i]==253;meteors+=pj_ice_h[i]==252;}
   assert(pits==4&&bears==2&&ice==pj_icicle_count&&meteors==1);
   if(s<=1000){
     UWORD layout[10];UBYTE h[10],w[10],flags=pj_weather;
     memcpy(layout,pj_ice_x,sizeof layout);memcpy(h,pj_ice_h,sizeof h);memcpy(w,pj_hole_w,sizeof w);
     pj_game_mode=0;pj_courses=19;pj_rng=s;generate_course();
     assert(pj_weather==flags&&!memcmp(layout,pj_ice_x,sizeof layout)&&!memcmp(h,pj_ice_h,sizeof h)&&!memcmp(w,pj_hole_w,sizeof w));
     // Exercise every generated fall at maximum speed, without suppressing hazards.
     pj_speed=84;pj_icicle_drops=pj_meteor_drops=0;
     for(j=0;PLAYER.pos.x<PX_TO_SUBPX(1972);++j){
       update_icicle();update_meteor();
       for(i=0;i<3;++i)if(pj_meteor_state[i]==2){
         unsigned bearx=pj_ice_x[pj_bear_index[0]];
         assert(SUBPX_TO_PX(PLAYER.pos.x)+112<bearx);
       }
       PLAYER.pos.x+=pj_speed;assert(j<1000);
     }
     assert(pj_icicle_drops==pj_icicle_count*pj_icicle_volley);
     assert(pj_meteor_drops==pj_meteor_volley);++simulated;
   }
 }
 for(i=0;i<8;++i)assert(counts[i]>0);
 for(i=0;i<3;++i){unsigned n=0;for(j=0;j<8;++j)if(j&(1<<i))n+=counts[j];assert(n>seeds*0.095&&n<seeds*0.105);}
 for(j=0;j<19;++j)for(s=1;s<=50;++s){pj_game_mode=0;pj_courses=j;pj_rng=s;generate_course();assert(pj_weather==0&&pj_icicle_volley==1&&pj_meteor_volley==1);++stages;}
 printf("{\"seedCount\":%u,\"weatherMaskCounts\":[",seeds);
 for(i=0;i<8;++i)printf("%s%u",i?",":"",counts[i]);
 printf("],\"maxSpeedCourseSimulations\":%u,\"belowStage20Cases\":%u}\n",simulated,stages);
}
'''
with tempfile.TemporaryDirectory(prefix='penguin-v19-check-') as temp:
    c=Path(temp)/'check.c';exe=Path(temp)/'check';c.write_text(code)
    sdk=subprocess.check_output(['xcrun','--sdk','macosx','--show-sdk-path'],text=True).strip()
    subprocess.run(['xcrun','clang','-isysroot',sdk,'-std=c99','-O2',str(c),'-o',str(exe)],check=True)
    result=json.loads(subprocess.check_output([str(exe)],text=True))
result['scope']='実ソースをホストCで検査。ROMの描画・操作検証とは別。'
(root/'playtest/v19-host-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
