'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
// Each group owns its browser and deadline. The original assertions are retained.
const group=process.env.QA_GROUP||'all';
assert.ok(['all','layout','sequence','regression','controls'].includes(group),'Unknown QA_GROUP');
const includes=name=>group==='all'||group===name;
const out=path.join('qa-intro-output',group);fs.mkdirSync(out,{recursive:true});
const started=Date.now();
const report={stage:4,version:'intro-stage4-1',group,commit:process.env.GITHUB_SHA||null,startedAt:new Date(started).toISOString(),checks:[],pageErrors:[],localErrors:[],images:[],fonts:[],events:[]};
let phase='launch',browser,closing=false;
const checkpoint=name=>{phase=name;console.log(new Date().toISOString(),'START',name);};
const save=()=>{report.phase=phase;report.elapsedSeconds=+( (Date.now()-started)/1000 ).toFixed(3);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));};
const check=(name,detail)=>{report.checks.push({name,pass:true,detail});console.log(new Date().toISOString(),'PASS',name);save();};
// The outer timeout remains a failure, never a successful or skipped test.
process.on('SIGTERM',()=>{report.status='FAIL';report.failure='External SIGTERM at '+phase;save();process.exit(124);});
const base=process.env.QA_URL||'http://127.0.0.1:8077';
const baselineURL=process.env.QA_BASELINE_URL||'http://127.0.0.1:8078';
async function run(){
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 browser.on('disconnected',()=>{if(!closing)report.events.push({event:'unexpected-browser-disconnect',phase,at:new Date().toISOString()});});
 const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});const page=await ctx.newPage();
 function observe(pg){pg.setDefaultTimeout(20000);pg.setDefaultNavigationTimeout(30000);pg.on('pageerror',e=>report.pageErrors.push(e.message));pg.on('crash',()=>report.events.push({event:'page-crash',phase,at:new Date().toISOString()}));pg.on('response',r=>{if((r.url().startsWith(base)||r.url().startsWith(baselineURL))&&r.status()>=400)report.localErrors.push(r.url());});}
 observe(page);
 async function ready(url){await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.fonts.status==='loaded',null,{timeout:20000,polling:100});await page.waitForFunction(()=>window.__MOVVA_QA__?.ready,null,{timeout:20000,polling:100});}
 checkpoint('candidate initialization');await ready(base);await page.waitForFunction(()=>window.MOVVA_INTRO?.layout,null,{timeout:20000});
 report.fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
 assert.equal(await page.evaluate(()=>__MOVVA_QA__.version),'intro-stage4-1');check('Five real textures and original 3D device initialize',await page.evaluate(()=>({objects:__MOVVA_QA__.meshCount,textures:__MOVVA_QA__.textureSizes})));
 async function move(p){checkpoint('scroll '+p+' '+page.url());await page.bringToFront();await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForFunction(p=>{const e=document.querySelector('#experience'),s=document.querySelector('#stage'),actual=Math.max(0,Math.min(1,(scrollY-e.offsetTop)/(e.offsetHeight-s.clientHeight)));return Math.abs(actual-p)<.00015&&Math.abs(__MOVVA_QA__.progress-actual)<.0000001;},p,{timeout:18000,polling:100});}
 async function shot(name){await page.screenshot({path:path.join(out,name+'.png'),timeout:20000});report.images.push(name+'.png');}
 async function metrics(){return page.evaluate(()=>{
  const stage=document.querySelector('#stage'),vw=stage.clientWidth,vh=stage.clientHeight,m=__MOVVA_QA__.modelMatrix,hh=14*Math.tan(32*Math.PI/360),hw=hh*vw/vh,xs=[],ys=[];
  for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){const tx=m[0]*x+m[4]*y+m[8]*z+m[12],ty=m[1]*x+m[5]*y+m[9]*z+m[13],tz=m[2]*x+m[6]*y+m[10]*z+m[14];xs.push((tx/(hw*(1-tz/14))+1)*vw/2);ys.push((1-ty/(hh*(1-tz/14)))*vh/2);}
  const device={x:Math.min(...xs),r:Math.max(...xs),y:Math.min(...ys),b:Math.max(...ys)},rect=e=>{const r=e.getBoundingClientRect();return{x:r.left,r:r.right,y:r.top,b:r.bottom}};
  return{viewport:[vw,vh],overflow:document.documentElement.scrollWidth>innerWidth,device,chapter:document.querySelector('#chapter-name').textContent,copy:[...document.querySelectorAll('.scene')].filter(s=>parseFloat(s.style.opacity)>.7).map(s=>rect(s.querySelector('.copy'))),nav:rect(document.querySelector('.header')),bar:rect(document.querySelector('.chapter-bar')),glError:document.querySelector('#world').getContext('webgl').getError(),matrix:__MOVVA_QA__.modelMatrix,progress:__MOVVA_QA__.progress};
 });}
 if(includes('layout')){
  const dims=[[320,667],[375,667],[393,852],[430,932],[768,1024],[1024,768],[1440,960],[1920,1080]];
  for(const [width,height] of dims){
   await page.setViewportSize({width,height});await page.waitForTimeout(250);
   for(const p of [.185,.335]){await move(p);const r=await metrics();await shot((p<.2?'connected-':'training-')+width+'x'+height);
    assert.equal(r.overflow,false,JSON.stringify(r));assert.equal(r.glError,0);
    assert.ok(r.device.x>=9&&r.device.r<=width-9&&r.device.y>=r.nav.b+7&&r.device.b<=r.bar.y-7,JSON.stringify(r));
    for(const c of r.copy){assert.ok(c.r<=width-14,JSON.stringify(r));if(width<=760)assert.ok(r.device.y>=c.b+10,JSON.stringify(r));else assert.ok(r.device.x>=c.r+8||r.device.r<=c.x-8,JSON.stringify(r));}
    check('Fit and readable copy '+width+'x'+height+' p='+p,r);
   }
  }
 }
 await page.setViewportSize({width:1440,height:960});await page.waitForTimeout(250);
 if(includes('sequence')){
  for(const p of [.08,.12,.145,.225,.255,.279,.30,.365,.410]){await move(p);await shot('sequence-'+p);check('Forward scene '+p,await metrics());}
  for(const p of [.12,.185,.279,.335,.405]){await move(p);const before=await metrics();await move(.45);await move(p);const after=await metrics();assert.ok(Math.max(...before.matrix.map((n,i)=>Math.abs(n-after.matrix[i])))<.001,JSON.stringify({p,before,after}));assert.equal(before.chapter,after.chapter);check('Reversible pose and chapter '+p);}
 }
 if(includes('regression')){
  // Same visible page for both revisions, with no background WebGL tab.
  const outside=[0,.04,.495,.68,.835,.975],candidate=new Map();
  const state=()=>page.evaluate(()=>({m:__MOVVA_QA__.modelMatrix,bg:document.querySelector('#stage').style.backgroundColor,score:document.querySelector('#score-number').textContent}));
  for(const p of outside){await move(p);candidate.set(p,await state());}
  checkpoint('immutable baseline initialization');await ready(baselineURL);
  report.baseline='a77e9fa2751fc7e2741bc221a5f79784eacb54e8';
  for(const p of outside){await move(p);const a=candidate.get(p),b=await state(),delta=Math.max(...a.m.map((v,i)=>Math.abs(v-b.m[i])));assert.ok(delta<.001,JSON.stringify({p,a,b}));assert.equal(a.bg,b.bg);assert.equal(a.score,b.score);check('Unchanged outside Stage 4 at '+p,{maximumMatrixDelta:delta,candidate:a,baseline:b});}
  await ready(base);
 }
 if(includes('controls')){
  await move(0);checkpoint('hero CTA');await page.locator('.hero-cta').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.18)<.0002,null,{timeout:18000,polling:100});assert.equal(await page.locator('#chapter-name').innerText(),'TUDO CONECTADO');check('Hero CTA reaches connected hold');
  checkpoint('Training navigation');await page.locator('.chapter-dots [data-jump="0.33"]').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.33)<.0002,null,{timeout:18000,polling:100});assert.equal(await page.locator('#chapter-name').innerText(),'TRAINING');check('Chapter navigation reaches Training');
  checkpoint('motion switch');await page.locator('#motion').click();assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);assert.equal(await page.evaluate(()=>document.querySelector('#stage').classList.contains('intro-active')),false);assert.equal(await page.locator('.scene[aria-hidden="true"]').count(),0);check('Motion-off restores all seven chapters and clears intro overrides');
  checkpoint('reduced motion');const rp=await browser.newContext({reducedMotion:'reduce',viewport:{width:393,height:852}});const reduced=await rp.newPage();observe(reduced);await reduced.goto(base,{waitUntil:'networkidle'});assert.equal(await reduced.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);assert.equal(await reduced.locator('.scene').count(),7);check('Reduced-motion linear reading preserved');await rp.close();
  checkpoint('no JavaScript');const np=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:667}});const nojs=await np.newPage();observe(nojs);await nojs.goto(base,{waitUntil:'networkidle'});assert.equal(await nojs.locator('.scene').count(),7);assert.equal(await nojs.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);check('No-JavaScript reading preserved');await np.close();
 }
 assert.equal(report.pageErrors.length,0,JSON.stringify(report.pageErrors));assert.equal(report.localErrors.length,0,JSON.stringify(report.localErrors));check('No page errors or missing local files');report.status='PASS';checkpoint('complete');
}
(async()=>{try{await run()}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{save();closing=true;if(browser)await browser.close();save();console.log(JSON.stringify({group,status:report.status,checks:report.checks.length,seconds:report.elapsedSeconds,failure:report.failure},null,2));}})();
