'use strict';
/* iOS side-profile regression: prevent simultaneous Safari 2D fallback and
   physical CSS3D geometry at edge-on rotation. Verify both -90° and -270°.
   This complements the geometric projection and device continuity suites. */
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=process.env.QA_ENGINE||'webkit';
const out=path.join('qa-ios-edge',engine);
fs.mkdirSync(out,{recursive:true});
const result={engine,status:'RUNNING',scenarios:[],errors:[],images:[]};
(async()=>{
 let browser;
 try{
  browser=await({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
  for(const [name,w,h] of [['iphone17',440,956],['small',320,667],['desktop',1440,900]]){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<761,hasTouch:w<761});
   page.on('pageerror',e=>result.errors.push(name+' '+e.message));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.MOVVA_SHELL&&window.MOVVA_DOM_DEVICE?.render,null,{timeout:22000});
   const observations=[];
   for(const angle of [-60,-78,-85,-90,-95,-115,-270]){
    const data=await page.evaluate(angle=>{
     MOVVA_DOM_DEVICE.render(.178,1,0,0);
     document.querySelector('#css3d-object').style.transform='rotateY('+angle+'deg) rotateX(3deg) rotateZ(0deg)';
     MOVVA_SHELL.setPose(angle,3,0);
     const rig=document.querySelector('#css3d-device'),profile=rig.querySelector('.css3d-webkit-profile');
     const wall=rig.querySelector('.css3d-shell-face--wall');
     const control=rig.querySelector('.css3d-control');
     const camera=rig.querySelector('.css3d-camera-rig');
     return{
      fallback:rig.classList.contains('css3d-profile-active'),
      profile:parseFloat(getComputedStyle(profile).opacity),
      visible:getComputedStyle(profile).visibility==='visible',
      wallHidden:getComputedStyle(wall).visibility==='hidden',
      controlHidden:getComputedStyle(control).visibility==='hidden',
      cameraHidden:getComputedStyle(camera).visibility==='hidden',
      side:profile.dataset.side,
      actualRatio:MOVVA_DOM_DEVICE.visualSize.w/MOVVA_DOM_DEVICE.visualSize.h
     };
    },angle);
    if(engine==='webkit'){
     if([-85,-90,-95,-270].includes(angle)){
      assert.equal(data.fallback,true,name+' '+angle+' fallback inactive');
      assert.equal(data.wallHidden,true);
      assert.equal(data.controlHidden,true);
      assert.equal(data.cameraHidden,true);
      assert.equal(data.visible,true);
     }else if(angle===-60){
      assert.equal(data.fallback,false);
      assert.equal(data.wallHidden,false);
      assert.equal(data.controlHidden,false);
     }
    }
    assert.ok(Math.abs(data.actualRatio-78/163.4)<.003);
    observations.push({angle,...data});
    if(!process.env.QA_NO_CAPTURE&&engine==='webkit'&&name==='iphone17'&&[-85,-90,-115].includes(angle)){
     const filename='iphone17-'+Math.abs(angle)+'.png';
     await page.screenshot({path:path.join(out,filename),timeout:18000});
     result.images.push(filename);
    }
   }
   result.scenarios.push({name,observations});
   console.log('PASS '+engine+' '+name+' side silhouette excludes duplicate metal layers');
   await page.close();
  }
  assert.deepEqual(result.errors,[]);
  result.status='PASS_VISUAL_REVIEW_PENDING';
 }catch(e){result.status='FAIL';result.error=e.stack||String(e);process.exitCode=1}
 finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({engine,status:result.status,views:result.scenarios.length,images:result.images.length,error:result.error}));
 }
})();