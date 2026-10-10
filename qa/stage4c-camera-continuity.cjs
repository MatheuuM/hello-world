'use strict';
// Stage 4C: camera remains continuous when a chapter switches.
// Regression baseline: 662px teleports at .280 and .593 on 1440px desktop.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium';
const sizes=[['desktop',1440,900],['laptop',880,765],['mobile',393,852],['small',320,667]]
 .filter(([name])=>!process.env.QA_VIEWPORT||process.env.QA_VIEWPORT===name);
const cuts=[.129,.28,.433,.593,.773,.939];
const moveEdges=[.216,.334,.532,.653,.717,.831,.906,.983];
const samples=[...new Set([...cuts,...moveEdges])];
const out='qa-stage4c/'+engine,report={engine,status:'RUNNING',views:[],errors:[],screenshots:[]};
fs.mkdirSync(out,{recursive:true});
const fail=(name,val,limit)=>assert.ok(val<=limit,name+': measured '+val+', limit '+limit);
(async()=>{
 let browser;
 try{
  browser=await({chromium,webkit})[engine].launch({
   headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]
  });
  for(const [name,width,height] of sizes){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
   page.on('pageerror',e=>report.errors.push(name+': '+e.message));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_DOM_DEVICE?.render,null,{timeout:26000});
   // This is a *geometry continuity* test. Sample the deterministic DOM camera
   // directly so Safari scroll-event scheduling cannot quantize the endpoints.
   // Real scroll/visibility and browser screenshots remain covered by 4A/4B QA.
   async function sample(p){
    return page.evaluate(value=>{
     const thresholds=[.129,.28,.433,.593,.773,.939];
     const chapter=thresholds.filter(cut=>value>=cut).length;
     const screen=Math.max(0,Math.min(4,chapter-1));
     MOVVA_DOM_DEVICE.render(value,chapter,screen,0);
     const rig=document.querySelector('#css3d-device');
     const state=MOVVA_3D_STATUS();
     return{
      p:value,chapter:Number(rig.dataset.chapter),
      frame:{x:parseFloat(rig.style.left),y:parseFloat(rig.style.top),
       width:parseFloat(rig.style.width),height:parseFloat(rig.style.height)},
      engine:state.engine,enabled:state.active,
      overflow:document.documentElement.scrollWidth-innerWidth
     };
    },p);
   }
   let maxDistance=0,maxSizeChange=0,checks=0;
   const events=[],seen=new Map();
   for(const p of samples){
    const a=await sample(p-.002),b=await sample(p+.002);
    for(const s of [a,b]){
     assert.ok(s.enabled&&s.engine==='CSS3D DOM','3D unavailable: '+JSON.stringify(s));
     assert.ok(Math.abs(s.frame.width/s.frame.height-78/163.4)<.002,'Pro Max ratio lost');
     fail('horizontal overflow',Math.abs(s.overflow),1);
     if(width<=760)fail('mobile width limit',s.frame.width,width*.54+1);
    }
    const distance=Math.hypot(b.frame.x-a.frame.x,b.frame.y-a.frame.y);
    const dh=Math.abs(b.frame.height-a.frame.height);
    fail('phone teleport at '+p,distance,Math.max(22,width*.042));
    fail('phone resize jump at '+p,dh,Math.max(23,height*.046));
    maxDistance=Math.max(maxDistance,distance);maxSizeChange=Math.max(maxSizeChange,dh);
    checks+=2;
    events.push({p,oldChapter:a.chapter,newChapter:b.chapter,
     centerDelta:+distance.toFixed(2),heightDelta:+dh.toFixed(2)});
   }
   for(const p of [.18,.335,.67,.842,.97,.335,.18]){
    const state=await sample(p);
    const old=seen.get(p);
    if(old){
     fail('rewind X '+p,Math.abs(old.x-state.frame.x),5);
     fail('rewind Y '+p,Math.abs(old.y-state.frame.y),5);
     fail('rewind height '+p,Math.abs(old.height-state.frame.height),5);
    }else seen.set(p,state.frame);
    checks++;
   }
   if(!process.env.QA_NO_CAPTURE){
    await sample(.28);
    const shot=name+'-crossing.png';
    await page.screenshot({path:path.join(out,shot),timeout:20000});
    report.screenshots.push(shot);
   }
   report.views.push({name,checks,maxDistance:+maxDistance.toFixed(2),
    maxHeightJump:+maxSizeChange.toFixed(2),cutEvents:events});
   console.log('PASS',engine,name,checks,'maxShift',maxDistance.toFixed(2),'maxHeight',maxSizeChange.toFixed(2));
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS_TECHNICAL_VISUAL_REVIEW_PENDING';
 }catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1;}
 finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(out,'report-'+(process.env.QA_VIEWPORT||'all')+'.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({engine,status:report.status,views:report.views,shots:report.screenshots.length,failure:report.failure}));
 }
})();
