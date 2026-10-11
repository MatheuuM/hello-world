'use strict';
/* Physical device rotation regression.
 * Ensure CSS3D phone returns to its original portrait framing after the
 * mobile <-> landscape viewport breakpoint changes without page reload.
 * No reliance on headless WebKit's slow scroll RAF: pose is deterministic. */
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=process.env.QA_ENGINE||'chromium';
const folder=path.join('qa-ios-orientation',engine);
fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 const errors=[],views=[];
 try{
  const page=await browser.newPage({viewport:{width:440,height:956},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.MOVVA_DOM_DEVICE?.render&&window.MOVVA_SHELL?.compact,null,{timeout:22000});
  for(const [label,w,h] of [['portrait',440,956],['landscape',956,440],['portrait-return',440,956]]){
   await page.setViewportSize({width:w,height:h});
   await page.waitForTimeout(280);
   const v=await page.evaluate(()=>{
    MOVVA_DOM_DEVICE.render(.335,2,1,0);
    const r=document.querySelector('#css3d-device').getBoundingClientRect();
    return{
     viewport:[innerWidth,innerHeight],stage:[document.querySelector('#stage').clientWidth,document.querySelector('#stage').clientHeight],
     isMobile:matchMedia('(max-width:760px)').matches,
     outerScale:document.querySelector('#css3d-device').style.transform,
     size:MOVVA_DOM_DEVICE.visualSize,rect:r.toJSON(),
     parts:MOVVA_SHELL.partCount,overflow:document.documentElement.scrollWidth-innerWidth
    };
   });
   assert.equal(v.stage[0],w);
   assert.equal(v.viewport[0],w);
   assert.equal(v.isMobile,w<761);
   assert.equal(v.parts,44);
   assert.ok(Math.abs(v.size.w/v.size.h-78/163.4)<.003);
   assert.ok(Math.abs(v.rect.width-v.size.w)<1.5);
   assert.ok(Math.abs(v.rect.height-v.size.h)<1.5);
   assert.ok(Math.abs(v.overflow)<1.5);
   if(w<761)assert.ok(v.outerScale.includes('scale('),'Portrait hardware must use compositor scale');
   else assert.ok(!v.outerScale.includes('scale('),'Landscape desktop layout must reset outer scale');
   views.push({label,...v});
  }
  assert.ok(Math.abs(views[0].size.x-views[2].size.x)<1);
  assert.ok(Math.abs(views[0].size.w-views[2].size.w)<1);
  assert.deepEqual(errors,[]);
  console.log('PASS',engine,JSON.stringify(views.map(x=>({mode:x.label,width:x.size.w,height:x.size.h,scale:x.outerScale}))));
 }catch(e){console.error(e.stack);process.exitCode=1}
 finally{
  fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify({engine,views,errors},null,2));
  await browser.close();
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1});
