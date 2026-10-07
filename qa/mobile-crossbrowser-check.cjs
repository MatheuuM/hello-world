'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const engine=process.env.QA_ENGINE||'chromium',device=process.env.QA_DEVICE||'mobile';
const out='qa-hotfix/'+engine+'-'+device;fs.mkdirSync(out,{recursive:true});
const log={engine,device,commit:process.env.GITHUB_SHA,status:'START',checks:[],images:[],errors:[]};
const check=(name,details)=>{log.checks.push({name,details});console.log('PASS',name)};
const positions=[['hero',0],['connected',.195],['training',.35],['nutrition',.52],['evolution',.72],['circle',.855],['closing',.985]];
let browser;
(async()=>{
try{
 browser=await ({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 const mobile=device==='mobile',width=mobile?393:1440,height=mobile?852:960;
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
 page.on('pageerror',e=>log.errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8077')&&r.status()>=400)log.errors.push(r.status()+' '+r.url())});
 await page.goto('http://127.0.0.1:8077/',{waitUntil:'networkidle',timeout:30000});
 await page.waitForFunction(()=>window.__MOVVA_QA__?.ready,{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('.scene[aria-hidden="false"]')!==null,{timeout:18000});
 const init=await page.evaluate(()=>({engine:__MOVVA_QA__.engine,enhanced:__MOVVA_QA__.enabled,dom:document.documentElement.classList.contains('dom-device')}));
 assert.equal(init.enhanced,true);
 if(mobile){assert.equal(init.dom,true);assert.equal(init.engine,'CSS3D DOM');assert.equal(await page.locator('#world').evaluate(e=>getComputedStyle(e).display),'none');}
 check('3D engine initialized',init);
 const go=async p=>{await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForFunction(p=>Math.abs(__MOVVA_QA__.progress-p)<.00012,p,{timeout:22000});await page.waitForTimeout(120);};
 const state=()=>page.evaluate(()=>{
 const obj=document.querySelector('#css3d-object'),rig=document.querySelector('#css3d-device'),box=obj.getBoundingClientRect();
 return {transform:getComputedStyle(obj).transform,ratio:box.height/Math.max(1,box.width),screen:rig.dataset.screen,active:document.querySelector('#chapter-name').textContent,over:document.documentElement.scrollWidth>innerWidth+1,progress:__MOVVA_QA__.progress};
 });
 for(const [title,p] of positions){
   await go(p);
   const st=await state();
   assert.equal(st.over,false,JSON.stringify(st));
   if(mobile){
     assert.ok(st.transform.startsWith('matrix3d'),JSON.stringify(st));
     if(['hero','training','nutrition','circle'].includes(title))assert.ok(st.ratio>1.15,JSON.stringify(st));
   }else{
     assert.equal(await page.locator('.scene[aria-hidden="false"]').count(),1);
   }
   await page.screenshot({path:path.join(out,title+'.png')});
   log.images.push(title+'.png');
   check(title+' scroll scene',st);
 }
 if(mobile){
   await go(0);const start=await state();await go(.52);await go(.985);await go(0);const end=await state();
   assert.equal(start.screen,end.screen);assert.equal(start.transform,end.transform);check('Reverse scroll restores same 3D pose');
   for(const [w,h] of [[393,740],[320,667]]){
     await page.setViewportSize({width:w,height:h});await page.waitForTimeout(400);await go(0);
     const res=await state();assert.ok(res.ratio>1.15&&!res.over,JSON.stringify(res));
     await page.screenshot({path:path.join(out,'size-'+w+'x'+h+'.png')});
     log.images.push('size-'+w+'x'+h+'.png');check('Upright phone on '+w+'×'+h,res);
   }
   assert.ok(await page.locator('.hero-cta svg').count()>0);check('No emoji-style arrow controls');
 }
 assert.equal(await page.locator('#launch .dark-button').getAttribute('href'),'mailto:suporte@movvawellness.com.br');
 check('Support link is real');
 await page.locator('#motion').click();assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);
 check('Reduced motion toggle restores all content');
 assert.deepEqual(log.errors,[]);check('No JS exceptions or missing assets');
 log.status='PASS';
}catch(e){log.status='FAIL';log.error=e.stack||String(e);process.exitCode=1;}
finally{await browser?.close().catch(()=>{});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(log,null,2));console.log(JSON.stringify({engine,device,status:log.status,checks:log.checks.length,error:log.error},null,2));}
})();