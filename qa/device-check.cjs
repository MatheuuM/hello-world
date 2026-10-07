'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(process.cwd(),'qa-device-output');fs.mkdirSync(dir,{recursive:true});
const report={stage:2,version:'device-stage2-2',checks:[],pageErrors:[],consoleErrors:[],images:[]};
const check=(name,detail)=>{report.checks.push({name,pass:true,detail});console.log('PASS',name)};
let browser;
async function run(){
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});const page=await ctx.newPage();
 page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
 const r=await page.goto(process.env.QA_URL||'http://127.0.0.1:8077',{waitUntil:'networkidle'});assert.equal(r.status(),200);
 await page.waitForFunction(()=>window.__MOVVA_QA__!==undefined,null,{timeout:20000});
 const engine=await page.evaluate(()=>({version:__MOVVA_QA__.version,ready:__MOVVA_QA__.ready,enabled:__MOVVA_QA__.enabled,meshes:__MOVVA_QA__.meshCount,textures:__MOVVA_QA__.textureSizes,fallback:__MOVVA_QA__.fallback}));
 assert.equal(engine.ready,true,JSON.stringify(engine));assert.equal(engine.version,'device-stage2-2');assert.ok(engine.meshes>=45);assert.equal(Object.keys(engine.textures).length,5);check('Renderer compiles and hardware and app textures initialize',engine);
 async function move(p){await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForFunction(p=>{const q=__MOVVA_QA__,e=document.querySelector('#experience'),s=document.querySelector('#stage'),actual=Math.max(0,Math.min(1,(scrollY-e.offsetTop)/(e.offsetHeight-s.clientHeight)));return Math.abs(actual-p)<.0002&&Math.abs(q.progress-actual)<.000007;},p,{timeout:18000});}
 async function shot(name){const file=name+'.png';await page.screenshot({path:path.join(dir,file)});report.images.push(file)}
 for(const [p,name] of [[0,'front'],[.148,'side'],[.185,'rear-three-quarter'],[.205,'rear'],[.335,'training'],[.495,'nutrition'],[.68,'evolution'],[.835,'circle']]){await move(p);const state=await page.evaluate(()=>({progress:__MOVVA_QA__.progress,drawCalls:__MOVVA_QA__.drawCalls,glError:document.querySelector('#world').getContext('webgl').getError(),overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(state.glError,0);assert.equal(state.overflow,false);await shot(name);check('Desktop '+name,state);}
 await move(.185);const before=await page.evaluate(()=>__MOVVA_QA__.modelMatrix);await move(.235);await move(.185);const after=await page.evaluate(()=>__MOVVA_QA__.modelMatrix);const maxDiff=Math.max(...before.map((v,i)=>Math.abs(v-after[i])));assert.ok(maxDiff<.0002);check('Hardware rotation reverses to same pose',{maxDiff});
 await move(.68);const a=await page.locator('#score-number').innerText();await move(.738);assert.equal(await page.locator('#score-number').innerText(),'52');await move(.68);assert.equal(await page.locator('#score-number').innerText(),a);check('Score remains deterministic after settled scroll',{at68:a,end:52});
 await page.waitForTimeout(500);const f=await page.evaluate(()=>__MOVVA_QA__.frameCount);await page.waitForTimeout(600);const f2=await page.evaluate(()=>__MOVVA_QA__.frameCount);assert.ok(f2-f<=3);check('Renderer sleeps after scroll settles',{extraFrames:f2-f});
 for(const width of [320,393,430,1024]){await page.setViewportSize({width,height:852});await page.waitForTimeout(250);await move(0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot('width-'+width);check('Device responds at width '+width);}
 await page.setViewportSize({width:393,height:852});await page.waitForTimeout(200);await move(.185);await shot('mobile-rear');await move(.495);await shot('mobile-nutrition');
 await page.locator('#motion').click();assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);check('Motion off preserves static reading');await page.locator('#motion').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),true);check('Motion can be restored');
 const reduced=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto('http://127.0.0.1:8077',{waitUntil:'networkidle'});await rp.waitForFunction(()=>window.__MOVVA_QA__!==undefined);assert.equal(await rp.evaluate(()=>__MOVVA_QA__.enabled),false);check('Reduced motion remains static');await reduced.close();
 const noGL=await browser.newContext({viewport:{width:393,height:852}});await noGL.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}});const gp=await noGL.newPage();await gp.goto('http://127.0.0.1:8077',{waitUntil:'networkidle'});await gp.waitForFunction(()=>window.__MOVVA_QA__!==undefined);assert.equal(await gp.evaluate(()=>__MOVVA_QA__.ready),false);assert.equal(await gp.locator('.scene').count(),7);check('No WebGL uses complete static fallback');await noGL.close();
 assert.equal(report.pageErrors.length,0,JSON.stringify(report.pageErrors));check('No uncaught browser errors');report.status='PASS';
}
(async()=>{try{await run()}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}})();
