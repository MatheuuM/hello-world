'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const group=process.env.QA_GROUP||'desktop',out='qa-integration-'+group,base='http://127.0.0.1:8077';
fs.mkdirSync(out,{recursive:true});
let browser;const result={stage:8,group,commit:process.env.GITHUB_SHA,status:'RUNNING',checks:[],images:[],errors:[],started:Date.now()};
const pass=(name,details)=>{result.checks.push({name,details});console.log('PASS',name)};
const positions=[['hero',0],['connected',.19],['training',.35],['nutrition',.52],['evolution',.70],['circle',.855],['closing',.985]];
async function execute(){
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const width=group==='mobile'?393:1440,height=group==='mobile'?852:960;
 const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(18000);
 page.on('pageerror',e=>result.errors.push(String(e)));
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)result.errors.push(r.status()+' '+r.url())});
 await page.goto(base,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__MOVVA_QA__?.ready,null,{timeout:20000});
 const api=await page.evaluate(()=>({textures:__MOVVA_QA__.textureCount,meshes:__MOVVA_QA__.meshCount,active:__MOVVA_QA__.enabled}));
 assert.equal(api.textures,5);assert.ok(api.meshes>25);assert.equal(api.active,true);pass('True 3D hardware and five MOVVA screens',api);
 async function go(p){await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForFunction(p=>{let e=document.querySelector('#experience'),s=document.querySelector('#stage'),a=Math.max(0,Math.min(1,(scrollY-e.offsetTop)/(e.offsetHeight-s.clientHeight)));return Math.abs(a-p)<.0002&&Math.abs(__MOVVA_QA__.progress-a)<.00001},p,{polling:100,timeout:20000})}
 const state=()=>page.evaluate(()=>({progress:__MOVVA_QA__.progress,model:__MOVVA_QA__.modelMatrix,chapter:document.querySelector('#chapter-name').textContent,score:document.querySelector('#score-number').textContent,minutes:document.querySelector('#activity-minutes').textContent,water:document.querySelector('#water-number').textContent,background:document.querySelector('#stage').style.backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth,active:[...document.querySelectorAll('.scene')].filter(x=>x.getAttribute('aria-hidden')==='false').map(x=>x.id),error:document.querySelector('#world').getContext('webgl').getError()}));
 if(group==='desktop'||group==='mobile'){
  for(const [name,p] of positions){await go(p);const a=await state();assert.equal(a.overflow,false);assert.equal(a.error,0);assert.equal(a.active.length,1);const r=await page.evaluate(()=>{let c=document.querySelector('.scene[aria-hidden="false"] .copy').getBoundingClientRect();return {right:c.right,top:c.top,bottom:c.bottom,bar:document.querySelector('.chapter-bar').getBoundingClientRect().top}});assert.ok(r.top>=0&&r.right<=width+4&&r.bottom<=r.bar+25,JSON.stringify({name,r}));await page.screenshot({path:path.join(out,name+'.png')});result.images.push(name+'.png');pass('Legible '+name+' on '+width,{chapter:a.chapter,progress:a.progress})}
  for(const p of [.19,.52,.70,.855,.985]){await go(p);const a=await state();await go(.999);await go(0);await go(p);const b=await state();assert.ok(Math.max(...a.model.map((x,i)=>Math.abs(x-b.model[i])))<.001);for(const k of ['chapter','score','minutes','water','background'])assert.equal(a[k],b[k]);pass('Reversible movement at '+p)}
  await go(.73);assert.equal((await state()).score,'52');await go(.552);assert.equal((await state()).water,'2,0');pass('Reference score and hydration are reversible demonstrations');
 }
 if(group==='accessibility'){
  assert.equal(await page.locator('form').count(),0);assert.equal(await page.locator('a[href="#"]').count(),0);pass('No fake forms or placeholder anchors');
  for(const route of ['/','/privacy/','/terms/','/support/','/assets/home.webp','/assets/circle.webp']){const r=await page.request.get(base+route);assert.equal(r.status(),200);pass('Reachable '+route)}
  assert.equal(await page.locator('#launch .dark-button').getAttribute('href'),'mailto:suporte@movvawellness.com.br');pass('Honest contact action');
  await page.locator('#motion').click();assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);assert.equal(await page.locator('.scene[aria-hidden="true"]').count(),0);pass('User motion preference exposes complete reading mode');
  for(const mode of ['nojs','reduce','nogl']){
   const c=await browser.newContext({viewport:{width:393,height:852},...(mode==='reduce'?{reducedMotion:'reduce'}:{}),...(mode==='nojs'?{javaScriptEnabled:false}:{})});
   if(mode==='nogl')await c.addInitScript(()=>{const fn=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:fn.call(this,type,...args)}});
   const p=await c.newPage();await p.goto(base,{waitUntil:'load'});if(mode!=='nojs')await p.waitForFunction(()=>window.__MOVVA_QA__!==undefined,null,{timeout:25000});
   assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);assert.equal(await p.locator('.scene').count(),7);
   await p.locator('#nutrition').scrollIntoViewIfNeeded();const image=await p.locator('#nutrition .static-shot').evaluate(async e=>{e.loading='eager';await e.decode();let r=e.getBoundingClientRect(),s=getComputedStyle(e);return{actual:(r.width-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth))/(r.height-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth)),expected:e.naturalWidth/e.naturalHeight}});assert.ok(Math.abs(image.actual-image.expected)<.002);await p.screenshot({path:path.join(out,mode+'.png')});result.images.push(mode+'.png');pass('Accessible complete '+mode+' fallback');await c.close();
  }
  assert.equal(fs.readFileSync('robots.txt','utf8').includes('Disallow: /'),true);pass('Preview remains not indexed');
  const v=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.ok(v.headers?.length);pass('Hardening headers configured');
 }
 assert.deepEqual(result.errors,[]);pass('No runtime exceptions or missing assets');result.status='PASS';
}
(async()=>{try{await execute()}catch(e){result.status='FAIL';result.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();result.seconds=(Date.now()-result.started)/1000;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({group,status:result.status,checks:result.checks.length,seconds:result.seconds,failure:result.failure},null,2));}})();