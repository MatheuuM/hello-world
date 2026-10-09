'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engine=process.env.QA_ENGINE||'chromium';
const dir='qa-desktop-fallback/'+engine;
fs.mkdirSync(dir,{recursive:true});
const results={engine,commit:process.env.GITHUB_SHA,status:'START',checks:[],screenshots:[],errors:[]};
const pass=(msg,more)=>{results.checks.push({msg,more});console.log('PASS',msg)};
const source='http://127.0.0.1:8077';
(async()=>{
 let browser;
 try{
  browser=await ({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
  const newPage=async(viewport,url,opts={})=>{
   const context=await browser.newContext({viewport,...opts});
   const page=await context.newPage();
   page.on('pageerror',e=>results.errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith(source)&&r.status()>=400)results.errors.push(r.status()+' '+r.url())});
   await page.goto(source+url,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready,{timeout:25000});
   return {page,context};
  };
  const go=async(page,p)=>{
   await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);
   await page.waitForFunction(p=>Math.abs(__MOVVA_QA__.progress-p)<.00036,p,{timeout:18000});
   await page.waitForTimeout(120);
  };
  const summary=async page=>page.evaluate(()=>({
   mode:__MOVVA_QA__.engine,
   enhanced:__MOVVA_QA__.enabled,
   css:document.documentElement.classList.contains('dom-device'),
   stage:document.querySelector('.stage').getBoundingClientRect().toJSON(),
   cards:window.MOVVA_MOTION_QA?.visible,
   chapter:document.querySelector('#chapter-name').textContent,
   cssPhone:document.querySelector('#css3d-device')?.getBoundingClientRect().toJSON(),
   width:document.documentElement.scrollWidth-innerWidth,
  }));
  const auto=await newPage({width:1440,height:900},'/');
  let a=await summary(auto.page);
  assert.equal(a.enhanced,true);
  pass('Desktop automatic renderer starts',a.mode);
  await go(auto.page,.35);
  a=await summary(auto.page);
  assert.ok(a.cards>=1,JSON.stringify(a));
  pass('Cards animate while scrolling on desktop',{chapter:a.chapter,cards:a.cards});
  await auto.page.screenshot({path:path.join(dir,'desktop-default.png')});results.screenshots.push('desktop-default.png');
  await auto.page.evaluate(()=>document.querySelector('#world').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await auto.page.waitForFunction(()=>window.__MOVVA_QA__?.engine==='CSS3D DOM',{timeout:10000});
  await go(auto.page,.52);
  a=await summary(auto.page);
  assert.equal(a.css,true);assert.ok(a.cards>=1);
  assert.ok(a.cssPhone.height>200,JSON.stringify(a.cssPhone));
  pass('WebGL context loss switches to visible CSS 3D without disabling site',{phoneHeight:a.cssPhone.height,cards:a.cards});
  await auto.page.screenshot({path:path.join(dir,'desktop-after-loss.png')});results.screenshots.push('desktop-after-loss.png');
  await auto.context.close();

  const override=await newPage({width:1440,height:900},'/?renderer=css3d');
  a=await summary(override.page);
  assert.equal(a.mode,'CSS3D DOM');
  await go(override.page,.35);
  a=await summary(override.page);
  assert.ok(a.cards>=1);assert.equal(a.css,true);
  assert.ok(a.cssPhone.height>250);assert.ok(Math.abs(a.width)<2);
  pass('Desktop can use same CSS3D engine as mobile with cards attached',{cards:a.cards,phone:a.cssPhone.height});
  await override.page.screenshot({path:path.join(dir,'desktop-css3d.png')});results.screenshots.push('desktop-css3d.png');
  await override.context.close();

  const phone=await newPage({width:393,height:852},'/',{isMobile:true,hasTouch:true});
  await go(phone.page,.35);a=await summary(phone.page);
  assert.equal(a.mode,'CSS3D DOM');assert.ok(a.cards>=1);assert.ok(Math.abs(a.width)<2);
  pass('iPhone-class layout remains on CSS3D with cards',a.cards);
  await phone.context.close();

  const reduced=await newPage({width:1440,height:900},'/',{reducedMotion:'reduce'});
  a=await summary(reduced.page);
  assert.equal(a.enhanced,false);
  assert.equal(await reduced.page.locator('.scene[aria-hidden="true"]').count(),0);
  pass('Reduced-motion setting retains readable full site');
  await reduced.context.close();

  const manual=await newPage({width:1440,height:900},'/?renderer=css3d');
  await manual.page.locator('#motion').click();
  a=await summary(manual.page);assert.equal(a.enhanced,false);
  await manual.page.locator('#motion').click();
  a=await summary(manual.page);assert.equal(a.enhanced,true);
  pass('Movement control can disable and restore animations');
  await manual.context.close();
  assert.deepEqual(results.errors,[]);pass('No JS exceptions or unavailable local assets');
  results.status='PASS';
 }catch(e){results.status='FAIL';results.failure=e.stack||String(e);process.exitCode=1;}
 finally{await browser?.close();fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({engine,status:results.status,count:results.checks.length,failure:results.failure},null,2));}
})();