// 公開 emulator ツール用。v17 の symbols.noi と照合した読取専用 WRAM 配置。
// RAM・ゲーム状態の変更を行わず、stepPJ で通常のボタン入力のみを送る。
async function readPJ(){
 const r=await Promise.all([
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",offset:880,length:46}),
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",bank:1,offset:2818,length:2}),
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",offset:502,length:38}),
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",offset:660,length:10}),
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",offset:790,length:90}),
  tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",bank:1,offset:744,length:5})]);
 const all=r.map(x=>x.structuredContent?.hex?.match(/../g).map(h=>parseInt(h,16)));if(all.some(x=>!x))throw Error("Missing WRAM");
 const b=all.slice(2),w=(a,i)=>a[i]+256*a[i+1],v=w(b[0],0);
 return {frame:r[0].structuredContent.frame,mode:all[0][44],level:w(all[0],0),modeBests:[{courses:w(all[0],2),fish:w(all[0],6)},{courses:w(all[0],4),fish:w(all[0],8)}],musicRate:all[1][0],velocity:v>32767?v-65536:v,rng:w(b[0],2),courses:w(b[0],4),fish:w(b[0],6),bestC:w(b[0],8),bestF:w(b[0],10),star:w(b[0],12),phaseTimer:w(b[0],14),ticks:w(b[0],16),
 ice:Array.from({length:10},(_,i)=>({x:w(b[0],18+i*2),h:b[1][i],w:b[2][8+i]})),
 phase:b[2][0],progress:b[2][1],speed:b[2][2],falling:b[2][18],jumps:b[2][19],gauge:b[2][20],motion:b[2][21],
 bears:Array.from({length:2},(_,i)=>({x:w(b[2],22+i*2)/32,index:b[2][26+i],right:b[2][28+i],black:b[2][65+i],alive:b[2][30+i],squash:b[2][32+i]})),stomps:w(b[2],34),snow:Array.from({length:2},(_,i)=>({x:w(b[2],36+i*2)/32,active:b[2][42+i],windup:b[2][44+i],cooldown:b[2][46+i],pose:b[2][48+i]})),thrown:w(b[2],40),death:b[2][50],icicle:{y:w(b[2],51)/32,drops:w(b[2],53),velocity:w(b[2],55),state:b[2][57],timer:b[2][58],clock:b[2][59],count:b[2][60],next:b[2][61],indices:b[2].slice(62,65)},hammer:{x:w(b[2],68)/32,thrown:w(b[2],70),y:w(b[2],72)/32,velocity:(w(b[2],74)>32767?w(b[2],74)-65536:w(b[2],74)),active:b[2][76],age:b[2][77],clock:b[2][78],fired:b[2][67]},meteor:{x:w(b[2],79)/32,drops:w(b[2],81),y:w(b[2],83)/32,index:b[2][85],state:b[2][86],timer:b[2][87],clock:b[2][88],age:b[2][89]},x:w(b[3],1)/32,y:w(b[3],3)/32};
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
 const a=load("v17Oam")||[];a.push({frame:s.frame,courses:s.courses,label,...r.structuredContent.scanlineSummary});store("v17Oam",a);
}
function evidencePJ(kind,s,extra={}){const a=load("v17Evidence")||[];a.push({kind,...s,...extra});store("v17Evidence",a);}
async function passStaticPJ(i){
 let s=await readPJ();const h=s.ice[i];await stepPJ([],2);
 if(h.h===252){
 s=await approachPJ(h.x-112);await stepPJ([],1);
 const cp=await tools.mcp__modretro_chromatic__emulator_checkpoint({action:"save",label:"meteor-stage-"+(s.courses+1)});
 evidencePJ('meteor_checkpoint',await readPJ(),{checkpoint:cp.structuredContent});store('v17MeteorCheckpoint',cp.structuredContent);
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
 if(!load('v17FloatStar')&&s.star>(h.x-s.x)*32/s.speed+40){
  s=await approachPJ(h.x-18);evidencePJ('float_star_takeoff',s);s=await stepPJ(['a'],14);evidencePJ('float_star_contact',s);
  if(s.phase||!s.star||s.y>=104)throw Error('Star block failed');store('v17FloatStar',true);
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
  if(before.hammer.active&&!s.hammer.active&&Math.abs(before.hammer.x-before.x)<24){evidencePJ('star_hammer_contact',s,{before});store('v17StarHammer',true);}
  if(oldSnow.active&&!s.snow[bi].active&&Math.abs(oldSnow.x-before.x)<24){evidencePJ('star_snow_contact',s,{before});store('v17StarSnow',true);}
 }
 evidencePJ("invincible_ground_contact",s,{obstacle:i,bear:bi});await oamPJ(s,"star contact");
 if(s.phase||s.bears[bi].alive||s.y!==112||s.stomps!==old)throw Error("Invincible ground bear failed");
 s=await stepPJ([],8);evidencePJ("invincible_squash",s,{obstacle:i,bear:bi});return s;
 }
 if(s.bears[bi].black){
  const cp=await tools.mcp__modretro_chromatic__emulator_checkpoint({action:"save",label:"black-stage-"+(s.courses+1)});store("v17BlackCheckpoint",cp.structuredContent);evidencePJ("black_checkpoint",s,{checkpoint:cp.structuredContent});
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
 if(!load("v17AirJumpVerified")&&s.stomps>old){
 await stepPJ([],1);s=await stepPJ(["a"],5);evidencePJ("stomp_extra_air_jump",s);
 if(s.jumps!==2||s.velocity>=0)throw Error("Extra air jump failed");
 store("v17AirJumpVerified",true);
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

async function assertPoolPJ(label) {
 const chunks=await Promise.all(Array.from({length:6},(_,i)=>tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",bank:1,offset:744+i*224,length:i===5?56:224})));
 const bytes=chunks.flatMap(r=>r.structuredContent.hex.match(/../g).map(h=>parseInt(h,16)));
 const words=(off)=>bytes[off]+256*bytes[off+1];
 let p=0xD2E8,seen=[],prev=0;
 while(p){let n=(p-0xD2E8)/56;if(!Number.isInteger(n)||n<0||n>20||seen.includes(n))throw Error("Invalid actor list "+label);
 if(!(bytes[n*56]&32)||words(n*56+52)!==prev)throw Error("Invalid link/active "+label+" "+n);
 seen.push(n);prev=p;p=words(n*56+54);}
 if(seen.length!==21)throw Error("Missing actors "+label+" "+seen);
 const r=await tools.mcp__modretro_chromatic__emulator_inspect({view:"oam",visibleOnly:true,limit:40,includeScanlineSummary:true});
 const s=await readPJ();evidencePJ("render_pool_verified",s,{label,actors:seen,oam:r.structuredContent});
 return r.structuredContent;
}
async function capturePJ(label){
 const r=await tools.mcp__modretro_chromatic__emulator_step({buttons:[],frames:1,includeImages:false});
 evidencePJ("screenshot",await readPJ(),{label,sample:r.structuredContent.samples.at(-1)});
 return r.structuredContent.samples.at(-1);
}
async function returnMenuPJ(button,label){
 let s=await readPJ();if(s.phase!==3)throw Error("not gameover");
 await stepPJ([],35);evidencePJ("gameover_for_menu",await readPJ(),{label});
 await stepPJ(["b"],2);await stepPJ([],80);
 const d=await tools.mcp__modretro_chromatic__emulator_debug({includeScene:true,referenceLimit:1});
 if(d.structuredContent?.scene?.type!=="LOGO")throw Error("Not title");
 evidencePJ("title",await readPJ(),{label,scene:d.structuredContent.scene});
 await stepPJ([button],2);s=await stepPJ([],80);
 if(s.phase||s.courses||s.speed!==56||s.star)throw Error("Bad reset");
 const o=await assertPoolPJ(label);
 if(!o.objects.some(x=>x.tile===28&&x.attributes===2))throw Error("Fish not rendered");
 await capturePJ(label+"-fish");
 await approachPJ(s.ice[0].x-54);
 const obs=await assertPoolPJ(label+"-obstacle");
 if(!obs.objects.some(x=>x.tile>=4&&x.tile<28))throw Error("Obstacle not rendered");
 await capturePJ(label+"-obstacle");
 text({label,actors:21,visibleObjects:obs.visibleObjects,x:(await readPJ()).x,bestF:s.bestF});
}
