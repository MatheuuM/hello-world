/* Real browser QA, executed on the isolated website branch in GitHub Actions. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const out=path.join(process.cwd(),'qa-output');fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_URL||'http://127.0.0.1:8077';
const report={version:'studio-3d-1',time:new Date().toISOString(),checks:[],errors:[],externalFailures:[],screenshots:[]};
function check(name,detail){report.checks.push({name,pass:true,detail});}
async function run(){
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('requestfailed',r=>{const u=r.url();if(u.includes('fonts.'))report.externalFailures.push(u);else report.errors.push(u+' '+r.failure()?.errorText);});
 const response=await page.goto(base,{waitUntil:'networkidle'});assert.equal(response.status(),200);check('Home HTTP 200');
 await page.waitForFunction(()=>window.__MOVVA_QA__!==undefined,{timeout:30000});
 const engine=await page.evaluate(()=>({ready:__MOVVA_QA__.ready,enabled:__MOVVA_QA__.enabled,engine:__MOVVA_QA__.engine,meshes:__MOVVA_QA__.meshCount,textures:__MOVVA_QA__.textureCount,fallback:__MOVVA_QA__.fallback}));
 assert.equal(engine.ready,true,JSON.stringify(engine));assert.equal(engine.enabled,true);assert.ok(engine.meshes>25);assert.equal(engine.textures,5);check('Real WebGL hardware and five image textures',engine);
 async function move(p){await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForTimeout(1050);}
 async function shot(name){const f=name+'.png';await page.screenshot({path:path.join(out,f)});report.screenshots.push(f);}
 async function bounds(){return await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth,visible:[...document.querySelectorAll('.scene')].filter(e=>getComputedStyle(e).visibility==='visible').length,progress:__MOVVA_QA__.progress,draws:__MOVVA_QA__.drawCalls}));}
 for(const p of [0,.145,.195,.335,.495,.67,.735,.835,.975]){await move(p);const b=await bounds();assert.ok(b.body<=b.viewport+1,JSON.stringify(b));assert.ok(b.draws>25);await shot('desktop-'+p);check('Desktop scene '+p,b);}
 await move(.68);const score1=await page.locator('#score-number').innerText();await move(.738);assert.equal(await page.locator('#score-number').innerText(),'52');await move(.68);assert.equal(await page.locator('#score-number').innerText(),score1);check('Scroll reverses score to same value',{score1,maximum:52});
 for(const width of [320,375,393,430,768,1024,1440]){
  await page.setViewportSize({width,height:width<=430?852:960});await page.waitForTimeout(300);await move(0);const b=await bounds();assert.ok(b.body<=width+1,JSON.stringify(b));await shot('width-'+width);check('Responsive width '+width,b);
 }
 await page.setViewportSize({width:393,height:852});
 for(const p of [.195,.335,.495,.67,.835,.975]){await move(p);await shot('mobile-'+p);}
 await page.locator('#motion').click();await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);assert.equal(await page.locator('.scene[aria-hidden="true"]').count(),0);check('Motion control preserves all seven chapters');
 await page.locator('#motion').click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),true);check('Motion can be restored');
 const reduced=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto(base,{waitUntil:'networkidle'});assert.equal(await rp.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);check('Reduced motion gives linear readable site');await rp.screenshot({path:path.join(out,'reduced-motion.png')});
 const nojs=await browser.newContext({viewport:{width:393,height:852},javaScriptEnabled:false});const jp=await nojs.newPage();await jp.goto(base,{waitUntil:'networkidle'});assert.equal(await jp.locator('.scene').count(),7);assert.ok(await jp.locator('#circle').isVisible());check('No-JavaScript fallback includes all pillars');
 const noGL=await browser.newContext({viewport:{width:393,height:852}});await noGL.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};});const gp=await noGL.newPage();await gp.goto(base,{waitUntil:'networkidle'});await gp.waitForFunction(()=>window.__MOVVA_QA__!==undefined);assert.equal(await gp.evaluate(()=>__MOVVA_QA__.ready),false);assert.ok(await gp.locator('#circle').isVisible());check('Unavailable WebGL falls back to real screenshots and complete copy');
 await page.setViewportSize({width:667,height:375});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);check('Short landscape screens use readable non-pinned layout');
 for(const route of ['/privacy/','/terms/','/support/']){const r=await page.request.get(base+route);assert.equal(r.status(),200);check(route+' HTTP 200');}
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));check('No uncaught JS errors or missing local assets');
 await browser.close();report.status='PASS';
}
run().catch(e=>{report.status='FAIL';report.failure=e.stack;process.exitCode=1;}).finally(()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));});