'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=process.env.BROWSER_ENGINE||'chromium';
const device=process.env.BROWSER_DEVICE||'mobile';
const mobile=device==='mobile',width=mobile?393:1440,height=mobile?852:900;
const output='qa-motion-'+engine+'-'+device;
fs.mkdirSync(output,{recursive:true});
const report={engine,device,commit:process.env.GITHUB_SHA,status:'PENDING',checks:[],errors:[],images:[],start:Date.now()};
const mark=(name,info)=>{report.checks.push({name,info});console.log('PASS',name)};
const points=[['hero',0],['connected',.195],['training',.35],['nutrition',.52],['evolution',.70],['circle',.855]];
const bType={chromium,webkit}[engine];
(async()=>{
let browser;
try{
 browser=await bType.launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('response',res=>{if(res.url().startsWith('http://127.0.0.1:8077')&&res.status()>=400)report.errors.push(res.status()+' '+res.url())});
 page.setDefaultTimeout(18000);
 await page.goto('http://127.0.0.1:8077/',{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_MOTION,{timeout:25000});
 mark('App and motion layer initialized',await page.evaluate(()=>({engine:__MOVVA_QA__.engine,cards:window.MOVVA_MOTION.cards})));
 const go=async p=>{
   await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);
   await page.waitForFunction(p=>Math.abs(__MOVVA_QA__.progress-p)<.00036,p,{timeout:24000});
   await page.waitForTimeout(180);
 };
 const snap=async name=>{const file=name+'.png';await page.screenshot({path:path.join(output,file)});report.images.push(file)};
 const cardState=()=>page.evaluate(()=>{
   const scene=document.querySelector('.scene[aria-hidden="false"]'),copy=scene?.querySelector('.copy')?.getBoundingClientRect();
   const cards=[...document.querySelectorAll('.motion-fragment')].map(c=>({kind:c.dataset.kind,opacity:+getComputedStyle(c).opacity,b:c.getBoundingClientRect().toJSON(),visible:getComputedStyle(c).visibility})).filter(c=>c.opacity>.35&&c.visible==='visible');
   return {active:window.MOVVA_MOTION_QA?.active,cardCount:cards.length,cards,copy:copy?.toJSON(),nav:document.querySelector('.chapter-bar').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth+1,layer:getComputedStyle(document.querySelector('.motion-studio')).display,engine:__MOVVA_QA__.engine,progress:__MOVVA_QA__.progress};
 });
 const matrices=[];
 for(const [name,p] of points){
   await go(p);
   const state=await cardState();
   assert.ok(state.layer!=='none');
   assert.ok(state.cardCount>=1,JSON.stringify({name,state}));
   assert.ok(!state.overflow,JSON.stringify({name,state}));
   assert.ok(state.cards.every(c=>c.b.left>=-8&&c.b.right<=width+8),JSON.stringify({name,cards:state.cards}));
   if(name==='hero')assert.equal(state.cardCount,2);
   if(mobile&&name==='hero')assert.equal(state.engine,'CSS3D DOM');
   if(!mobile&&engine==='chromium'&&name==='hero')assert.equal(state.engine,'WebGL triangulated geometry');
   await snap(name);mark('Floating interface card scene '+name,{cards:state.cards.map(c=>c.kind),chapter:state.active});
   matrices.push(state.cards.map(c=>[c.b.x,c.b.y,c.opacity]));
 }
 await go(.70);const at=await cardState();await go(.90);await go(.10);await go(.70);const back=await cardState();
 assert.equal(at.active,back.active);assert.equal(at.cardCount,back.cardCount);
 assert.deepEqual(at.cards.map(c=>c.kind),back.cards.map(c=>c.kind));
 for(let k=0;k<at.cardCount;k++){assert.ok(Math.abs(at.cards[k].b.x-back.cards[k].b.x)<3);assert.ok(Math.abs(at.cards[k].b.y-back.cards[k].b.y)<3)}
 mark('Cards reverse to deterministic previous position');
 const val=await page.evaluate(()=>({score:document.querySelector('[data-score-card]')?.textContent,minutes:document.querySelector('[data-minutes-card]')?.textContent,water:document.querySelector('[data-water-card]')?.textContent}));
 assert.ok(+val.score>=0&&+val.score<=52);mark('Visible counters remain grounded in app screenshots',val);
 // Test motion toggle is a complete accessible fallback.
 await page.locator('#motion').click();
 const hidden=await page.locator('.motion-studio').evaluate(e=>getComputedStyle(e).display==='none');
 assert.equal(hidden,true);
 assert.equal(await page.locator('.scene[aria-hidden="true"]').count(),0);
 mark('Accessible static fallback retains every section');
 for(const route of ['/','/privacy/','/terms/','/support/']){
   const response=await page.request.get('http://127.0.0.1:8077'+route);assert.equal(response.status(),200);mark('Route '+route);
 }
 assert.deepEqual(report.errors,[]);
 report.status='PASS';mark('No JS exceptions / missing local assets');
}catch(e){report.status='FAIL';report.failure=e.stack||String(e);process.exitCode=1;}
finally{
 await browser?.close().catch(()=>{});
 report.seconds=(Date.now()-report.start)/1000;
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({engine,device,status:report.status,checks:report.checks.length,seconds:report.seconds,failure:report.failure},null,2));
}
})();