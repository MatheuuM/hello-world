'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(process.cwd(),'qa-hero-output');fs.mkdirSync(dir,{recursive:true});
const base=process.env.QA_URL||'http://127.0.0.1:8077';
const report={stage:3,version:'hero-stage3-1',checks:[],pageErrors:[],localErrors:[],images:[]};
const check=(name,detail)=>{report.checks.push({name,pass:true,detail});console.log('PASS',name)};
let browser;
async function run(){
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});const page=await ctx.newPage();
 page.on('pageerror',e=>report.pageErrors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.localErrors.push(r.url()+' '+r.status());});
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_HERO?.layout,null,{timeout:20000});
 assert.equal(await page.evaluate(()=>__MOVVA_QA__.version),'hero-stage3-1');
 check('WebGL, original geometry and hero layout initialize',await page.evaluate(()=>({meshes:__MOVVA_QA__.meshCount,textures:__MOVVA_QA__.textureSizes,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status}))})));
 async function move(p){await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForFunction(p=>{const e=document.querySelector('#experience'),s=document.querySelector('#stage'),actual=Math.max(0,Math.min(1,(scrollY-e.offsetTop)/(e.offsetHeight-s.clientHeight)));return Math.abs(actual-p)<.0002&&Math.abs(__MOVVA_QA__.progress-actual)<.000007;},p,{timeout:18000});}
 async function shot(name){const file=name+'.png';await page.screenshot({path:path.join(dir,file)});report.images.push(file);}
 async function metrics(){return page.evaluate(()=>{
  const el=s=>document.querySelector(s),rect=e=>{const r=e.getBoundingClientRect();return{x:r.left,y:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  const m=__MOVVA_QA__.modelMatrix,vw=el('#stage').clientWidth,vh=el('#stage').clientHeight,halfH=14*Math.tan(32*Math.PI/360),halfW=halfH*vw/vh,xs=[],ys=[];
  for(const x of [-1.44,1.44])for(const y of [-3.03,3.03])for(const z of [-.43,.27]){const tx=m[0]*x+m[4]*y+m[8]*z+m[12],ty=m[1]*x+m[5]*y+m[9]*z+m[13],tz=m[2]*x+m[6]*y+m[10]*z+m[14];xs.push((tx/(halfW*(1-tz/14))+1)*vw/2);ys.push((1-ty/(halfH*(1-tz/14)))*vh/2);}
  const device={x:Math.min(...xs),right:Math.max(...xs),y:Math.min(...ys),bottom:Math.max(...ys)};
  const copy=rect(el('.scene-hero .copy')),title=rect(el('.scene-hero h1')),button=rect(el('.hero-cta')),nav=rect(el('.header')),chapter=rect(el('.chapter-bar'));
  return{viewport:[vw,vh],overflow:document.documentElement.scrollWidth>innerWidth,device,copy,title,button,nav,chapter,slot:MOVVA_HERO.layout,glError:el('#world').getContext('webgl').getError()};
 });}
 for(const [width,height]of [[320,667],[375,667],[393,680],[393,852],[430,932],[768,1024],[1024,768],[1280,720],[1440,960],[1920,1080]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(300);await move(0);const r=await metrics();
  assert.equal(r.overflow,false);assert.equal(r.glError,0);assert.ok(r.title.right<=width-15,JSON.stringify(r));
  assert.ok(r.copy.y>=r.nav.bottom+10,JSON.stringify(r));assert.ok(r.device.x>=15&&r.device.right<=width-15,JSON.stringify(r));
  assert.ok(r.device.y>=r.nav.bottom+15&&r.device.bottom<=r.chapter.y-9,JSON.stringify(r));
  if(width<=760)assert.ok(r.device.y>=r.copy.bottom+15,JSON.stringify(r));else assert.ok(r.device.x>=r.copy.right+12,JSON.stringify(r));
  assert.ok(r.button.height>=42&&r.button.width>=130);await shot('hero-'+width+'x'+height);check('Hero spacing, complete device and no overlaps '+width+'x'+height,r);
 }
 await page.setViewportSize({width:393,height:852});await page.waitForTimeout(250);
 for(const p of [.04,.08]){await move(p);await shot('hero-mobile-scroll-'+p);check('Opening mobile scroll '+p,await metrics());}
 await page.setViewportSize({width:1440,height:960});await page.waitForTimeout(250);await move(.04);const before=await page.evaluate(()=>__MOVVA_QA__.modelMatrix);await move(.18);await move(.04);const after=await page.evaluate(()=>__MOVVA_QA__.modelMatrix);assert.ok(Math.max(...before.map((v,i)=>Math.abs(v-after[i])))<.0002);check('Opening pose returns after reverse scroll');
 await move(0);await page.locator('.hero-cta').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.18)<.0002);assert.equal(await page.locator('#chapter-name').innerText(),'TUDO CONECTADO');check('Hero CTA reaches connected chapter');
 for(const p of [.335,.495,.68,.835]){await move(p);assert.equal(await page.evaluate(()=>document.querySelector('#stage').classList.contains('hero-active')),false);assert.equal(await page.locator('.hero-surface').evaluate(e=>parseFloat(getComputedStyle(e).opacity)),0);check('Hero overrides leave later chapter intact '+p);}
 await move(.68);const score=await page.locator('#score-number').innerText();await move(.738);assert.equal(await page.locator('#score-number').innerText(),'52');await move(.68);assert.equal(await page.locator('#score-number').innerText(),score);check('Existing score reversal still passes');
 await move(0);await page.locator('#motion').click();assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);assert.ok(await page.locator('.hero-cta').isVisible());check('Mode without motion retains hero CTA');
 const reduced=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto(base,{waitUntil:'networkidle'});await rp.waitForFunction(()=>window.__MOVVA_QA__);assert.equal(await rp.evaluate(()=>__MOVVA_QA__.enabled),false);assert.equal(await rp.locator('.scene').count(),7);await rp.screenshot({path:path.join(dir,'hero-reduced-motion.png')});check('Reduced motion remains semantic and complete');await reduced.close();
 const nojs=await browser.newContext({viewport:{width:320,height:667},javaScriptEnabled:false});const np=await nojs.newPage();await np.goto(base,{waitUntil:'networkidle'});assert.equal(await np.locator('.scene').count(),7);assert.ok(await np.locator('.hero-cta').isVisible());assert.equal(await np.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);check('No JavaScript retains readable hero and real app image');await nojs.close();
 assert.equal(report.pageErrors.length,0,JSON.stringify(report.pageErrors));assert.equal(report.localErrors.length,0,JSON.stringify(report.localErrors));check('No page errors or missing local assets');report.status='PASS';
}
(async()=>{try{await run()}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}})();
