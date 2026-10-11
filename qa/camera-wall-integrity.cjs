'use strict';
/* MOVVA 3D camera-wall enclosure QA.
 * Regression: long camera-wall edges used to be shifted/rotated around the
 * wrong origin, producing detached bars and dotted rays outside the camera.
 * The test explicitly checks projected wall containment in both browsers. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium';
const views=[['desktop',940,763],['wide',1440,900],['mobile',393,852],['small',320,667]];
const poses=[.10,.14,.178,.215,.26,.30,.335,.51,.67,.842];
const root=path.join('qa-camera-integrity',engine),report={engine,status:'RUNNING',samples:[],images:[],errors:[]};
fs.mkdirSync(root,{recursive:true});
(async()=>{
 let browser;
 try{
  browser=await({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
  for(const [name,w,h] of views){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<430,hasTouch:w<430});
   page.on('pageerror',e=>report.errors.push(name+' '+e.message));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_SHELL?.cameraWallCount,null,{timeout:28000});
   const check=await page.evaluate((poses)=>{
    const bounds=el=>{
     const r=el.getBoundingClientRect();
     return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
    };
    const camera=document.querySelector('.css3d-camera-rig .css3d-camera');
    const walls=[...camera.querySelectorAll('.css3d-camera-wall-face')];
    const controls=[...document.querySelectorAll('.css3d-control')];
    const antennas=[...document.querySelectorAll('.css3d-antenna')];
    const isCentered=wall=>{
     const t=wall.style.transform;
     const origin=getComputedStyle(wall).transformOrigin;
     return t.indexOf('translate3d(')>=0&&t.indexOf('translate(-50%,-50%)')>0&&
       t.indexOf('translate(-50%,-50%)')<t.indexOf('rotateZ(')&&
       t.indexOf('rotateZ(')<t.indexOf('rotateX(')&&origin.length>0;
    };
    const results=[];
    for(const p of poses){
     // A direct deterministic pose avoids headless WebKit's slow scroll RAF.
     // Real scrolling remains covered by the existing cinematic regression.
     MOVVA_DOM_DEVICE.render(p,p>=.28?2:1,0,0);
     const cam=bounds(camera),shell=bounds(document.querySelector('#css3d-device'));
     let maxOutside=0,worstWall=-1;
     walls.forEach((wall,i)=>{
      const r=bounds(wall);
      const d=Math.max(0,cam.left-r.left,r.right-cam.right,cam.top-r.top,r.bottom-cam.bottom);
      if(d>maxOutside){maxOutside=d;worstWall=i;}
     });
     const shellOvershoot=el=>{
      const b=bounds(el);
      return Math.max(0,shell.left-b.left,b.right-shell.right,shell.top-b.top,b.bottom-shell.bottom);
     };
     const maxAccessoryOvershoot=Math.max(0,...[...controls,...antennas].map(shellOvershoot));
     results.push({p,maxOutside:+maxOutside.toFixed(3),worstWall,maxAccessoryOvershoot:+maxAccessoryOvershoot.toFixed(3)});
    }
    return{cameraWallCount:walls.length,shellWallCount:document.querySelectorAll('.css3d-shell-face').length,
     controlCount:controls.length,antennaCount:antennas.length,allWallTransformsCentered:walls.every(isCentered),results};
   },poses);
   assert.equal(check.cameraWallCount,w<=760?36:48);
   assert.ok(check.shellWallCount>(w<=760?35:100));
   assert.equal(check.controlCount,5);
   assert.equal(check.antennaCount,4);
   assert.ok(check.allWallTransformsCentered,'Camera-wall segment centered in rotated local coordinates');
   for(const item of check.results){
    assert.ok(item.maxOutside<=9.5,
     name+' '+item.p+': detached camera-wall face index '+item.worstWall+' exceeds platform by '+item.maxOutside+'px');
    assert.ok(item.maxAccessoryOvershoot<=15,
     name+' '+item.p+': detached frame control/antenna: '+item.maxAccessoryOvershoot+'px');
   }
   report.samples.push({viewport:name,poses:check.results,checks:check.results.length+5});
   if(!process.env.QA_NO_CAPTURE&&name==='desktop'){
    await page.evaluate(()=>MOVVA_DOM_DEVICE.render(.178,1,0,0));
    await page.waitForTimeout(60);
    const filename='camera-rear-three-quarter.png';
    await page.screenshot({path:path.join(root,filename),timeout:20000});
    report.images.push(filename);
   }
   await page.close();
   console.log('PASS',engine,name,'camera walls enclosed at',poses.length,'poses');
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS_VISUAL_REVIEW_PENDING';
 }catch(e){
  report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1;
 }finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({engine,status:report.status,viewports:report.samples.length,
   poses:report.samples.reduce((a,b)=>a+b.poses.length,0),screenshots:report.images.length,
   failure:report.failure,errors:report.errors}));
 }
})();