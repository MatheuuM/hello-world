'use strict';
/* MOVVA 6B: test editorial scroll choreography without a second animation loop.
 * Checks user-visible title integrity, canonical data, Circle links and
 * exactly repeatable reverse scrolling at 320/393/880/1440 viewports. */
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const engine=process.env.QA_ENGINE||'chromium';
const views=[['desktop',1440,900],['laptop',880,765],['phone',393,852],['small',320,667]]
.filter(([name])=>!process.env.QA_VIEWPORT||process.env.QA_VIEWPORT===name);
const folder='qa-motion6b/'+engine;
fs.mkdirSync(folder,{recursive:true});
const report={engine,status:'RUNNING',views:[],screenshots:[],errors:[]};
const positions=[
 ['nutrition-early',.455],['nutrition-middle',.510],['nutrition-full',.552],
 ['evolution-early',.671],['evolution-full',.735],
 ['circle-early',.815],['circle-full',.876],
 ['finale-early',.947],['finale-full',.992],
 ['rewind-circle',.815],['rewind-nutrition',.455]
];
(async()=>{
 let browser;
 try{
  browser=await({chromium,webkit})[engine].launch({
   headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]
  });
  for(const [name,width,height] of views){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
   page.on('pageerror',e=>report.errors.push(name+': '+String(e)));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_CHAPTER_MOTION?.sections,null,{timeout:30000});
   const sections=await page.evaluate(()=>MOVVA_CHAPTER_MOTION.sections);
   assert.equal(sections.length,7);
   assert.ok(sections.every(s=>s.lines>=2),'Missing heading line elements: '+JSON.stringify(sections));
   async function at(p){
    await page.evaluate(v=>__MOVVA_QA__.setProgress(v),p);
    await page.waitForFunction(v=>Math.abs(__MOVVA_QA__.progress-v)<.0015,p,{timeout:25000});
    await page.waitForTimeout(140);
    return page.evaluate(()=>{
     const nutrient=document.querySelector('.motion-fragment[data-kind="nutrition"]');
     const rings=[...nutrient.querySelectorAll('.m-nut-rings .nr i')].map(el=>parseFloat(el.style.getPropertyValue('--value')));
     const meter=parseFloat(nutrient.querySelector('.m-meter i').style.width);
     const graph=document.querySelector('.movva-graph-marker');
     const circle=[...document.querySelectorAll('.movva-circle-connection')].map(x=>parseFloat(x.style.strokeDashoffset));
     const heading=document.querySelector('#nutrition h2');
     const finale=document.querySelector('#rhythm h2');
     const line=[...heading.querySelectorAll('.movva-editorial-line')].map(x=>parseFloat(x.style.getPropertyValue('--movva-reveal')));
     return {p:__MOVVA_QA__.progress,rings,meter,circle,line,
      graph:graph?.style.transform,
      graphOpacity:+(graph?.style.opacity||0),
      finale:+(finale.style.getPropertyValue('--movva-finale-progress')||0),
      headingText:heading.textContent,
      allHeadings:[...document.querySelectorAll('.scene .copy h1,.scene .copy h2')].map(x=>x.textContent),
      overflow:document.documentElement.scrollWidth-innerWidth,
      state:MOVVA_3D_STATUS(),
      metrics:MOVVA_CHAPTER_MOTION.metrics};
    });
   }
   const samples={};
   for(const [key,p] of positions)samples[key]=await at(p);
   const n=samples;
   assert.ok(n['nutrition-early'].rings.every(v=>v<=.01),'Nutrition rings not reset at start');
   assert.ok(n['nutrition-full'].rings[0]>=310&&n['nutrition-full'].rings[0]<=320.1);
   assert.ok(n['nutrition-full'].meter>=85&&n['nutrition-full'].meter<=86.1);
   assert.ok(n['rewind-nutrition'].rings.every(v=>v<=.01),'Nutrition rings not reversible');
   assert.ok(n['nutrition-middle'].rings[0]>10&&n['nutrition-middle'].rings[0]<320);
   assert.notEqual(n['evolution-early'].graph,n['evolution-full'].graph,'Graph tracer static');
   assert.ok(n['evolution-full'].graph.includes('translate('));
   assert.equal(n['circle-early'].circle.length,4);
   assert.ok(n['circle-early'].circle.every(v=>Number.isFinite(v)));
   assert.ok(n['circle-full'].circle.every(v=>v<=.01),'Circle connections not drawn');
   for(let i=0;i<4;i++)assert.ok(Math.abs(n['circle-early'].circle[i]-n['rewind-circle'].circle[i])<.10,'Circle not reversible');
   assert.ok(n['finale-early'].finale<.45&&n['finale-full'].finale>=.99);
   assert.ok(n['nutrition-full'].line.every(v=>v>.99),'Nutrition title not fully revealed');
   assert.equal(n['nutrition-full'].headingText,n['rewind-nutrition'].headingText,'Heading content mutated');
   assert.ok(n['nutrition-full'].allHeadings.some(x=>x.includes('MOVVA')),'Heading text lost');
   assert.ok(Object.values(samples).every(x=>Math.abs(x.overflow)<=1&&x.state.active),'Overflow or renderer failed');
   const values=n['nutrition-full'].metrics;
   assert.ok(values.renders>=positions.length,'Chapter renderer not attached to scroll');
   if(!process.env.QA_NO_CAPTURE){
    for(const [key,p] of [['nutrition',.510],['evolution',.705],['circle',.856],['finale',.992]]){
     await at(p);
     const filename=name+'-'+key+'.png';
     await page.screenshot({path:path.join(folder,filename),animations:'disabled',timeout:19000});
     report.screenshots.push(filename);
    }
   }
   report.views.push({viewport:name,checks:21,snapshot:{
    nutritionEnd:n['nutrition-full'].rings,closing:n['finale-full'].finale,
    circle:n['circle-full'].circle,headingSections:sections.length}});
   console.log('PASS '+engine+' '+name+' 21 checks');
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS_CHAPTER_MOTION_VISUAL_REVIEW_PENDING';
 }catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1;}
 finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({engine,status:report.status,views:report.views,screenshots:report.screenshots.length,error:report.failure}));
 }
})();