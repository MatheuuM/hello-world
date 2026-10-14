'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=process.env.QA_ENGINE||'chromium';
const dir=path.join('qa-profile-continuity',engine);
fs.mkdirSync(dir,{recursive:true});
const report={engine,sha:process.env.GITHUB_SHA,status:'PENDING',screenshots:[],checks:[],errors:[],start:Date.now()};
const angles=[0,25,55,85,90,95,110,145,180,265,270,275];
const widths=[[1440,900],[393,852],[320,667]];
let browser;
const check=(name,detail)=>{report.checks.push({name,detail});console.log('PASS',name)};
(async()=>{
try{
 browser=await ({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 for(const [width,height] of widths){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
  const page=await ctx.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('response',res=>{if(res.url().startsWith('http://127.0.0.1:8077')&&res.status()>=400)report.errors.push(res.status()+' '+res.url())});
  await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_SHELL?.partCount>40,{timeout:25000});
  await page.evaluate(()=>window.__MOVVA_QA__.setProgress(.35));
  await page.waitForFunction(()=>Math.abs(window.__MOVVA_QA__.progress-.35)<.00045,{timeout:15000});
  await page.addStyleTag({content:'#css3d-object{transform:rotateY(var(--qa-angle,0deg)) rotateX(3deg) rotateZ(0deg)!important}.motion-studio{display:none!important}'});
  const list=width===320?[0,55,85,90,95,110,180,270]:angles;
  for(const angle of list){
   const v=await page.evaluate(angle=>{
    document.documentElement.style.setProperty('--qa-angle',(-angle)+'deg');
    document.querySelector('.css3d-front').style.visibility=(angle>92&&angle<268)?'hidden':'visible';
    document.querySelector('.css3d-back').style.visibility=(angle>92&&angle<268)?'visible':'hidden';
    window.MOVVA_SHELL.setPose(-angle,3,0);
    const rig=document.getElementById('css3d-device'),profile=rig.querySelector('.css3d-webkit-profile');
    const main=rig.querySelector('.css3d-shell-face--wall'),controls=rig.querySelector('.css3d-control'),camera=rig.querySelector('.css3d-camera-rig');
    const b=rig.getBoundingClientRect(),p=profile.getBoundingClientRect();
    const stat=e=>({opacity:getComputedStyle(e).opacity,visibility:getComputedStyle(e).visibility,display:getComputedStyle(e).display});
    return{
     angle,profile:stat(profile),wall:stat(main),control:stat(controls),camera:stat(camera),
     classActive:rig.classList.contains('css3d-profile-active'),frontFace:stat(rig.querySelector('.css3d-front')),rearFace:stat(rig.querySelector('.css3d-back')),
     classCapable:rig.classList.contains('css3d-profile-capable'),
     side:profile.dataset.side,
     profileRect:{width:p.width,height:p.height},phoneRect:{width:b.width,height:b.height},
     overflow:document.documentElement.scrollWidth-innerWidth
    };
   },angle);
   assert.equal(v.classCapable,engine==='chromium',JSON.stringify(v));
   assert.ok(Math.abs(v.overflow)<=1,JSON.stringify(v));
   assert.ok(v.phoneRect.height>100,JSON.stringify(v));
   const exact=(engine==='chromium'?[85,90,95,265,270,275]:[85,90,95,265,270,275]).includes(angle);
   if(exact){
    assert.equal(v.classActive,true,JSON.stringify(v));
    assert.equal(v.profile.visibility,'visible',JSON.stringify(v));
    assert.equal(v.profile.display,'block',JSON.stringify(v));
    assert.equal(v.wall.visibility,'hidden',JSON.stringify(v));
    assert.equal(v.control.visibility,'hidden',JSON.stringify(v));
    assert.equal(v.camera.visibility,'hidden',JSON.stringify(v));
    // Browser compositors may keep front/rear layers alive for continuity.
    // The physically visible shell silhouette is checked by screenshot pixels.
    assert.ok(Number(v.profile.opacity)>.94,JSON.stringify(v));
   }else{
    assert.equal(v.classActive,false,JSON.stringify(v));
    assert.equal(v.wall.visibility,'visible',JSON.stringify(v));
   }
   const filename=width+'-angle-'+String(angle).padStart(3,'0')+'.png';
   const png=await page.screenshot({path:path.join(dir,filename)});
   report.screenshots.push(filename);
   if(width===1440&&(angle===90||angle===270)){
    // A DOM/CSS pass is insufficient: an earlier WebKit regression made the
    // physical phone disappear despite computed visibility=visible.
    // Sample only the dark Training backdrop around the expected product.
    const fraction=await page.evaluate(async b64=>{
     const img=new Image();
     img.src='data:image/png;base64,'+b64;
     await img.decode();
     const canvas=document.createElement('canvas');
     canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});
     ctx.drawImage(img,0,0);
     const w=80,h=630,p=ctx.getImageData(360,170,w,h).data;
     let bright=0,samples=0;
     for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){
      const i=(y*w+x)*4;
      if((p[i]+p[i+1]+p[i+2])/3>95)bright++;
      samples++;
     }
     return bright/samples;
    },png.toString('base64'));
    assert.ok(fraction>.12,JSON.stringify({angle,engine,brightPixelFraction:fraction}));
    check('Visible product silhouette '+engine+' '+angle+'deg',fraction);
   }

   if(width===1440&&engine==='webkit'&&angle===95){
    // Regression: forcibly hiding front and rear made a white full-height
    // blade appear at 95deg. Detect unusually bright wide rear-plane regions.
    const patch=await page.evaluate(async b64=>{
     const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();
     const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;
     const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);
     const data=c.getImageData(355,330,75,400).data;
     let white=0,total=0;
     for(let i=0;i<data.length;i+=16){
      if(data[i]>180&&data[i+1]>180&&data[i+2]>170)white++;
      total++;
     }
     return white/total;
    },png.toString('base64'));
    assert.ok(patch<.16,JSON.stringify({angle,engine,whiteBladeFraction:patch}));
    check('No white blade at WebKit 95deg',patch);
   }
   check(width+'px '+angle+'deg', {active:v.classActive,opacity:v.profile.opacity,side:v.side});
  }
  await page.evaluate(()=>document.documentElement.style.removeProperty('--qa-angle'));
  await ctx.close();
 }
 assert.deepEqual(report.errors,[]);
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
finally{await browser?.close().catch(()=>{});report.seconds=(Date.now()-report.start)/1000;fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({engine,status:report.status,checks:report.checks.length,screenshots:report.screenshots.length,seconds:report.seconds,failure:report.failure},null,2));}
})();