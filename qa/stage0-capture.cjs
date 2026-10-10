'use strict';
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const engine=process.env.STAGE0_ENGINE||'chromium',sourceSha='3741e7032aee1c357380dbe6bda92442884601c0';
const out=path.join('stage0-evidence',engine);fs.mkdirSync(out,{recursive:true});
const capture={engine,sourceSha,workflowSha:process.env.GITHUB_SHA,createdAt:new Date().toISOString(),views:[],browserErrors:[],assets:[],qaIssues:[]};
const phases=[['hero',0],['connected',.195],['side_profile',.275],['training',.35],['nutrition',.52],['evolution',.70],['circle',.855],['closing',.985]];
const groups=[
{name:'desktop',width:1440,height:900,all:true},
{name:'mobile',width:393,height:852,all:true},
{name:'small',width:320,height:667,all:false},
{name:'tablet',width:820,height:1180,all:false}
];
const clip=(b,w,h)=>b && {left:b.left,top:b.top,right:b.right,bottom:b.bottom,w:b.width,h:b.height,visible:b.right>0&&b.left<w&&b.bottom>0&&b.top<h};
async function main(){
 const bt={chromium,webkit}[engine];
 const browser=await bt.launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 try{
 for(const group of groups){
  const ctx=await browser.newContext({viewport:{width:group.width,height:group.height},deviceScaleFactor:1,isMobile:group.width<=430,hasTouch:group.width<=430});
  const page=await ctx.newPage();
  page.on('pageerror',e=>capture.browserErrors.push({group:group.name,message:e.message}));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1:8077'))capture.browserErrors.push({group:group.name,status:r.status(),url:r.url()})});
  await page.goto('http://127.0.0.1:8077/',{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>window.__MOVVA_QA__?.ready===true,null,{timeout:24000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(200);
  if(group.name==='desktop'){
   capture.assets=await page.evaluate(()=>[...document.querySelectorAll('.css3d-screen')].map(e=>({src:e.getAttribute('src'),naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight,loaded:e.complete})));
  }
  const positions=group.all?phases:[phases[0],phases[2],phases[3],phases[5]];
  for(const [scene,p] of positions){
   await page.evaluate(p=>window.__MOVVA_QA__.setProgress(p),p);
   try{await page.waitForFunction(p=>Math.abs(window.__MOVVA_QA__.progress-p)<.00044,p,{timeout:14000});}
   catch(e){capture.qaIssues.push({group:group.name,scene,type:'scroll_settle_timeout',message:e.message.slice(0,200)});}
   await page.waitForTimeout(150);
   const item=await page.evaluate(()=>{
     function rect(el){
      if(!el)return null;
      const b=el.getBoundingClientRect(),s=getComputedStyle(el);
      return{left:+b.left.toFixed(2),right:+b.right.toFixed(2),top:+b.top.toFixed(2),bottom:+b.bottom.toFixed(2),width:+b.width.toFixed(2),height:+b.height.toFixed(2),visibility:s.visibility,display:s.display,transform:s.transform,opacity:s.opacity,zIndex:s.zIndex};
     }
     const el=x=>document.querySelector(x);
     const visible=[...document.querySelectorAll('.motion-fragment')].filter(e=>getComputedStyle(e).visibility==='visible'&&+getComputedStyle(e).opacity>.25).map(e=>({kind:e.dataset.kind,rect:rect(e)}));
     const active=[...document.querySelectorAll('.scene')].filter(e=>e.getAttribute('aria-hidden')==='false').map(e=>e.id);
     return{progress:window.__MOVVA_QA__.progress,renderer:window.__MOVVA_QA__.engine,visibleScene:active,
      phone:rect(el('#css3d-device')),object:rect(el('#css3d-object')),front:rect(el('.css3d-front')),back:rect(el('.css3d-back')),
      display:rect(el('.css3d-display')),camera:rect(el('.css3d-camera')),leftRail:rect(el('.css3d-rail-left')),rightRail:rect(el('.css3d-rail-right')),
      top:rect(el('.css3d-top')),bottom:rect(el('.css3d-bottom')),screens:[...document.querySelectorAll('.css3d-screen')].map(e=>({name:e.className,visibility:getComputedStyle(e).visibility,display:getComputedStyle(e).display})),
      activeCards:visible,overflowPx:document.documentElement.scrollWidth-innerWidth,chapter:el('#chapter-name')?.textContent,
      background:getComputedStyle(el('#stage')).backgroundColor};
   });
   const name=group.name+'-'+scene+'.png';
   await page.screenshot({path:path.join(out,name),animations:'disabled'});
   capture.views.push({...group,scene,position:p,...item,image:name});
   if(item.overflowPx>1)capture.qaIssues.push({group:group.name,scene,type:'horizontal_overflow',pixels:item.overflowPx});
   if(item.visibleScene.length!==1)capture.qaIssues.push({group:group.name,scene,type:'scene_count',active:item.visibleScene});
   console.log(engine,group.name,scene,'phoneHeight',item.phone?.height,'cards',item.activeCards.length,'overflow',item.overflowPx);
  }
  await ctx.close();
 }
 }finally{await browser.close()}
}
main().catch(e=>{capture.fatal=e.stack||String(e);process.exitCode=1}).finally(()=>{
 fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify(capture,null,2));
 console.log(JSON.stringify({engine,status:capture.fatal?'FAIL':'CAPTURED',views:capture.views.length,assets:capture.assets,errors:capture.browserErrors.length,issues:capture.qaIssues.length,fatal:capture.fatal},null,2));
});
