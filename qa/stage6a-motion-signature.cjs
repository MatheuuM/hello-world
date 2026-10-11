'use strict';
/* MOVVA Stage 6A: reversible UI extraction, camera dolly and scroll-linked
   specular reflections. Chromium/WebKit, 1440 / 880 / 393 / 320 viewports.
   Test the origin/destination, reversibility and no copy or nav overlaps. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium';
const views=[['desktop',1440,900],['laptop',880,765],['phone',393,852],['small',320,667]];
const output=path.join('qa-motion6a',engine);
fs.mkdirSync(output,{recursive:true});
const report={engine,status:'RUNNING',checks:0,screenshots:[],errors:[],views:[]};
const nearly=(x,y,tol,label)=>assert.ok(Math.abs(x-y)<tol,label+': '+x+' / '+y);
const overlap=(a,b)=>{
 if(!a||!b)return 0;
 return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
        Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
};
(async()=>{
 let browser;
 try{
  browser=await({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
  for(const [label,width,height] of views){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
   page.on('pageerror',e=>report.errors.push(label+': '+e.message));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_MOTION_QA?.extractionEnabled,null,{timeout:30000});
   async function at(p){
    await page.evaluate(value=>__MOVVA_QA__.setProgress(value),p);
    await page.waitForFunction(value=>Math.abs(__MOVVA_QA__.progress-value)<.001,p,{timeout:24000});
    await page.waitForTimeout(75);
    return page.evaluate(()=>{
     const card=document.querySelector('.motion-fragment[data-scene="2"][data-kind="training"]');
     const css=card.style;
     const phone=document.querySelector('#css3d-object');
     const glint=document.querySelector('.css3d-glint');
     const back=document.querySelector('.css3d-back');
     const deck=document.querySelector('.css3d-camera-deck');
     const scene=document.querySelector('.scene[aria-hidden="false"] .copy');
     const rect=el=>el?.getBoundingClientRect().toJSON();
     return {
      progress:__MOVVA_QA__.progress,
      card:{
       x:parseFloat(css.left),y:parseFloat(css.top),
       extraction:parseFloat(css.getPropertyValue('--movva-extraction')),
       anchorX:parseFloat(css.getPropertyValue('--movva-anchor-x')),
       anchorY:parseFloat(css.getPropertyValue('--movva-anchor-y')),
       depth:parseFloat(css.getPropertyValue('--movva-card-depth')),
       transform:css.transform,rect:rect(card),opacity:parseFloat(css.opacity)
      },
      model:phone.style.transform,
      frontLight:glint.style.getPropertyValue('--movva-sheen-x'),
      backLight:back.style.getPropertyValue('--movva-sheen-x'),
      cameraLight:deck.style.getPropertyValue('--movva-sheen-x'),
      copy:rect(scene),
      nav:rect(document.querySelector('.chapter-bar')),
      visibleCards:[...document.querySelectorAll('.motion-fragment')].filter(e=>getComputedStyle(e).visibility!=='hidden'&&+getComputedStyle(e).opacity>.3).map(e=>rect(e)),
      overflow:document.documentElement.scrollWidth-innerWidth
     };
    });
   }
   const start=await at(.305),finish=await at(.335),midBack=await at(.178),replay=await at(.305);
   assert.ok(Number.isFinite(start.card.extraction)&&start.card.extraction>=0&&start.card.extraction<.65,JSON.stringify(start.card));
   assert.ok(finish.card.extraction>.98,JSON.stringify(finish.card));
   const dist=s=>Math.hypot(s.card.x-s.card.anchorX,s.card.y-s.card.anchorY);
   assert.ok(dist(start)<dist(finish)*.76+1,'Card must emerge from phone before spreading');
   assert.ok(finish.card.depth>75,'Released card must lift above display');
   assert.ok(start.card.transform.includes('rotateY(')&&start.card.transform.includes('translateZ('));
   nearly(start.card.x,replay.card.x,3,'Reverse card X');
   nearly(start.card.y,replay.card.y,3,'Reverse card Y');
   nearly(start.card.extraction,replay.card.extraction,.065,'Reverse extraction');
   assert.ok(midBack.model.includes('scale('),'3D dolly missing');
   const match=midBack.model.match(/scale\(([0-9.]+)\)/);
   assert.ok(match&&+match[1]>1.015&&+match[1]<1.055,'Dolly scale outside controlled bounds: '+midBack.model);
   assert.ok(start.frontLight&&start.backLight&&start.cameraLight,'Scroll-driven specular layers missing');
   assert.notEqual(start.frontLight,finish.frontLight,'Studio glint does not scrub');
   assert.ok(Math.abs(start.overflow)<=1&&Math.abs(finish.overflow)<=1,'Horizontal overflow');
   for(const snapshot of [start,finish,midBack]){
    for(const r of snapshot.visibleCards){
     const area=Math.max(1,r.width*r.height);
     if(snapshot.copy&&+snapshot.card.opacity>.3)
      assert.ok(overlap(r,snapshot.copy)/area<.045,'Card hides chapter copy');
     if(snapshot.nav)assert.ok(overlap(r,snapshot.nav)/area<.045,'Card hides chapter navigation');
    }
   }
   report.checks+=14;
   report.views.push({viewport:label,earlyExtraction:+start.card.extraction.toFixed(3),lateExtraction:+finish.card.extraction.toFixed(3),emergenceDistance:+dist(start).toFixed(1),releasedDistance:+dist(finish).toFixed(1),dolly:+match[1]});
   if(!process.env.QA_NO_CAPTURE && ['desktop','phone'].includes(label)){
    for(const [name,p] of [['emerge',.305],['settled',.335],['rear',.178]]){
     await at(p);
     const filename=label+'-'+name+'.png';
     await page.screenshot({path:path.join(output,filename),timeout:22000,animations:'disabled'});
     report.screenshots.push(filename);
    }
   }
   console.log('PASS',engine,label,'screen extraction, dolly and reversibility');
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS_TECHNICAL_VISUAL_REVIEW_PENDING';
 }catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
 finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({engine,status:report.status,checks:report.checks,views:report.views,shots:report.screenshots.length,error:report.failure}));
 }
})();