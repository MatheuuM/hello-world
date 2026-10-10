'use strict';
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engineName=process.env.QA_ENGINE||'chromium';
const folder=path.join('qa-recovery',engineName);
fs.mkdirSync(folder,{recursive:true});
const report={engine:engineName,sha:process.env.GITHUB_SHA,checks:[],screenshots:[],status:'PENDING',errors:[]};
const good=(label,detail)=>{report.checks.push({label,detail});console.log('PASS',label)};
const browserType={chromium,webkit}[engineName],base='http://127.0.0.1:8077';
let browser;
async function getPage(options={},storedOff=false,pathName='/'){
 const ctx=await browser.newContext({viewport:{width:1440,height:900},...options});
 if(storedOff){await ctx.addInitScript(()=>{try{sessionStorage.setItem('movva-motion','off');sessionStorage.removeItem('movva-motion-override')}catch(e){}})}
 const page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.errors.push(r.status()+' '+r.url())});
 await page.goto(base+pathName,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__MOVVA_QA__&&window.__MOVVA_QA__.ready,null,{timeout:30000});
 return{page,ctx};
}
async function state(page){return page.evaluate(()=>({
 enhanced:document.documentElement.classList.contains('enhanced'),
 static:document.documentElement.classList.contains('mode-static'),
 mode:window.__MOVVA_QA__.engine,
 reason:document.querySelector('#motion-restore-reason').textContent,
 btnVisible:!document.querySelector('#motion-restorer').hidden,
 headerPosition:getComputedStyle(document.querySelector('.header')).position,
 cards:window.MOVVA_MOTION_QA?.visible||0,
 stored:sessionStorage.getItem('movva-motion'),
 override:sessionStorage.getItem('movva-motion-override'),
 scroll:scrollY
}))}
async function screenshot(page,name){await page.screenshot({path:path.join(folder,name+'.png')});report.screenshots.push(name+'.png')}
(async()=>{
try{
 browser=await browserType.launch({headless:true,args:engineName==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 let test=await getPage();
 let s=await state(test.page);
 assert.equal(s.enhanced,true);assert.equal(s.static,false);assert.equal(s.btnVisible,false);
 good('Default desktop offers immersive 3D',s.mode);
 await test.ctx.close();

 test=await getPage({},true);
 s=await state(test.page);
 assert.equal(s.enhanced,false);assert.equal(s.static,true);assert.equal(s.btnVisible,true);assert.equal(s.headerPosition,'fixed');
 good('Previously paused browser shows visible reactivation control');
 await test.page.evaluate(()=>scrollTo(0,850));await test.page.waitForTimeout(180);
 s=await state(test.page);assert.equal(s.headerPosition,'fixed');assert.equal(s.btnVisible,true);
 await screenshot(test.page,'desktop-static-before');
 await test.page.locator('#motion-restore-button').click();
 await test.page.waitForFunction(()=>document.documentElement.classList.contains('enhanced'),null,{timeout:15000});
 s=await state(test.page);assert.equal(s.stored,'on');assert.equal(s.override,'on');assert.equal(s.btnVisible,false);
 good('Static desktop can activate 3D from any scroll position');
 await test.page.evaluate(()=>__MOVVA_QA__.setProgress(.35));
 await test.page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.35)<.0005,{timeout:15000});
 await screenshot(test.page,'desktop-3d-reactivated');
 assert.ok(await test.page.locator('.motion-fragment').count()>0);
 good('Reactivated desktop retains phone and motion cards');
 await test.ctx.close();

 test=await getPage({reducedMotion:'reduce'});
 s=await state(test.page);
 assert.equal(s.enhanced,false);assert.equal(s.btnVisible,true);
 assert.ok(s.reason.toLowerCase().includes('sistema'));
 good('System reduced-motion is respected until visitor opts in');
 await test.page.locator('#motion-restore-button').click();
 await test.page.waitForFunction(()=>document.documentElement.classList.contains('enhanced'));
 s=await state(test.page);assert.equal(s.enhanced,true);assert.equal(s.override,'on');
 good('Explicit consent permits immersive 3D on reduced-motion OS');
 await test.page.reload({waitUntil:'networkidle'});await test.page.waitForFunction(()=>__MOVVA_QA__?.ready);
 s=await state(test.page);assert.equal(s.enhanced,true);
 good('Explicit 3D preference survives tab reload');
 await test.page.locator('#motion').click();
 s=await state(test.page);assert.equal(s.enhanced,false);assert.equal(s.override,null);
 good('Visitor can turn animations off again');
 await test.ctx.close();

 test=await getPage({reducedMotion:'reduce'},false,'/?motion=on&renderer=css3d');
 s=await state(test.page);assert.equal(s.enhanced,true);assert.equal(s.mode,'CSS3D DOM');
 good('Direct 3D preview can be explicitly enabled in desktop');
 await test.ctx.close();

 test=await getPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 s=await state(test.page);assert.equal(s.enhanced,true);assert.equal(s.btnVisible,false);
 good('Mobile experience remains animated by default');
 await test.ctx.close();

 assert.deepEqual(report.errors,[]);
 good('No JS exceptions or missing local assets');
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1}
finally{await browser?.close();fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({engine:engineName,status:report.status,checks:report.checks.length,failure:report.failure},null,2))}
})();
