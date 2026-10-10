'use strict';
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium';
const output='qa-desktop-start/'+engine;
fs.mkdirSync(output,{recursive:true});
const report={engine,sha:process.env.GITHUB_SHA,status:'RUNNING',checks:[],images:[],errors:[],start:new Date().toISOString()};
const ok=(label,details)=>{report.checks.push({label,details});console.log('PASS',label)};
const base='http://127.0.0.1:8077/';
let browser;
const tap=async (p,progress)=>{
 await p.evaluate(progress=>window.__MOVVA_QA__.setProgress(progress),progress);
 await p.waitForFunction(progress=>Math.abs(window.__MOVVA_QA__.progress-progress)<.00038,progress,{timeout:18000,polling:80});
 await p.waitForTimeout(100);
};
const s=async p=>p.evaluate(()=>({
 active:document.documentElement.classList.contains('enhanced'),
 ready:document.documentElement.classList.contains('motion-ready'),
 mode:document.documentElement.classList.contains('dom-device'),
 cssDevice:getComputedStyle(document.querySelector('#css3d-device')).display,
 cssH:document.querySelector('#css3d-device').getBoundingClientRect().height,
 webgl:getComputedStyle(document.querySelector('#world')).display,
 cards:window.MOVVA_MOTION_QA?.visible,
 m:window.__MOVVA_QA__?.engine,
 osReduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
 switchLabel:document.querySelector('#motion')?.textContent,
 activationVisible:getComputedStyle(document.querySelector('#motion-resume')).display!=='none',
 activationDisabled:document.querySelector('#enable-motion').disabled,
 width:document.documentElement.scrollWidth-innerWidth,
 pref:sessionStorage.getItem('movva-motion')
}));
const record=async (p,file)=>{await p.screenshot({path:path.join(output,file)});report.images.push(file)};
(async()=>{
try{
 browser=await ({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 async function open({url='',viewport={width:1440,height:900},reducedMotion='no-preference',storedOff=false,blockWebGL=false,disableJS=false}={}){
  const c=await browser.newContext({viewport,reducedMotion,javaScriptEnabled:!disableJS});
  if(storedOff)await c.addInitScript(()=>{try{if(!sessionStorage.getItem('movva-test-once')){sessionStorage.setItem('movva-test-once','yes');sessionStorage.setItem('movva-motion','off')}}catch(_){}});
  if(blockWebGL)await c.addInitScript(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(which,...rest){return /webgl/i.test(which)?null:original.call(this,which,...rest)};
  });
  const p=await c.newPage();
  p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(base+url,{waitUntil:disableJS?'load':'networkidle'});
  if(!disableJS){
   await p.waitForFunction(()=>window.__MOVVA_QA__?.ready===true,{timeout:20000});
   await p.waitForTimeout(150);
  }
  return {p,c};
 }
 const def=await open();
 let state=await s(def.p);
 assert.equal(state.active,true);assert.equal(state.mode,true);assert.equal(state.webgl,'none');
 assert.ok(state.cssH>300&&state.cssDevice!=='none');assert.equal(state.width,0);
 ok('Default desktop opens directly into CSS3D, same engine as phone',{mode:state.m,height:state.cssH});
 await record(def.p,'desktop-hero.png');
 await tap(def.p,.35);state=await s(def.p);
 assert.ok(state.cards>=1);assert.equal(state.active,true);assert.ok(state.cssH>300);
 ok('Floating cards stay attached to desktop CSS3D scroll',{cards:state.cards,height:state.cssH});
 await record(def.p,'desktop-training.png');
 await tap(def.p,0);state=await s(def.p);assert.equal(state.active,true);ok('Scrolling backward restores 3D Hero');
 await def.c.close();

 const saved=await open({storedOff:true});
 state=await s(saved.p);
 assert.equal(state.active,false);assert.equal(state.activationVisible,true);
 assert.match(state.switchLabel,/Ativar 3D/);
 ok('Previously saved Modo leve shows a clear reactivation option',state);
 await record(saved.p,'desktop-restore-prompt.png');
 await saved.p.locator('#enable-motion').click();
 await saved.p.waitForFunction(()=>document.documentElement.classList.contains('enhanced'),{timeout:12000});
 state=await s(saved.p);assert.equal(state.active,true);assert.equal(state.pref,'on');
 ok('One click restores 3D even after saved off preference');
 await saved.c.close();

 const reduced=await open({reducedMotion:'reduce'});
 state=await s(reduced.p);assert.equal(state.active,false);assert.equal(state.activationVisible,true);
 ok('OS reduced motion respected on first visit');
 await reduced.p.locator('#enable-motion').click();
 await reduced.p.waitForFunction(()=>document.documentElement.classList.contains('enhanced'),{timeout:12000});
 await tap(reduced.p,.35);
 state=await s(reduced.p);
 const layer=await reduced.p.locator('.motion-studio').evaluate(e=>getComputedStyle(e).display);
 assert.equal(state.active,true);assert.equal(layer,'block');assert.ok(state.cards>=1);
 ok('Explicit user opt-in overrides reduced-motion layout and shows cards',{cards:state.cards,layer});
 await record(reduced.p,'desktop-optin-reduced.png');
 await reduced.c.close();

 const shortcut=await open({url:'?motion=on',reducedMotion:'reduce'});
 state=await s(shortcut.p);assert.equal(state.active,true);assert.equal(state.mode,true);
 ok('Direct motion=on link activates 3D for reduced-motion devices');
 await shortcut.c.close();

 const webgl=await open({url:'?renderer=webgl',blockWebGL:true});
 state=await s(webgl.p);assert.equal(state.active,true);assert.equal(state.mode,true);
 ok('Unavailable WebGL silently falls back to CSS3D');
 await webgl.c.close();

 const small=await open({viewport:{width:1280,height:450}});
 state=await s(small.p);assert.equal(state.active,false);assert.equal(state.activationVisible,true);assert.equal(state.activationDisabled,true);
 ok('Short browser window explains why 3D is unavailable');
 await small.p.setViewportSize({width:1280,height:800});
 await small.p.waitForFunction(()=>document.documentElement.classList.contains('enhanced'),{timeout:12000});
 state=await s(small.p);assert.equal(state.mode,true);ok('Enlarging short window recovers the animation');
 await small.c.close();

 const phone=await open({viewport:{width:393,height:852}});
 state=await s(phone.p);assert.equal(state.active,true);assert.equal(state.mode,true);
 assert.ok(state.cssH>130);ok('Mobile experience remains 3D',state.cssH);
 await phone.c.close();

 const nojs=await open({disableJS:true});
 assert.equal(await nojs.p.locator('.scene').count(),7);
 assert.equal(await nojs.p.locator('#motion-resume').isVisible(),false);
 ok('No-JavaScript fallback remains readable without inert controls');
 await nojs.c.close();

 assert.deepEqual(report.errors,[]);ok('No uncaught JavaScript exceptions');
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
finally{await browser?.close().catch(()=>{});report.seconds=(Date.now()-Date.parse(report.start))/1000;fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({engine,status:report.status,checks:report.checks.length,seconds:report.seconds,error:report.failure},null,2))}
})();