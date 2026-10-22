'use strict';
/* MOVVA iOS regression: real screenshot UV sources, projected 3D locations,
   compact shell facets, transform-only scaling and reversible scroll. */
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const engine=process.env.QA_ENGINE||'chromium';
const sizes=[['desktop',1440,900],['iphone17',440,956],['mobile',393,852],['small',320,667]];
const directory=path.join('qa-ios',engine);
fs.mkdirSync(directory,{recursive:true});
const report={engine,status:'RUNNING',views:[],errors:[],captures:[]};
(async()=>{
 let b;
 try{
 b=await({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 for(const [label,width,height] of sizes){
  const page=await b.newPage({viewport:{width,height},isMobile:width<=760,hasTouch:width<=760});
  page.on('pageerror',e=>report.errors.push(label+': '+e.message));
  await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.MOVVA_3D_STATUS?.().active && window.MOVVA_DOM_DEVICE?.metrics?.renders>0 && window.MOVVA_SHELL?.partCount && window.MOVVA_MOTION?.origins && window.MOVVA_DOM_DEVICE?.projectScreenPoint,null,{timeout:26000});
  // The marker is a zero-impact QA probe inside the real transformed screenshot.
  // It is never inserted by the production animation.
  const measure=await page.evaluate(()=>{
   const elements=[...document.querySelectorAll('.css3d-screen')];
   const display=document.querySelector('.css3d-display'),stage=document.querySelector('#stage');
   const origins=MOVVA_MOTION.origins;
   const examples=[],poses=[.055,.135,.178,.335,.512,.67,.842];
   for(const p of poses){
    MOVVA_DOM_DEVICE.render(p,p<.13?0:p<.28?1:Math.min(6,Math.floor(p*7)),p<.28?0:Math.min(4,Math.floor((p-.25)*8)),0);
    for(const source of origins){
     const marker=document.createElement('span');
     marker.style.cssText='position:absolute;left:'+(source.u*100)+'%;top:'+(source.v*100)+'%;width:1px;height:1px;pointer-events:none;';
     display.appendChild(marker);
     const actual=marker.getBoundingClientRect(),parent=stage.getBoundingClientRect();
     const projected=MOVVA_DOM_DEVICE.projectScreenPoint(source.u,source.v);
     const error=Math.hypot(actual.x+actual.width*.5-parent.x-projected.x,
      actual.y+actual.height*.5-parent.y-projected.y);
     marker.remove();
     examples.push({p,key:source.scene+':'+source.kind,error,
      actual:[+(actual.x-parent.x).toFixed(2),+(actual.y-parent.y).toFixed(2)],
      projected:[+projected.x.toFixed(2),+projected.y.toFixed(2)],
      stage:[+parent.x.toFixed(2),+parent.y.toFixed(2)],
      phone:[document.querySelector('#css3d-device').style.left,document.querySelector('#css3d-device').style.top],
      layout:MOVVA_DOM_DEVICE.layout&&[MOVVA_DOM_DEVICE.layout.width,MOVVA_DOM_DEVICE.layout.height]});
    }
   }
   return {
    origins,facets:MOVVA_SHELL.partCount,cameraWalls:MOVVA_SHELL.cameraWallCount,
    layers:MOVVA_SHELL.layerCount,compact:MOVVA_SHELL.compact,
    allScreens:elements.length, maxError:Math.max(...examples.map(x=>x.error)),
    worst:examples.sort((a,b)=>b.error-a.error).slice(0,3)
   };
  });
  assert.equal(measure.origins.length,12);
  assert.ok(measure.origins.every(c=>Number.isFinite(c.u)&&Number.isFinite(c.v)&&c.u>0&&c.u<1&&c.v>0&&c.v<1&&c.screen),'Missing semantic UI anchors');
  assert.equal(measure.allScreens,5);
  assert.ok(measure.maxError<=2.5,'3D projection missed real screenshot UI: '+JSON.stringify(measure.worst));
  if(width<=760){
   assert.equal(measure.layers,1);
   assert.ok(measure.facets<=50);
   assert.equal(measure.cameraWalls,36);
  }else{
   assert.equal(measure.layers,3);
   assert.ok(measure.facets>120);
   assert.equal(measure.cameraWalls,48);
  }
  const start=await page.evaluate(()=>MOVVA_DOM_DEVICE.metrics);
  for(const p of [.04,.085,.135,.178,.225,.305,.335,.512,.67,.842,.96,.335,.04]){
   await page.evaluate(v=>__MOVVA_QA__.setProgress(v),p);
   await page.waitForFunction(v=>Math.abs(__MOVVA_QA__.progress-v)<.0025,p,{timeout:28000});
  }
  const end=await page.evaluate(()=>({
   metrics:MOVVA_DOM_DEVICE.metrics,
   geometry:MOVVA_DOM_DEVICE.visualSize,
   ratio:MOVVA_DOM_DEVICE.visualSize.w/MOVVA_DOM_DEVICE.visualSize.h,
   viewport:[innerWidth,innerHeight],
   transform:document.querySelector('#css3d-device').style.transform,
   overflow:document.documentElement.scrollWidth-innerWidth,
   renderer:MOVVA_3D_STATUS().engine
  }));
  assert.ok(Math.abs(end.ratio-78/163.4)<.003);
  assert.ok(Math.abs(end.overflow)<=1);
  assert.equal(end.renderer,'CSS3D DOM');
  if(width<=760){
   assert.ok(end.metrics.sizeWrites-start.sizeWrites<=1,'Mobile CSS sizes rewrote repeatedly');
   assert.ok(end.metrics.scaleWrites>=5,'No mobile transform scaling');
   assert.ok(end.transform.includes('scale('));
  }
  if(!process.env.QA_NO_CAPTURE&&['iphone17','small'].includes(label)){
   for(const [name,p] of [['front',.335],['profile',.135],['back',.178]]){
    await page.evaluate(v=>__MOVVA_QA__.setProgress(v),p);
    await page.waitForFunction(v=>Math.abs(__MOVVA_QA__.progress-v)<.003,p,{timeout:28000});
    const file=label+'-'+name+'.png';
    await page.screenshot({path:path.join(directory,file),timeout:22000});
    report.captures.push(file);
   }
  }
  report.views.push({label,facets:measure.facets,cameraWalls:measure.cameraWalls,maxError:+measure.maxError.toFixed(2),sizeWrites:end.metrics.sizeWrites-start.sizeWrites,scaleWrites:end.metrics.scaleWrites-start.scaleWrites});
  console.log('PASS',engine,label,JSON.stringify(report.views.at(-1)));
  await page.close();
 }
 assert.deepEqual(report.errors,[]);
 report.status='PASS_HEADLESS_PHYSICAL_IPHONE_PENDING';
 }catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
 finally{
  await b?.close().catch(()=>{});
  fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,views:report.views,errors:report.errors,failure:report.failure}));
 }
})();
