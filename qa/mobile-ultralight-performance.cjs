'use strict';
// Controlled software-rendered stress comparison. NOT physical iPhone FPS.
// Source baseline is the last published master commit, candidate is this branch.
const { chromium, webkit } = require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium';
const report={engine,head:process.env.GITHUB_SHA,baselineSha:'309278fbcf1939ea2363c636a712fd51dd608513',views:[],errors:[],status:'START'};
const out=path.join('qa-ultralight',engine);fs.mkdirSync(out,{recursive:true});
const percent=(a,p)=>a.length?+a[Math.min(a.length-1,Math.floor(a.length*p))].toFixed(2):null;
function summarize(frames){
 const a=frames.filter(v=>Number.isFinite(v)&&v>0).sort((x,y)=>x-y);
 return {frames:a.length,p50:percent(a,.50),p95:percent(a,.95),max:a.length?+a[a.length-1].toFixed(2):null,over50:a.filter(v=>v>50).length,over100:a.filter(v=>v>100).length};
}
async function scrub(page,seconds){
 return page.evaluate(async ms=>{
  const experience=document.getElementById('experience'),stage=document.getElementById('stage');
  const startTop=experience.offsetTop,travel=experience.offsetHeight-stage.clientHeight;
  const runs=[];
  for (const [from,to] of [[0,1],[1,0]]) {
   const deltas=[];
   await new Promise(resolve=>{
    let origin=null,previous=null;
    function step(t){
     if(origin===null)origin=t;
     if(previous!==null)deltas.push(t-previous);
     previous=t;
     const n=Math.min(1,(t-origin)/ms),p=from+(to-from)*n;
     scrollTo(0,startTop+p*travel);
     if(n>=1){resolve();return;}
     requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
   });
   runs.push(deltas);
  }
  return runs;
 },seconds*1000);
}
(async()=>{
 let browser;
 try{
  browser=await ({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
  for(const [view,w,h] of [['iphone',393,852],['promax',440,956]]) {
   const results={view,w,h};
   for(const mode of ['baseline','candidate']){
    const context=await browser.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(mode+'/'+view+': '+e.message));
    page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:807')&&r.status()>=400)report.errors.push(mode+'/'+view+' HTTP '+r.status()+' '+r.url())});
    await page.goto('http://127.0.0.1:'+(mode==='baseline'?'8078':'8077')+'/',{waitUntil:'load',timeout:35000});
    await page.waitForFunction(()=>window.__MOVVA_QA__?.ready===true&&window.MOVVA_SHELL?.partCount>30,null,{timeout:35000});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(220);
    const count=await page.evaluate(()=>({
     renderedFaces:[...document.querySelectorAll('.css3d-shell-face,.css3d-camera-wall-face')].filter(x=>getComputedStyle(x).display!=='none').length,
     litePlanes:[...document.querySelectorAll('.css3d-fast-edge')].filter(x=>getComputedStyle(x).display!=='none').length,
     engine:MOVVA_3D_STATUS().engine,
     legacy:MOVVA_SHELL.legacyGeometry||false
    }));
    const start=await page.evaluate(()=>MOVVA_DOM_DEVICE.metrics);
    const samples=await scrub(page,2.7);
    const end=await page.evaluate(()=>({
      metrics:MOVVA_DOM_DEVICE.metrics,
      overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
      progress:__MOVVA_QA__.progress,ready:__MOVVA_QA__.ready,
      count:document.querySelectorAll('.motion-fragment').length,
      scrollY:window.scrollY
    }));
    const stats={geometry:count,forward:summarize(samples[0]),backward:summarize(samples[1]),layoutReads:(end.metrics.layoutReads??null),startLayoutReads:start.layoutReads??null,metrics:end.metrics,overflow:end.overflow,progress:end.progress,cardCount:end.count,ready:end.ready};
    assert.ok(end.ready && end.count===12 && Math.abs(end.overflow)<=1,JSON.stringify(stats));
    assert.equal(count.engine,'CSS3D DOM');
    assert.ok(stats.forward.frames>4 && stats.backward.frames>4,'rendering nearly stalled '+mode+'/'+view);
    results[mode]=stats;
    try{await page.screenshot({path:path.join(out,view+'-'+mode+'.png'),timeout:8000});}catch(e){report.errors.push('Optional screenshot: '+e.message.slice(0,100));}
    await context.close();
    console.log('SAMPLE',engine,view,mode,JSON.stringify({geometry:count,forward:stats.forward,backward:stats.backward,layoutReads:stats.layoutReads,overflow:stats.overflow}));
   }
   assert.equal(results.candidate.geometry.litePlanes,4,'fast geometry not active');
   assert.equal(results.candidate.geometry.renderedFaces,0,'legacy facets still composited');
   assert.ok(results.baseline.geometry.renderedFaces>=70,'baseline geometry changed');
   assert.ok(results.candidate.layoutReads===null || results.candidate.layoutReads<=5,'geometry is remeasured per frame');
   report.views.push(results);
  }
  // Actual scene and Safari narrow side profile after the optimized scroll.
  const ctx=await browser.newContext({viewport:{width:320,height:667},isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.MOVVA_SHELL&&window.__MOVVA_QA__?.ready,null,{timeout:30000});
  for(const p of [.135,.35,.64,.85,0]){
   await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);
   await page.waitForFunction(p=>Math.abs(__MOVVA_QA__.progress-p)<.001,p,{timeout:12000});
   const state=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-innerWidth,
    source:MOVVA_MOTION_QA?.cards,
    phone:document.getElementById('css3d-device').getBoundingClientRect().width,
    active:document.querySelector('.css3d-profile-active')!==null
   }));
   assert.ok(Math.abs(state.overflow)<=1 && state.source===12 && state.phone>0,JSON.stringify(state));
  }
  await ctx.close();
  assert.equal(report.errors.filter(s=>!s.startsWith('Optional screenshot')).length,0,JSON.stringify(report.errors));
  report.status='PASS';
 }catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1;}
 finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('MOVVA_ULTRALIGHT_REPORT '+JSON.stringify(report));
 }
})();
