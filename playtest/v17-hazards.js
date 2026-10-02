async function hazardFlagsPJ(label) {
 const r=await Promise.all([tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",bank:1,offset:1584,length:112}),tools.mcp__modretro_chromatic__emulator_inspect({view:"memory",region:"wram",bank:1,offset:1808,length:112}),tools.mcp__modretro_chromatic__emulator_inspect({view:"oam",visibleOnly:true,limit:40,includeScanlineSummary:true})]);
 const bytes=r.slice(0,2).map(x=>x.structuredContent.hex.match(/../g).map(h=>parseInt(h,16)));
 const flags={icicle:bytes[0][0],icicleMarker:bytes[0][56],meteor:bytes[1][0],meteorMarker:bytes[1][56]};
 if(!(flags.icicleMarker&2)||!(flags.meteorMarker&2))throw Error('Marker visible '+JSON.stringify(flags));
 const s=await readPJ();evidencePJ('hazard_visibility',s,{label,flags,oam:r[2].structuredContent});return flags;
}
async function inspectHazardPJ(i) {
 let s=await readPJ(),h=s.ice[i],kind=h.h===253?'icicle':'meteor';s=await approachPJ(h.x-100);
 if(s[kind].state!==1)throw Error('Expected delay '+JSON.stringify(s));
 let f=await hazardFlagsPJ(kind+'-silent-delay');
 if(!(f[kind]&2))throw Error('Pre-fall body visible');
 await capturePJ(kind+'-no-warning');
 await stepPJ([],1);
 const cp=await tools.mcp__modretro_chromatic__emulator_checkpoint({action:'save',label:kind+'-without-warning'});
 if(cp.isError)throw Error(JSON.stringify(cp));store('v17'+kind+'CP',cp.structuredContent);
 for(let n=0;n<26 && s[kind].state===1;n++){s=await stepPJ([],1);if(s[kind].state===1){f=await hazardFlagsPJ(kind+'-delay');if(!(f[kind]&2))throw Error('Pre-fall visible');}}
 s=await stepPJ([],3);f=await hazardFlagsPJ(kind+'-fall');
 if(s[kind].state!==2 || (kind==='icicle'&&(f.icicle&2)))throw Error('Missing falling '+JSON.stringify(s));
 await capturePJ(kind+'-falling');
 if(kind==='meteor'){s=await stepPJ([],8);f=await hazardFlagsPJ('meteor-visible');if(f.meteor&2)throw Error('Meteor hidden during visible fall');await capturePJ('meteor-visible-falling');}
 s=await stepPJ([],120);
 if(s.phase!==3||s.death!==(kind==='icicle'?6:8))throw Error('Contact not fatal '+JSON.stringify(s));
 evidencePJ(kind+'_contact_fatal',s);await capturePJ(kind+'-gameover');
 const back=await tools.mcp__modretro_chromatic__emulator_checkpoint({action:'restore',checkpointId:cp.structuredContent.checkpointId});
 if(back.isError)throw Error(JSON.stringify(back));text({kind,checkpoint:cp.structuredContent,death:s.death});
}
