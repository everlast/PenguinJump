async function readPJ(){
 const r=await Promise.all([
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",offset:502,length:38}),
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",offset:660,length:10}),
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",offset:790,length:79}),
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",bank:1,offset:719,length:5})]);
 const b=r.map(x=>x.structuredContent?.hex?.match(/../g).map(h=>parseInt(h,16)));if(b.some(x=>!x))throw Error("Missing WRAM");
 const w=(a,i)=>a[i]+256*a[i+1],v=w(b[0],0);
 return {frame:r[0].structuredContent.frame,velocity:v>32767?v-65536:v,rng:w(b[0],2),courses:w(b[0],4),fish:w(b[0],6),bestC:w(b[0],8),bestF:w(b[0],10),star:w(b[0],12),phaseTimer:w(b[0],14),ticks:w(b[0],16),
 ice:Array.from({length:10},(_,i)=>({x:w(b[0],18+i*2),h:b[1][i],w:b[2][8+i]})),
 phase:b[2][0],progress:b[2][1],speed:b[2][2],falling:b[2][18],jumps:b[2][19],gauge:b[2][20],motion:b[2][21],
 bears:Array.from({length:2},(_,i)=>({x:w(b[2],22+i*2)/32,index:b[2][26+i],right:b[2][28+i],black:b[2][65+i],alive:b[2][30+i],squash:b[2][32+i]})),stomps:w(b[2],34),snow:Array.from({length:2},(_,i)=>({x:w(b[2],36+i*2)/32,active:b[2][42+i],windup:b[2][44+i],cooldown:b[2][46+i],pose:b[2][48+i]})),thrown:w(b[2],40),death:b[2][50],icicle:{y:w(b[2],51)/32,drops:w(b[2],53),velocity:w(b[2],55),state:b[2][57],timer:b[2][58],clock:b[2][59],count:b[2][60],next:b[2][61],indices:b[2].slice(62,65)},hammer:{x:w(b[2],68)/32,thrown:w(b[2],70),y:w(b[2],72)/32,velocity:(w(b[2],74)>32767?w(b[2],74)-65536:w(b[2],74)),active:b[2][76],age:b[2][77],clock:b[2][78],fired:b[2][67]},x:w(b[3],1)/32,y:w(b[3],3)/32};
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
 const a=load("v12Oam")||[];a.push({frame:s.frame,courses:s.courses,label,...r.structuredContent.scanlineSummary});store("v12Oam",a);
}
function evidencePJ(kind,s,extra={}){const a=load("v12Evidence")||[];a.push({kind,...s,...extra});store("v12Evidence",a);}
async function passStaticPJ(i){
 let s=await readPJ();const h=s.ice[i];await stepPJ([],2);
 if(h.h===253){
 s=await approachPJ(h.x-36);evidencePJ('icicle_takeoff',s);await oamPJ(s,'icicle');
 if(!s.star&&s.icicle.state!==2&&s.icicle.state!==3)throw Error('Icicle not dropping at takeoff '+JSON.stringify(s));
 s=await stepPJ(['a'],Math.round(42*56/s.speed));
 for(let n=0;n<30&&s.jumps&&!s.phase;n++)s=await stepPJ(['a'],1);
 evidencePJ('icicle_pass',s);await oamPJ(s,'icicle pass');
 if(s.phase||s.falling||s.jumps||s.x<h.x+16)throw Error('Icicle failed '+JSON.stringify(s));return s;
 }
 if(h.h===254){
 if(!load('v12FloatStar')&&s.star>(h.x-s.x)*32/s.speed+40){
  s=await approachPJ(h.x-18);evidencePJ('float_star_takeoff',s);s=await stepPJ(['a'],14);evidencePJ('float_star_contact',s);
  if(s.phase||!s.star||s.y>=104)throw Error('Star block failed');store('v12FloatStar',true);
  for(let n=0;n<65&&s.jumps&&!s.phase;n++)s=await stepPJ(['a'],1);
 }
 s=await approachPJ(h.x+22);evidencePJ("float_under",s,{obstacle:i});if(s.phase||s.y!==112)throw Error("Float under failed");return s;}
 s=await approachPJ(h.x-(h.h>=48?56:h.w>=56?28:h.w===40?28:36));evidencePJ("approach",s,{obstacle:i});await oamPJ(s,"approach");
 if(h.h>=48||h.w>=56){
  s=await stepPJ(["a"],Math.round((h.h>=48?18:24)*56/s.speed));await stepPJ([],2);
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
  if(before.hammer.active&&!s.hammer.active&&Math.abs(before.hammer.x-before.x)<24){evidencePJ('star_hammer_contact',s,{before});store('v12StarHammer',true);}
  if(oldSnow.active&&!s.snow[bi].active&&Math.abs(oldSnow.x-before.x)<24){evidencePJ('star_snow_contact',s,{before});store('v12StarSnow',true);}
 }
 evidencePJ("invincible_ground_contact",s,{obstacle:i,bear:bi});await oamPJ(s,"star contact");
 if(s.phase||s.bears[bi].alive||s.y!==112||s.stomps!==old)throw Error("Invincible ground bear failed");
 s=await stepPJ([],8);evidencePJ("invincible_squash",s,{obstacle:i,bear:bi});return s;
 }
 if(s.bears[bi].black){
  const cp=await tools.mcp__modretro_chromatic__emulator_checkpoint({action:"save",label:"black-stage-"+(s.courses+1)});store("v12BlackCheckpoint",cp.structuredContent);evidencePJ("black_checkpoint",s,{checkpoint:cp.structuredContent});
  for(let k=0;k<100&&!s.phase;k++){
   if(s.hammer.active&&s.hammer.x-s.x<=50)break;
   s=await stepPJ([],1);
  }
  evidencePJ("hammer_takeoff",s,{bear:bi});await oamPJ(s,"hammer takeoff");
  if(s.phase||s.jumps||!s.hammer.active)throw Error("Bad hammer takeoff "+JSON.stringify(s));
  const old=s.stomps;
  for(let k=0;k<100&&!s.phase&&(s.jumps||s.bears[bi].alive||s.x<center+28);k++){
   s=await stepPJ(["a"],1);
   if(k%3===0){evidencePJ("hammer_dodge",s,{bear:bi});await oamPJ(s,"hammer dodge");}
  }
  evidencePJ("black_bear_passed",s,{bear:bi});
  if(s.phase||s.falling||s.bears[bi].alive||s.stomps!==old+1)throw Error("Black bear failed "+JSON.stringify(s));return s;
 }
 if(s.courses>=4){
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
 if(!load("v12AirJumpVerified")&&s.stomps>old){
 await stepPJ([],1);s=await stepPJ(["a"],5);evidencePJ("stomp_extra_air_jump",s);
 if(s.jumps!==2||s.velocity>=0)throw Error("Extra air jump failed");
 store("v12AirJumpVerified",true);
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
