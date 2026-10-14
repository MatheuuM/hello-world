'use strict';
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium',out='qa-stage1a-handoff/'+engine;
fs.mkdirSync(out,{recursive:true});
const report={engine,sha:process.env.GITHUB_SHA,checks:[],shots:[],errors:[],status:'START'};
const pass=(label,detail)=>{report.checks.push({label,detail});console.log('PASS',label)};
const base='http://127.0.0.1:8077/';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let browser;
(async()=>{
try{
 browser=await ({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 for(const {name,w,h} of [{name:'desktop',w:1440,h:900},{name:'iphone',w:393,h:852},{name:'small',w:320,h:667}]){
  const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:w<=430,hasTouch:w<=430});
  const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8077')&&r.status()>=400)report.errors.push(r.status()+' '+r.url())});
  await page.goto(base,{waitUntil:'load',timeout:25000});
  await page.waitForFunction(()=>__MOVVA_QA__?.ready===true&&window.MOVVA_SHELL?.partCount>35,null,{timeout:25000});
  await page.waitForTimeout(190);
  const kit=await page.evaluate(()=>MOVVA_SHELL.isWebKit);
  assert.equal(kit,engine==='webkit');
  pass(name+' compatible hardware ready',{webkit:kit});
  const sample=()=>page.evaluate(()=>{
   const rig=document.querySelector('#css3d-device');
   const profile=rig.querySelector('.css3d-webkit-profile');
   const assembly=rig.querySelector('#css3d-object');
   const bounds=profile.getBoundingClientRect(),body=assembly.getBoundingClientRect();
   const cs=getComputedStyle(profile),ds=getComputedStyle(assembly);
   const width=parseFloat(rig.style.getPropertyValue('--shell-w'))||170;
   return {profileActive:rig.classList.contains('css3d-profile-active'),profileVisible:cs.visibility,profileDisplay:cs.display,profileOpacity:parseFloat(cs.opacity),profileWidth:parseFloat(profile.style.width)||0,bodyVisible:ds.visibility,
    w:width,profileBounds:{left:bounds.left,right:bounds.right,center:(bounds.left+bounds.right)/2},deviceBounds:{left:body.left,right:body.right,center:(body.left+body.right)/2},
    overflow:document.documentElement.scrollWidth-innerWidth,chapter:document.querySelector('#chapter-name')?.textContent};
  });
  // Verify real scroll pose that previously exhibited displaced rails and a
  // compressed screenshot beside the Safari profile.
  for(const [label,p] of [['true-edge',.135],['three-quarter',.19],['training',.35]]){
   await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);
   await page.waitForFunction(p=>Math.abs(__MOVVA_QA__.progress-p)<.00050,p,{timeout:20000});
   await page.waitForTimeout(150);
   const actual=await sample();
   assert.ok(Math.abs(actual.overflow)<=1,JSON.stringify(actual));
   if(kit&&label==='true-edge'){
    assert.equal(actual.profileActive,true,JSON.stringify(actual));
    assert.equal(actual.bodyVisible,'hidden',JSON.stringify(actual));
    assert.equal(actual.profileVisible,'visible',JSON.stringify(actual));
    assert.ok(actual.profileWidth>actual.w*.11&&actual.profileWidth<actual.w*.6);
    assert.ok(Math.abs(actual.profileBounds.center-actual.deviceBounds.center)<actual.w*.08,JSON.stringify(actual));
   }
   const file=name+'-'+label+'.png';await page.screenshot({path:path.join(out,file)});
   report.shots.push(file);
   pass(name+' '+label,{active:actual.profileActive,body:actual.bodyVisible,width:actual.profileWidth});
  }
  // Geometry-only pose sweep: guard the actual stage 1A transition.
  // The browser is deliberately kept at a stable scroll position while
  // the same shell setPose() logic receives deterministic angles.
  await page.addStyleTag({content:'#css3d-object{transform:rotateY(var(--stage1a-angle,-90deg)) rotateX(0deg) rotateZ(0deg)!important}.motion-studio{visibility:hidden!important}'});
  for(const angle of [-60,-72,-76,-77.9,-78,-80,-85,-90,-95,-105,-118,-145]){
   await page.evaluate(angle=>{
    document.documentElement.style.setProperty('--stage1a-angle',angle+'deg');
    MOVVA_SHELL.setPose(angle,0,0);
   },angle);
   await page.waitForTimeout(35);
   const got=await sample(), c=Math.abs(Math.cos(angle*Math.PI/180));
   const active=engine==='webkit'&&c<=.21;
   assert.equal(got.profileActive,active,JSON.stringify({angle,got}));
   if(engine==='webkit')assert.equal(got.profileVisible,active?'visible':'hidden');else assert.equal(got.profileDisplay,'none');
   if(active){
    assert.equal(got.bodyVisible,'hidden',JSON.stringify({angle,got}));
    const expected=got.w*(c+.112*Math.abs(Math.sin(angle*Math.PI/180)));
    assert.ok(Math.abs(got.profileWidth-expected)<.1,JSON.stringify({angle,got,expected}));
    assert.ok(Math.abs(got.profileBounds.center-got.deviceBounds.center)<got.w*.08);
   }else assert.notEqual(got.bodyVisible,'hidden',JSON.stringify({angle,got}));
   assert.ok(Math.abs(got.overflow)<=1,JSON.stringify({angle,got}));
   if([-60,-77.9,-80,-90,-105].includes(angle)){
    const file=name+'-angle-'+String(Math.abs(angle)).replace('.','p')+'.png';
    await page.screenshot({path:path.join(out,file)});
    report.shots.push(file);
   }
   pass(name+' side angle '+angle,{profile:got.profileActive,width:got.profileWidth});
  }
  await ctx.close();
 }
 assert.deepEqual(report.errors,[]);
 pass('No browser errors');
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
finally{await browser?.close().catch(()=>{});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({engine,status:report.status,checks:report.checks.length,images:report.shots.length,failure:report.failure},null,2));}
})();
