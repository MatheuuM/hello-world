'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const which=process.env.QA_ENGINE||'chromium',base='http://127.0.0.1:8077';
const folder=path.join('qa-always-on',which);fs.mkdirSync(folder,{recursive:true});
const report={engine:which,sha:process.env.GITHUB_SHA,status:'RUNNING',checks:[],images:[],errors:[],started:Date.now()};
const ok=(name,detail)=>{report.checks.push({name,detail});console.log('PASS',name)};
let browser;
async function newPage({width=1440,height=900,motion='no-preference',off=false,route='',js=true,webglBlocked=false}={}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,javaScriptEnabled:js,isMobile:width<=430,hasTouch:width<=430});
 if(off)await context.addInitScript(()=>{try{sessionStorage.setItem('movva-motion','off')}catch(_){}});
 if(webglBlocked)await context.addInitScript(()=>{
  const fn=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:fn.call(this,type,...args)};
 });
 const p=await context.newPage();
 p.on('pageerror',e=>report.errors.push(e.message));
 p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.errors.push(r.status()+' '+r.url())});
 await p.goto(base+'/'+route,{waitUntil:js?'networkidle':'load',timeout:30000});
 if(js)await p.waitForFunction(()=>window.__MOVVA_QA__?.ready===true,null,{timeout:25000});
 return{p,context};
}
const status=p=>p.evaluate(()=>{
 const doc=document.documentElement;
 return {
  enabled:doc.classList.contains('enhanced'),dom:doc.classList.contains('dom-device'),
  motionOverride:doc.classList.contains('motion-override'),
  active:__MOVVA_QA__.enabled,engine:__MOVVA_QA__.engine,
  canRender:getComputedStyle(document.querySelector('#css3d-device')).display!=='none',
  phoneHeight:document.querySelector('#css3d-device').getBoundingClientRect().height,
  cards:getComputedStyle(document.querySelector('.motion-studio')).display,
  visibleCards:window.MOVVA_MOTION_QA?.visible??0,
  stagePosition:getComputedStyle(document.querySelector('#stage')).position,
  progress:__MOVVA_QA__.progress,
  canvas:getComputedStyle(document.querySelector('#world')).display,
  overflow:doc.scrollWidth-innerWidth
 };
});
async function go(p,n){
 await p.evaluate(n=>__MOVVA_QA__.setProgress(n),n);
 await p.waitForFunction(n=>Math.abs(__MOVVA_QA__.progress-n)<.00039,n,{timeout:21000});
 await p.waitForTimeout(120);
}
const pic=async(p,name)=>{await p.screenshot({path:path.join(folder,name+'.png')});report.images.push(name+'.png')};
(async()=>{
try{
 browser=await ({chromium,webkit})[which].launch({headless:true,args:which==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 let t=await newPage();
 let a=await status(t.p);
 assert.equal(a.enabled,true);assert.equal(a.dom,true);assert.equal(a.engine,'CSS3D DOM');assert.equal(a.canRender,true);
 assert.ok(a.phoneHeight>300,JSON.stringify(a));assert.equal(a.cards,'block');
 assert.equal(await t.p.locator('#motion').count(),0);assert.equal(await t.p.locator('#enable-motion').count(),0);assert.equal(await t.p.locator('#motion-resume').count(),0);
 ok('Desktop opens 3D by default without any activation controls',{phone:a.phoneHeight,engine:a.engine});
 await pic(t.p,'desktop-hero');
 await go(t.p,.35);
 a=await status(t.p);assert.ok(a.visibleCards>=1);assert.ok(Math.abs(a.overflow)<=1);
 ok('Training scene retains floating cards during scroll',a.visibleCards);
 await pic(t.p,'desktop-training');
 await go(t.p,0);a=await status(t.p);assert.equal(a.enabled,true);assert.equal(a.canRender,true);
 ok('Reverse scroll restores the hero without user activation');
 await t.context.close();

 t=await newPage({off:true,route:'?motion=off'});
 a=await status(t.p);assert.equal(a.enabled,true);assert.equal(a.dom,true);
 ok('Legacy sessionStorage=off and motion=off query cannot disable 3D');
 await pic(t.p,'old-setting-ignored');await t.context.close();

 t=await newPage({motion:'reduce'});
 a=await status(t.p);assert.equal(a.enabled,true);assert.equal(a.motionOverride,true);assert.equal(a.cards,'block');
 await go(t.p,.52);a=await status(t.p);
 assert.ok(a.visibleCards>=1,JSON.stringify(a));
 ok('Reduced-motion system still presents the phone and cards as requested');
 await pic(t.p,'reduced-motion-on');await t.context.close();

 t=await newPage({width:1280,height:450,off:true,motion:'reduce'});
 a=await status(t.p);assert.equal(a.enabled,true);assert.equal(a.dom,true);
 assert.ok(a.phoneHeight>=250,JSON.stringify(a));assert.equal(a.stagePosition,'sticky');
 ok('Short desktop window keeps the immersive stage active',{phoneHeight:a.phoneHeight});
 await pic(t.p,'desktop-short');await t.context.close();

 t=await newPage({width:393,height:852,off:true,motion:'reduce'});
 a=await status(t.p);assert.equal(a.enabled,true);assert.equal(a.canRender,true);assert.equal(a.cards,'block');
 assert.ok(a.phoneHeight>130,JSON.stringify(a));ok('iPhone-sized display always presents 3D',{phoneHeight:a.phoneHeight});
 await pic(t.p,'mobile-hero');
 await go(t.p,.70);a=await status(t.p);assert.ok(a.visibleCards>=1);ok('iPhone-sized evolution cards remain scroll-driven');
 await t.context.close();

 t=await newPage({route:'?renderer=webgl',webglBlocked:true});
 a=await status(t.p);assert.equal(a.enabled,true);assert.equal(a.dom,true);ok('Unavailable WebGL switches to CSS3D automatically');
 await t.context.close();

 t=await newPage({js:false});
 assert.equal(await t.p.locator('.scene').count(),7);
 assert.ok(await t.p.locator('.scene-hero .static-shot').count()===1);
 ok('No-JS last-resort fallback remains readable');
 await t.context.close();

 assert.deepEqual(report.errors,[]);ok('No script exceptions or missing local assets');
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
finally{await browser?.close().catch(()=>{});report.seconds=(Date.now()-report.started)/1000;fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({engine:which,status:report.status,checks:report.checks.length,images:report.images.length,failure:report.failure},null,2))}
})();