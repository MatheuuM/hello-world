'use strict';
// Stage 5B: legible editorial cards, including 320px, with unchanged scroll
// choreography, preserved app data and intact chapter copy.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium';
const out=path.join('qa-stage5b',engine);
const scenes=[['connected',.178],['training',.335],['nutrition',.512],['evolution',.67],['circle',.842]];
const viewports=[['desktop',1440,900],['mobile',393,852],['small',320,667]];
const report={engine,status:'RUNNING',samples:0,cards:0,screenshots:[],errors:[],measurements:[]};
fs.mkdirSync(out,{recursive:true});
(async()=>{
 let browser;
 try{
  browser=await({chromium,webkit})[engine].launch({
   headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]
  });
  for(const [name,width,height] of viewports){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<761,hasTouch:width<761});
   page.on('pageerror',e=>report.errors.push(name+': '+e.message));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_MOTION_QA,null,{timeout:25000});
   for(const [scene,progress] of scenes){
    await page.evaluate(p=>__MOVVA_QA__.setProgress(p),progress);
    await page.waitForFunction(p=>Math.abs(__MOVVA_QA__.progress-p)<.001,progress,{timeout:19000});
    await page.waitForTimeout(140);
    const data=await page.evaluate(()=>{
     const cards=[...document.querySelectorAll('.motion-fragment')].filter(el=>{
      const style=getComputedStyle(el);return style.visibility!=='hidden'&&+style.opacity>.3;
     });
     const font=el=>el?parseFloat(getComputedStyle(el).fontSize):null;
     return {
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      cards:cards.map(el=>{
       const r=el.getBoundingClientRect();
       return {kind:el.dataset.kind,eye:font(el.querySelector('.fragment-eyebrow')),
        sub:font(el.querySelector('.subline')),h3:font(el.querySelector('h3')),
        metric:font(el.querySelector('strong')),
        width:r.width,height:r.height,layoutOverflowW:el.scrollWidth-el.clientWidth,
        layoutOverflowH:el.scrollHeight-el.clientHeight};
      })
     };
    });
    report.samples++;
    assert.ok(Math.abs(data.pageOverflow)<=1,name+' '+scene+' horizontal page overflow');
    assert.equal(data.cards.length,2,name+' '+scene+' card count regression');
    const limit=name==='small'?{eye:7.9,sub:8.4,h3:9.9}:name==='mobile'?
      {eye:8.9,sub:9.4,h3:10.9}:{eye:9.9,sub:10.9,h3:12.9};
    for(const card of data.cards){
     report.cards++;
     assert.ok(card.eye>=limit.eye,name+' '+card.kind+' eyebrow illegible: '+card.eye);
     if(card.sub!==null)assert.ok(card.sub>=limit.sub,name+' '+card.kind+' supporting text too small: '+card.sub);
     if(card.h3!==null)assert.ok(card.h3>=limit.h3,name+' '+card.kind+' heading too small: '+card.h3);
     assert.ok(card.width>65&&card.height>55,name+' '+card.kind+' invisible card');
     assert.ok(card.layoutOverflowW<=3,name+' '+card.kind+' content overflows horizontally by '+card.layoutOverflowW);
     assert.ok(card.layoutOverflowH<=3,name+' '+card.kind+' content clipped vertically by '+card.layoutOverflowH);
    }
    report.measurements.push({viewport:name,scene,cards:data.cards.map(c=>({kind:c.kind,eye:c.eye,sub:c.sub,w:+c.width.toFixed(1),h:+c.height.toFixed(1)}))});
    if(!process.env.QA_NO_CAPTURE&&['mobile','small'].includes(name)&&['training','nutrition'].includes(scene)){
     const image=name+'-'+scene+'.png';
     await page.screenshot({path:path.join(out,image),timeout:18000});
     report.screenshots.push(image);
    }
   }
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS_TECHNICAL_VISUAL_REVIEW_REQUIRED';
 }catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
 finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({engine,status:report.status,samples:report.samples,cards:report.cards,
   screenshots:report.screenshots.length,failures:report.failure||null,measurements:report.measurements.slice(0,5)}));
 }
})();
