'use strict';
const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const engine=process.env.QA_ENGINE||'chromium',root='qa-stage1a/'+engine;
fs.mkdirSync(root,{recursive:true});
const result={engine,commit:process.env.GITHUB_SHA,status:'RUNNING',checks:[],shots:[],errors:[]};
const report=(name,details)=>{result.checks.push({name,details});console.log('PASS',name)};
const positions=[['desktop',1440,900],['mobile',393,852],['small',320,667]];
const angles=[0,-25,-55,-85,-90,-110,-145,-180];
(async()=>{
let browser;
try{
 browser=await ({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 for(const [size,w,h] of positions){
  const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:w<430,hasTouch:w<430});
  const page=await ctx.newPage();
  page.on('pageerror',e=>result.errors.push(String(e)));
  page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8077')&&r.status()>=400)result.errors.push(r.status()+' '+r.url())});
  await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__MOVVA_QA__?.ready===true&&window.MOVVA_SHELL?.partCount>100,null,{timeout:25000});
  const initial=await page.evaluate(()=>({
   parts:MOVVA_SHELL.partCount,layers:MOVVA_SHELL.layerCount,edges:MOVVA_SHELL.edgeCount,
   obsolete:document.querySelectorAll('.css3d-rail,.css3d-top,.css3d-bottom').length,
   renderer:__MOVVA_QA__.engine,overflow:document.documentElement.scrollWidth-innerWidth,
   valid:[...document.querySelectorAll('.css3d-shell-face')].every(e=>getComputedStyle(e).transform!=='none')
  }));
  assert.ok(initial.parts>110&&initial.parts<200,JSON.stringify(initial));
  assert.equal(initial.obsolete,0);assert.equal(initial.renderer,'CSS3D DOM');
  assert.equal(initial.layers,3);assert.ok(initial.valid);assert.ok(Math.abs(initial.overflow)<=1);
  report(size+' shared-shell geometry',initial);
  await page.evaluate(()=>__MOVVA_QA__.setProgress(.35));
  await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.35)<.0006,{timeout:18000});
  await page.waitForTimeout(150);
  const mute=await page.addStyleTag({content:'.motion-studio{display:none!important}.halo,.ghost-word{display:none!important} #css3d-object{transform:rotateY(var(--qa-y,0deg)) rotateX(3deg) rotateZ(0deg)!important} html.qa-rear .css3d-front{visibility:hidden!important} html.qa-rear .css3d-back{visibility:visible!important} html:not(.qa-rear) .css3d-front{visibility:visible!important} html:not(.qa-rear) .css3d-back{visibility:hidden!important}'});
  for(const a of angles){
   await page.evaluate(angle=>{
    const degrees=(((-angle%360)+360)%360);
    document.documentElement.classList.toggle('qa-rear',degrees>92&&degrees<268);
    document.documentElement.style.setProperty('--qa-y',angle+'deg');
   },a);
   await page.waitForTimeout(65);
   const state=await page.evaluate(()=>({
     overflow:document.documentElement.scrollWidth-innerWidth,
     body:getComputedStyle(document.querySelector('.css3d-object')).transform,
     bands:document.querySelectorAll('.css3d-shell-face--wall').length,
     controls:document.querySelectorAll('.css3d-control').length
   }));
   assert.ok(Math.abs(state.overflow)<=1,JSON.stringify(state));
   assert.ok(state.body!=='none');assert.equal(state.controls,3);
   assert.ok(Math.abs(Number(state.body.slice(state.body.indexOf('(')+1).split(',')[0])-Math.cos(a*Math.PI/180))<.028,JSON.stringify({angle:a,transform:state.body}));
   const file=size+'-angle-'+String(Math.abs(a)).padStart(3,'0')+'.png';
   await page.screenshot({path:path.join(root,file)});result.shots.push(file);
   report(size+' phone '+a+'°',state.bands);
  }
  await mute.evaluate(x=>x.remove());
  await page.evaluate(()=>{document.documentElement.classList.remove('qa-rear');document.documentElement.style.removeProperty('--qa-y')});
  for(const [label,p] of [['training',.35],['nutrition',.52],['evolution',.70]]){
   await page.evaluate(v=>__MOVVA_QA__.setProgress(v),p);
   await page.waitForFunction(v=>Math.abs(__MOVVA_QA__.progress-v)<.0006,p,{timeout:18000});
   const state=await page.evaluate(()=>({width:MOVVA_SHELL.width,activeCards:window.MOVVA_MOTION_QA?.visible,overflow:document.documentElement.scrollWidth-innerWidth}));
   assert.ok(state.width>40);assert.ok(Math.abs(state.overflow)<=1);
   const file=size+'-scene-'+label+'.png';
   await page.screenshot({path:path.join(root,file)});result.shots.push(file);
   report(size+' '+label+' intact',state);
  }
  await ctx.close();
 }
 assert.deepEqual(result.errors,[]);report('No browser JS errors');
 result.status='CAPTURED';
}catch(e){result.status='FAIL';result.failure=e.stack||String(e);process.exitCode=1}
finally{await browser?.close().catch(()=>{});fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({engine,status:result.status,checks:result.checks.length,shots:result.shots.length,failure:result.failure},null,2));}
})();