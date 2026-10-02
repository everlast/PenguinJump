const pjSymbols={"penguin_velocity_y": 49654, "pj_rng": 49656, "pj_courses": 49658, "pj_fish": 49660, "pj_best_courses": 49662, "pj_best_fish": 49664, "pj_star": 49666, "pj_phase_timer": 49668, "pj_run_ticks": 49670, "pj_ice_x": 49672, "pj_fish_x": 49692, "pj_ice_h": 49812, "pj_fish_y": 49822, "pj_taken": 49882, "pj_phase": 49942, "pj_progress": 49943, "pj_speed": 49944, "pj_jump_buffer": 49945, "pj_was_airborne": 49946, "pj_fish_head": 49947, "pj_hud_dirty": 49948, "pj_last_seconds": 49949, "pj_hole_w": 49950, "pj_falling": 49960, "pj_jumps": 49961, "pj_gauge_pixels": 49962, "pj_motion_accum": 49963, "pj_bear_x": 49964, "pj_bear_index": 49968, "pj_bear_right": 49970, "pj_bear_alive": 49972, "pj_bear_squash": 49974, "pj_stomps": 49976, "pj_snow_x": 49978, "pj_snow_thrown": 49982, "pj_snow_active": 49984, "pj_bear_windup": 49986, "pj_bear_cooldown": 49988, "pj_bear_throw_pose": 49990, "pj_death_cause": 49992, "pj_icicle_y": 49993, "pj_icicle_drops": 49999, "pj_icicle_velocity": 50001, "pj_icicle_state": 50007, "pj_icicle_timer": 50010, "pj_icicle_clock": 50013, "pj_icicle_count": 50014, "pj_icicle_next": 50015, "pj_icicle_index": 50016, "pj_bear_black": 50019, "pj_black_fired": 50021, "pj_hammer_x": 50022, "pj_hammer_thrown": 50024, "pj_hammer_y": 50026, "pj_hammer_velocity": 50028, "pj_hammer_active": 50030, "pj_hammer_age": 50031, "pj_hammer_clock": 50032, "pj_meteor_x": 50033, "pj_meteor_drops": 50039, "pj_meteor_y": 50041, "pj_meteor_index": 50047, "pj_meteor_state": 50048, "pj_meteor_timer": 50051, "pj_meteor_clock": 50054, "pj_meteor_age": 50055, "pj_weather": 50058, "pj_icicle_volley": 50059, "pj_meteor_volley": 50060, "pj_sky_tile": 50061, "pj_snow_frame": 50062, "pj_level": 50195, "pj_mode_best_courses": 50197, "pj_mode_best_fish": 50201, "pj_star_track": 50225, "pj_normal_track": 50227, "pj_star_bank": 50229, "pj_normal_bank": 50230, "pj_music_star": 50231, "pj_game_mode": 50239, "actors": 54155, "pj_music_rate": 56229, "pj_music_clock": 56230, "pj_menu_script": 423332};

