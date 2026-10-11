'use strict';
/* MOVVA Stage 6B cross-version visual parity guard.
 * Compares text content and layout against the exact previous production
 * commit in the same headless Chromium runner; static copy must not be lost. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const scenes=[['hero',.042],['connected',.178],['training',.335],
 ['nutrition',.512],['evolution',.670],['circle',.842],['finale',.982]];
const views=[['desktop',1440,900],['laptop',880,765],['phone',393,852],['small',320,667]];
const ports=[['baseline',8078],['candidate',8077]];
const result={status:'RUNNING',cases:[],failures:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 for(const [view,width,height] of views){
  const pages={};
  for(const [key,port] of ports){
   const p=await browser.newPage({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
   p.on('pageerror',e=>result.errors.push(key+' '+view+': '+e.message));
   await p.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load',timeout:25000});
   await p.waitForFunction(()=>window.__MOVVA_QA__?.ready,{timeout:24000});
   pages[key]=p;
  }
  for(const [scene,target] of scenes){
   const entries={};
   for(const [key,page] of Object.entries(pages)){
    await page.evaluate(progress=>__MOVVA_QA__.setProgress(progress),target);
    await page.waitForFunction(progress=>Math.abs(__MOVVA_QA__.progress-progress)<.002,target,{timeout:29000});
    const entry=await page.evaluate(()=>{
     const active=document.querySelector('.scene[aria-hidden="false"]');
     const copy=active?.querySelector('.copy');
     const title=copy?.querySelector('h1,h2');
     const box=e=>{const r=e.getBoundingClientRect();return {
      x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}};
     return{scene:active?.id||null,
      text:title?.textContent?.replace(/\s+/g,' ').trim(),
      title:box(title),copy:box(copy),overflow:document.documentElement.scrollWidth-innerWidth};
    });
    entries[key]=entry;
   }
   const a=entries.baseline,b=entries.candidate;
   const delta={titleH:+(b.title.h-a.title.h).toFixed(2),
    titleY:+(b.title.y-a.title.y).toFixed(2),
    copyH:+(b.copy.h-a.copy.h).toFixed(2),
    copyX:+(b.copy.x-a.copy.x).toFixed(2)};
   const issue=[];
   if(a.text!==b.text)issue.push('title-copy-changed');
   if(a.scene!==b.scene)issue.push('active-scene-changed');
   if(Math.abs(delta.titleH)>5)issue.push('title-height-shift');
   if(Math.abs(delta.titleY)>7)issue.push('title-vertical-shift');
   if(Math.abs(delta.copyH)>12)issue.push('copy-height-shift');
   if(Math.abs(b.overflow)>1)issue.push('horizontal-overflow');
   const row={view,scene,delta,issues:issue};
   result.cases.push(row);
   if(issue.length)result.failures.push(row);
   console.log(JSON.stringify(row));
  }
  await Promise.all(Object.values(pages).map(p=>p.close()));
 }
 assert.deepEqual(result.errors,[]);
 assert.deepEqual(result.failures,[]);
 result.status='PASS';
 }catch(e){result.status='FAIL';result.error=e.stack||String(e);process.exitCode=1}
 finally{
  await browser.close();
  fs.mkdirSync('qa-visual-parity',{recursive:true});
  fs.writeFileSync('qa-visual-parity/report.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:result.status,cases:result.cases.length,failures:result.failures,error:result.error}));
 }
})();
