'use strict';
/* MOVVA runtime guard: costly WebGL projection is not calculated while the
 * default CSS3D renderer is active. This is an architectural test, NOT a
 * physical iPhone or desktop FPS claim. */
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const engine=process.env.QA_ENGINE||'chromium';
const views=[['desktop',1440,900],['phone',393,852]];
const dir=path.join('qa-perf-guard',engine);fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await({chromium,webkit})[engine].launch({headless:true,
  args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 const summary=[];
 try{
  for(const [name,width,height] of views){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.MOVVA_3D_STATUS?.().active&&window.MOVVA_DOM_DEVICE?.active,null,{timeout:30000});
   await page.evaluate(()=>{
    window.__MOVVA_FIT_CALLS=0;
    const original=MOVVA_INTRO.fit;
    MOVVA_INTRO.fit=function(...args){window.__MOVVA_FIT_CALLS++;return original.apply(this,args);};
   });
   for(const p of [.178,.335,.512,.670,.842]){
    await page.evaluate(v=>__MOVVA_QA__.setProgress(v),p);
    await page.waitForFunction(v=>Math.abs(__MOVVA_QA__.progress-v)<.002,p,{timeout:24000});
   }
   const data=await page.evaluate(()=>{
    const walls=[...document.querySelectorAll('.css3d-camera-wall-face')];
    return {fitCalls:__MOVVA_FIT_CALLS,
      renderer:MOVVA_3D_STATUS().engine,
      active:MOVVA_3D_STATUS().active,
      cameraWallCount:walls.length,
      wallFilters:walls.filter(e=>getComputedStyle(e).filter!=='none').length,
      cardBackdrop:getComputedStyle(document.querySelector('.motion-fragment')).backdropFilter,
      frameMetrics:MOVVA_DOM_DEVICE.metrics,
      layoutMeasurements:MOVVA_MOTION_QA.layoutMeasurements,
      errorPageOverflow:document.documentElement.scrollWidth-innerWidth
    };
   });
   assert.equal(data.fitCalls,0,'Unexpected WebGL projection during CSS3D scroll');
   assert.equal(data.renderer,'CSS3D DOM');
   assert.ok(data.active);
   assert.equal(data.cameraWallCount,width<761?36:48);
   assert.equal(data.wallFilters,0,'Camera still incurs per-face CSS filter passes');
   if(width<761)assert.equal(data.cardBackdrop,'none','Mobile cards still blur behind translucent paper');
   assert.ok(Math.abs(data.errorPageOverflow)<=1);
   assert.deepEqual(errors,[]);
   summary.push({viewport:name,...data});
   await page.close();
   console.log('PASS '+engine+' '+name+' no unused WebGL projection');
  }
 }catch(e){console.error(e.stack);process.exitCode=1;}
 finally{
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({engine,views:summary}));
  await browser.close();
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1});
