'use strict';
/* MOVVA Stage 5A: prevent redundant CSS3D recalculation while preserving
   screenshots, proportions, chapter navigation and reversible scroll.
   This asserts DOM behavior, not real-device FPS. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium',out='qa-stage5a/'+engine;
const variants=[['desktop',1440,900],['mobile',393,852],['small',320,667]]
 .filter(([label])=>!process.env.QA_VIEWPORT||process.env.QA_VIEWPORT===label);
const report={engine,status:'RUNNING',views:[],errors:[],screenshots:[]};
fs.mkdirSync(out,{recursive:true});
(async()=>{
let browser;
try{
 browser=await({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 for(const [label,width,height] of variants){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<=760,hasTouch:width<=760});
  page.on('pageerror',e=>report.errors.push(label+': '+e.message));
  await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_DOM_DEVICE?.metrics&&window.MOVVA_MOTION_QA,null,{timeout:30000});
  async function move(p){
   await page.evaluate(x=>__MOVVA_QA__.setProgress(x),p);
   await page.waitForTimeout(160);
   await page.waitForFunction(x=>Math.abs(__MOVVA_QA__.progress-x)<.003,p,{timeout:28000});
   return page.evaluate(()=>{
    const rig=document.querySelector('#css3d-device'),m=MOVVA_DOM_DEVICE.metrics;
    return {progress:__MOVVA_QA__.progress,screen:rig.dataset.screen,chapter:Number(rig.dataset.chapter),
     active:MOVVA_3D_STATUS().active,engine:MOVVA_3D_STATUS().engine,metrics:m,
     layout:MOVVA_MOTION_QA.layoutMeasurements,size:[MOVVA_SHELL.width,MOVVA_SHELL.height],
     overflow:document.documentElement.scrollWidth-innerWidth};
   });
  }
  const training=await move(.335);
  assert.equal(training.screen,'training');
  assert.ok(training.active&&training.engine==='CSS3D DOM');
  assert.ok(training.metrics.renders>=training.metrics.sizeWrites);
  assert.ok(Math.abs(training.size[0]/training.size[1]-78/163.4)<.002);
  assert.ok(Math.abs(training.overflow)<=1);
  const nearby=await move(.365);
  assert.equal(nearby.screen,'training');
  assert.equal(nearby.metrics.screenWrites,training.metrics.screenWrites,'same screen repainted unnecessarily');
  if(label==='desktop')assert.equal(nearby.metrics.sizeWrites,training.metrics.sizeWrites,'static desktop hardware dimensions invalidated');
  const nutrition=await move(.512);
  assert.equal(nutrition.screen,'nutrition');
  assert.equal(nutrition.metrics.screenWrites,nearby.metrics.screenWrites+1,'nutrition texture did not change exactly once');
  const evolution=await move(.670);
  assert.equal(evolution.screen,'evolution');
  const circle=await move(.842);
  assert.equal(circle.screen,'circle');
  const back=await move(.335);
  assert.equal(back.screen,'training','reverse scroll did not restore correct screenshot');
  assert.ok(back.layout<=5,'card layout was read too often per viewport: '+back.layout);
  assert.ok(back.metrics.sizeWrites<=back.metrics.renders,'more size writes than rendered frames');
  if(width<=760)assert.ok(back.size[0]<=width*.54+1,'mobile handset exceeds width limit');
  if(!process.env.QA_NO_CAPTURE){
   const shot=label+'-nutrition.png';
   await move(.512);await page.screenshot({path:path.join(out,shot),timeout:20000});
   report.screenshots.push(shot);
  }
  report.views.push({label,checks:13,layoutMeasurements:back.layout,metrics:back.metrics,
    screens:['training','nutrition','evolution','circle','training']});
  console.log('PASS',engine,label,JSON.stringify(report.views[report.views.length-1]));
  await page.close();
 }
 assert.deepEqual(report.errors,[]);
 report.status='PASS_STRUCTURAL_VISUAL_REVIEW_REQUIRED';
}catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
finally{
 await browser?.close().catch(()=>{});
 fs.writeFileSync(path.join(out,'report-'+(process.env.QA_VIEWPORT||'all')+'.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({engine,status:report.status,views:report.views,errors:report.errors,failure:report.failure}));
}
})();