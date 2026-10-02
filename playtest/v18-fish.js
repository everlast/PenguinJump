async function fishLayoutPJ(label) {
 const [a,b]=await Promise.all([tools.mcp__modretro_chromatic__emulator_inspect({view:'memory',region:'wram',offset:540,length:120}),tools.mcp__modretro_chromatic__emulator_inspect({view:'memory',region:'wram',offset:670,length:120})]);
 if(a.isError||b.isError)throw Error('Fish memory read failed');
 const xs=a.structuredContent.hex.match(/../g).map(h=>parseInt(h,16)),ys=b.structuredContent.hex.match(/../g).map(h=>parseInt(h,16));
 const s=await readPJ(),groups=s.ice.map((h,i)=>({index:i,type:h.h,width:h.w,x:h.x,fish:Array.from({length:6},(_,j)=>({x:xs[(i*6+j)*2]+256*xs[(i*6+j)*2+1],y:ys[i*6+j],taken:ys[60+i*6+j]}))}));
 for(const g of groups){
  if(g.type===252||g.type===253){
   if(g.fish.some(f=>f.y!==112))throw Error('Floating hazard fish '+JSON.stringify(g));
   const expected=Array.from({length:6},(_,j)=>g.x-96+j*24+(j>=3?8:0));
   if(g.fish.some((f,j)=>f.x!==expected[j]))throw Error('Horizontal placement changed');
  }
 }
 evidencePJ('fish_layout',s,{label,groups});return {s,groups};
}
async function fishViewPJ(label) {
 const r=await tools.mcp__modretro_chromatic__emulator_inspect({view:'oam',visibleOnly:true,limit:40,includeScanlineSummary:true});
 if(r.isError)throw Error('OAM missing');
 evidencePJ('fish_oam',await readPJ(),{label,oam:r.structuredContent});
 return r.structuredContent;
}