async function readPJ(){
 const requests=[{offset:502,length:256},{offset:758,length:256},{offset:1014,length:80},{bank:1,offset:pjSymbols.actors-0xD000,length:5}];
 const r=await Promise.all(requests.map(x=>tools.mcp__modretro_chromatic__emulator_inspect({view:'memory',region:'wram',...x})));
 const data=r.map(x=>x.structuredContent?.hex?.match(/../g).map(h=>parseInt(h,16)));
 if(data.some(x=>!x))throw Error(JSON.stringify(r));
 const mem=data.slice(0,3).flat(),u=(name,i=0)=>mem[pjSymbols[name]-0xC1F6+i],w=(name,i=0)=>u(name,i)+256*u(name,i+1),signed=v=>v>32767?v-65536:v;
 const arr=(name,n=3)=>Array.from({length:n},(_,i)=>u(name,i)),words=(name,n=3)=>Array.from({length:n},(_,i)=>w(name,i*2));
 return {frame:r[0].structuredContent.frame,mode:u('pj_game_mode'),level:w('pj_level'),weather:u('pj_weather'),iceVolley:u('pj_icicle_volley'),meteorVolley:u('pj_meteor_volley'),snowFrame:u('pj_snow_frame'),skyTile:u('pj_sky_tile'),
 velocity:signed(w('penguin_velocity_y')),rng:w('pj_rng'),courses:w('pj_courses'),fish:w('pj_fish'),star:w('pj_star'),phaseTimer:w('pj_phase_timer'),ticks:w('pj_run_ticks'),
 ice:Array.from({length:10},(_,i)=>({x:w('pj_ice_x',i*2),h:u('pj_ice_h',i),w:u('pj_hole_w',i)})),
 phase:u('pj_phase'),progress:u('pj_progress'),speed:u('pj_speed'),falling:u('pj_falling'),jumps:u('pj_jumps'),gauge:u('pj_gauge_pixels'),motion:u('pj_motion_accum'),
 bears:Array.from({length:2},(_,i)=>({x:w('pj_bear_x',i*2)/32,index:u('pj_bear_index',i),right:u('pj_bear_right',i),black:u('pj_bear_black',i),alive:u('pj_bear_alive',i),squash:u('pj_bear_squash',i)})),stomps:w('pj_stomps'),
 snow:Array.from({length:2},(_,i)=>({x:w('pj_snow_x',i*2)/32,active:u('pj_snow_active',i),windup:u('pj_bear_windup',i),cooldown:u('pj_bear_cooldown',i),pose:u('pj_bear_throw_pose',i)})),thrown:w('pj_snow_thrown'),death:u('pj_death_cause'),
 icicle:{ys:words('pj_icicle_y').map(y=>y/32),drops:w('pj_icicle_drops'),states:arr('pj_icicle_state'),state:u('pj_icicle_state'),timers:arr('pj_icicle_timer'),clock:u('pj_icicle_clock'),count:u('pj_icicle_count'),next:u('pj_icicle_next'),indices:arr('pj_icicle_index')},
 hammer:{x:w('pj_hammer_x')/32,y:signed(w('pj_hammer_y'))/32,thrown:w('pj_hammer_thrown'),velocity:signed(w('pj_hammer_velocity')),active:u('pj_hammer_active'),age:u('pj_hammer_age'),clock:u('pj_hammer_clock'),fired:u('pj_black_fired')},
 meteor:{xs:words('pj_meteor_x').map(x=>x/32),ys:words('pj_meteor_y').map(y=>signed(y)/32),drops:w('pj_meteor_drops'),index:u('pj_meteor_index'),states:arr('pj_meteor_state'),state:u('pj_meteor_state'),timers:arr('pj_meteor_timer'),clock:u('pj_meteor_clock'),ages:arr('pj_meteor_age')},
 x:(data[3][1]+data[3][2]*256)/32,y:(data[3][3]+data[3][4]*256)/32};
}
async function stepPJ(buttons,frames){
 const r=await tools.mcp__modretro_chromatic__emulator_step({buttons,frames,includeImages:false});
 if(r.isError)throw Error(JSON.stringify(r.structuredContent));
 return await readPJ();
}
async function approachPJ(target){
 let s=await readPJ();
 for(let k=0;k<30&&s.x<target-1&&s.phase===0;k++)s=await stepPJ([],Math.max(1,Math.floor((target-s.x)/(s.speed/32))));
 return s;
}
async function oamPJ(s,label){
 const r=await tools.mcp__modretro_chromatic__emulator_inspect({view:"oam",visibleOnly:true,limit:40,includeScanlineSummary:true});
 const a=load("v19Oam")||[];a.push({frame:s.frame,courses:s.courses,label,...r.structuredContent.scanlineSummary});store("v19Oam",a);
}
function evidencePJ(kind,s,extra={}){const a=load("v19Evidence")||[];a.push({kind,...s,...extra});store("v19Evidence",a);}
async function passStaticPJ(i){
 let s=await readPJ();const h=s.ice[i];await stepPJ([],2);
 if((h.h===253&&s.iceVolley===3)||(h.h===252&&s.meteorVolley===3)){
 s=await approachPJ(h.x-(h.h===253?56:36));
 evidencePJ('triple_takeoff',s,{obstacle:i});
 await snapPJ(h.h===253?'triple-icicle-start':'triple-meteor-start');
 s=await sampledPJ(['a'],Math.round(16*56/s.speed),'triple first jump');
 await stepPJ([],1);s=await sampledPJ(['a'],Math.round(32*56/s.speed),'triple second jump');
 for(let n=0;n<60&&s.jumps&&!s.phase;n++)s=await sampledPJ(['a'],1,'triple landing');
 evidencePJ('triple_pass',s,{obstacle:i});
 if(s.phase||s.falling||s.jumps)throw Error('Triple failed '+JSON.stringify(s));return s;
 }
 if(h.h===252){
 s=await approachPJ(h.x-112);await stepPJ([],1);
 const cp=await tools.mcp__modretro_chromatic__emulator_checkpoint({action:"save",label:"meteor-stage-"+(s.courses+1)});
 evidencePJ('meteor_checkpoint',await readPJ(),{checkpoint:cp.structuredContent});store('v19MeteorCheckpoint',cp.structuredContent);
 s=await approachPJ(h.x-36);evidencePJ('meteor_takeoff',s);await oamPJ(s,'meteor');
 s=await stepPJ(['a'],Math.round(40*56/s.speed));
 for(let n=0;n<30&&s.jumps&&!s.phase;n++)s=await stepPJ(['a'],1);
 evidencePJ('meteor_pass',s);await oamPJ(s,'meteor pass');
 if(s.phase||s.falling||s.jumps)throw Error('Meteor failed '+JSON.stringify(s));return s;
 }
 if(h.h===253){
 s=await approachPJ(h.x-36);evidencePJ('icicle_takeoff',s);await oamPJ(s,'icicle');
 if(!s.star&&s.icicle.state!==2&&s.icicle.state!==3)throw Error('Icicle not dropping at takeoff '+JSON.stringify(s));
 s=await stepPJ(['a'],Math.round(42*56/s.speed));
 for(let n=0;n<30&&s.jumps&&!s.phase;n++)s=await stepPJ(['a'],1);
 evidencePJ('icicle_pass',s);await oamPJ(s,'icicle pass');
 if(s.phase||s.falling||s.jumps||s.x<h.x+16)throw Error('Icicle failed '+JSON.stringify(s));return s;
 }
 if(h.h===254){
 if(!load('v19FloatStar')&&s.star>(h.x-s.x)*32/s.speed+40){
  s=await approachPJ(h.x-18);evidencePJ('float_star_takeoff',s);s=await stepPJ(['a'],14);evidencePJ('float_star_contact',s);
  if(s.phase||!s.star||s.y>=104)throw Error('Star block failed');store('v19FloatStar',true);
  for(let n=0;n<65&&s.jumps&&!s.phase;n++)s=await stepPJ(['a'],1);
 }
 s=await approachPJ(h.x+22);evidencePJ("float_under",s,{obstacle:i});if(s.phase||s.y!==112)throw Error("Float under failed");return s;}
 s=await approachPJ(h.x-(h.h>=48?56:h.w>=56?28:h.w===40?28:36));evidencePJ("approach",s,{obstacle:i});await oamPJ(s,"approach");
 if(h.h>=48||h.w>=56){
  s=await stepPJ(["a"],Math.round((h.h>=48?18:16)*56/s.speed));await stepPJ([],2);
  s=await stepPJ(["a"],Math.round(20*56/s.speed));evidencePJ("double_jump",s,{obstacle:i});await oamPJ(s,"double");
  for(let k=0;k<45&&s.jumps&&s.phase===0&&!s.falling;k++)s=await stepPJ(["a"],1);
 }else s=await stepPJ(["a"],Math.round(40*56/s.speed));
 evidencePJ("static_pass",s,{obstacle:i});
 if(s.phase||s.falling)throw Error("Static failed "+JSON.stringify(s));return s;
}
function predictBear(b,center,n,speed){
 let x=b.x*32,right=b.right,pace=speed>>2,low=(center-16)*32,high=(center+16)*32;
 for(let i=0;i<n;i++){if(right){x+=pace;if(x>=high){x=high;right=0;}}else{x-=pace;if(x<=low){x=low;right=1;}}}
 return x/32;
}
function landingUpdates(s){
 let y=112*32,v=-144,acc=s.motion;
 for(let n=1;n<80;n++){acc+=s.speed;while(acc>=56){acc-=56;v+=v<0?7:10;y+=v;}
 if(v>0&&y+6*32>=100*32)return n;}
 throw Error("No landing");
}
async function passBearPJ(i){
 let s=await readPJ();const bi=s.bears.findIndex(b=>b.index===i),center=s.ice[i].x;
 await stepPJ([],2);s=await approachPJ(center-106);
 if(s.star > (center+40-s.x)*32/s.speed+10){
 const old=s.stomps;
 for(let k=0;k<160&&!s.phase&&s.bears[bi].alive;k++){
  const oldSnow=s.snow[bi];const before=s;s=await stepPJ([],1);
  if(before.hammer.active&&!s.hammer.active&&Math.abs(before.hammer.x-before.x)<24){evidencePJ('star_hammer_contact',s,{before});store('v19StarHammer',true);}
  if(oldSnow.active&&!s.snow[bi].active&&Math.abs(oldSnow.x-before.x)<24){evidencePJ('star_snow_contact',s,{before});store('v19StarSnow',true);}
 }
 evidencePJ("invincible_ground_contact",s,{obstacle:i,bear:bi});await oamPJ(s,"star contact");
 if(s.phase||s.bears[bi].alive||s.y!==112||s.stomps!==old)throw Error("Invincible ground bear failed");
 s=await stepPJ([],8);evidencePJ("invincible_squash",s,{obstacle:i,bear:bi});return s;
 }
 if(s.bears[bi].black){
  const cp=await tools.mcp__modretro_chromatic__emulator_checkpoint({action:"save",label:"black-stage-"+(s.courses+1)});store("v19BlackCheckpoint",cp.structuredContent);evidencePJ("black_checkpoint",s,{checkpoint:cp.structuredContent});
  for(let k=0;k<100&&!s.phase;k++){
   if(s.hammer.active&&s.hammer.x-s.x<=50)break;
   s=await stepPJ([],1);
  }
  evidencePJ("hammer_takeoff",s,{bear:bi});await oamPJ(s,"hammer takeoff");
  if(s.phase||s.jumps||!s.hammer.active)throw Error("Bad hammer takeoff "+JSON.stringify(s));
  const old=s.stomps, starBefore=s.star;
  for(let k=0;k<100&&!s.phase&&(s.jumps||s.bears[bi].alive||s.x<center+28);k++){
   s=await stepPJ(["a"],1);
   if(k%3===0){evidencePJ("hammer_dodge",s,{bear:bi});await oamPJ(s,"hammer dodge");}
  }
  evidencePJ("black_bear_passed",s,{bear:bi});
  if(s.phase||s.falling||s.bears[bi].alive||(s.stomps!==old+1&&!starBefore&&!s.star))throw Error("Black bear failed "+JSON.stringify(s));return s;
 }
 if(s.level>=4){
  for(let k=0;k<100&&!s.phase;k++){
   if(s.snow[bi].windup) evidencePJ("bear_windup",s,{bear:bi});
   if(s.snow[bi].active&&s.snow[bi].x-s.x<=46)break;
   s=await stepPJ([],1);
  }
  evidencePJ("snow_takeoff",s,{bear:bi});await oamPJ(s,"snow takeoff");
  if(s.phase||s.jumps||s.falling)throw Error("Bad snow takeoff "+JSON.stringify(s));
  s=await stepPJ(["a"],Math.max(8,Math.round(14*56/s.speed)));
  evidencePJ("snow_dodge",s,{bear:bi});await oamPJ(s,"snow dodge");
  await stepPJ([],1);s=await stepPJ(["a"],1);
  for(let k=0;k<100&&!s.phase&&(s.jumps||s.x<s.bears[bi].x+28);k++)s=await stepPJ(["a"],1);
  evidencePJ("snow_bear_passed",s,{bear:bi});
  if(s.phase||s.falling||s.x<s.bears[bi].x+24)throw Error("Snow bear failed "+JSON.stringify(s));
  return s;
 }
 for(let k=0;k<100&&!s.phase;k++){
  const n=landingUpdates(s),future=predictBear(s.bears[bi],center,n,s.speed);
  if(s.x+n*s.speed/32>=future)break;
  s=await stepPJ([],1);
 }
 evidencePJ("bear_takeoff",s,{obstacle:i,bear:bi});await oamPJ(s,"bear takeoff");
 if(s.phase||s.falling||s.jumps)throw Error("Bad bear takeoff "+JSON.stringify(s));
 const old=s.stomps,wasStar=s.star;
 for(let k=0;k<70&&!s.phase&&s.bears[bi].alive;k++)s=await stepPJ(["a"],1);
 evidencePJ("bear_defeated",s,{obstacle:i,bear:bi});await oamPJ(s,"bear defeat");
 if(s.phase||s.bears[bi].alive||(!wasStar&&!s.star&&s.stomps!==old+1))throw Error("Bear failed "+JSON.stringify(s));
 s=await stepPJ(["a"],8);evidencePJ("bear_squashed",s,{obstacle:i,bear:bi});
 if(!load("v19AirJumpVerified")&&s.stomps>old){
 await stepPJ([],1);s=await stepPJ(["a"],5);evidencePJ("stomp_extra_air_jump",s);
 if(s.jumps!==2||s.velocity>=0)throw Error("Extra air jump failed");
 store("v19AirJumpVerified",true);
 }
 for(let k=0;k<60&&s.jumps&&!s.phase&&!s.falling;k++)s=await stepPJ(["a"],1);
 evidencePJ("bear_passed",s,{obstacle:i,bear:bi});return s;
}
async function runCoursePJ(startIndex=0){
 let s=await readPJ(),course=s.courses;evidencePJ("course_start",s);
 for(let i=startIndex;i<10;i++){s=s.ice[i].h===255?await passBearPJ(i):await passStaticPJ(i);if(s.phase||s.falling)throw Error("Course hazard "+i);}
 s=await approachPJ(1976);if(s.phase!==2||s.courses!==course+1)throw Error("Course did not clear");
 evidencePJ("course_clear",s);return s;
}


async function snapPJ(label){
 const r=await tools.mcp__modretro_chromatic__emulator_step({buttons:[],frames:1,includeImages:false});
 evidencePJ('screenshot',await readPJ(),{label,sample:r.structuredContent});return r;
}
async function checkpointPJ(label){
 await stepPJ([],1);const r=await tools.mcp__modretro_chromatic__emulator_checkpoint({action:'save',label});
 if(!r.structuredContent)throw Error(JSON.stringify(r));store(label,r.structuredContent);return r.structuredContent;
}
async function sampledPJ(buttons,frames,label){
 let s;for(let n=0;n<frames;n++){s=await stepPJ(buttons,1);await oamPJ(s,label);if(s.phase)break;}return s;
}
