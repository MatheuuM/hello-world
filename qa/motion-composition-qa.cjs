'use strict';
/* MOVVA Motion 4A — decorative cards may never cover important chapter copy. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

const engine=process.env.QA_ENGINE||'chromium';
const root=path.join('qa-motion',engine);
const sizes=[['desktop',1440,900],['laptop',880,765],['mobile',393,852],['small',320,667]];
const stops=[.042,.178,.336,.512,.674,.842,.970];
const result={engine,status:'RUNNING',sampleCount:0,failures:[],screenshots:[],errors:[]};
fs.mkdirSync(root,{recursive:true});
const areaIntersect=(a,b)=>{
 const x=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
 const y=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 return x*y;
};
(async()=>{
 let browser;
 try{
  browser=await({chromium,webkit})[engine].launch({
   headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]
  });
  for(const [size,width,height] of sizes){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
   page.on('pageerror',error=>result.errors.push(String(error)));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_MOTION,null,{timeout:25000});
   for(const p of stops){
    await page.evaluate(value=>__MOVVA_QA__.setProgress(value),p);
    await page.waitForFunction(value=>Math.abs(__MOVVA_QA__.progress-value)<.001,p,{timeout:20000});
    await page.waitForTimeout(110);
    const state=await page.evaluate(()=>{
     const active=document.querySelector('.scene[aria-hidden="false"] .copy');
     const copy=active?.getBoundingClientRect();
     const nav=document.querySelector('.chapter-bar')?.getBoundingClientRect();
     const visible=[...document.querySelectorAll('.motion-fragment')]
      .filter(el=>getComputedStyle(el).visibility!=='hidden'&&+getComputedStyle(el).opacity>.3)
      .map(el=>({kind:el.dataset.kind,rect:el.getBoundingClientRect().toJSON()}));
     return{copy:copy?.toJSON(),nav:nav?.toJSON(),cards:visible,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    result.sampleCount++;
    if(Math.abs(state.overflow)>1)result.failures.push({size,p,issue:'horizontal overflow',px:state.overflow});
    for(const {kind,rect} of state.cards){
     const area=Math.max(1,rect.width*rect.height);
     const copyRatio=state.copy?areaIntersect(rect,state.copy)/area:0;
     const navRatio=state.nav?areaIntersect(rect,state.nav)/area:0;
     const visibleRatio=areaIntersect(rect,{left:0,top:0,right:width,bottom:height})/area;
     if(copyRatio>.02||navRatio>.02||visibleRatio<.97){
      result.failures.push({size,p,kind,copyRatio:+copyRatio.toFixed(3),navRatio:+navRatio.toFixed(3),offscreenRatio:+(1-visibleRatio).toFixed(3)});
     }
    }
    if((size==='laptop'&&[.042,.674].includes(p))||(size==='mobile'&&p===.512)){
     const shot=size+'-'+p.toFixed(3)+'.png';
     await page.screenshot({path:path.join(root,shot),timeout:18000});
     result.screenshots.push(shot);
    }
   }
   await page.close();
  }
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.failures,[]);
  result.status='PASS_COMPOSITION_VISUAL_REVIEW_PENDING';
 }catch(e){
  result.status='FAIL';result.failure=e.stack||String(e);process.exitCode=1;
 }finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({engine,status:result.status,samples:result.sampleCount,screenshots:result.screenshots.length,failures:result.failures,failure:result.failure},null,2));
 }
})();
