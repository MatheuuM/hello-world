'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out='qa-intro-output';fs.mkdirSync(out,{recursive:true});
const report={stage:4,version:'intro-stage4-1',checks:[],pageErrors:[],localErrors:[],images:[],fonts:[]};
const check=(name,detail)=>{report.checks.push({name,pass:true,detail});console.log('PASS',name);};
let browser;
const base=process.env.QA_URL||'http://127.0.0.1:8077';
async function run(){
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});const page=await ctx.newPage();
 page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.localErrors.push(r.url());});
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_INTRO?.layout,null,{timeout:20000});
 report.fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
 assert.equal(await page.evaluate(()=>__MOVVA_QA__.version),'intro-stage4-1');check('Five real textures and original 3D device initialize',await page.evaluate(()=>({objects:__MOVVA_QA__.meshCount,textures:__MOVVA_QA__.textureSizes})));
 async function move(p,pg=page){await pg.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await pg.waitForFunction(p=>{const e=document.querySelector('#experience'),s=document.querySelector('#stage'),actual=Math.max(0,Math.min(1,(scrollY-e.offsetTop)/(e.offsetHeight-s.clientHeight)));return Math.abs(actual-p)<.00015&&Math.abs(__MOVVA_QA__.progress-actual)<.0000001;},p,{timeout:12000});}
 async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});report.images.push(name+'.png');}
 async function metrics(){return page.evaluate(()=>{
  const stage=document.querySelector('#stage'),vw=stage.clientWidth,vh=stage.clientHeight,m=__MOVVA_QA__.modelMatrix,hh=14*Math.tan(32*Math.PI/360),hw=hh*vw/vh,xs=[],ys=[];
  for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){const tx=m[0]*x+m[4]*y+m[8]*z+m[12],ty=m[1]*x+m[5]*y+m[9]*z+m[13],tz=m[2]*x+m[6]*y+m[10]*z+m[14];xs.push((tx/(hw*(1-tz/14))+1)*vw/2);ys.push((1-ty/(hh*(1-tz/14)))*vh/2);}
  const device={x:Math.min(...xs),r:Math.max(...xs),y:Math.min(...ys),b:Math.max(...ys)},rect=e=>{const r=e.getBoundingClientRect();return{x:r.left,r:r.right,y:r.top,b:r.bottom}};
  return{viewport:[vw,vh],overflow:document.documentElement.scrollWidth>innerWidth,device,chapter:document.querySelector('#chapter-name').textContent,copy:[...document.querySelectorAll('.scene')].filter(s=>parseFloat(s.style.opacity)>.7).map(s=>rect(s.querySelector('.copy'))),nav:rect(document.querySelector('.header')),bar:rect(document.querySelector('.chapter-bar')),glError:document.querySelector('#world').getContext('webgl').getError(),matrix:__MOVVA_QA__.modelMatrix,progress:__MOVVA_QA__.progress};
 });}
 const dims=[[320,667],[375,667],[393,852],[430,932],[768,1024],[1024,768],[1440,960],[1920,1080]];
 for(const [width,height] of dims){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  for(const p of [.185,.335]){await move(p);const r=await metrics();await shot((p<.2?'connected-':'training-')+width+'x'+height);
   assert.equal(r.overflow,false,JSON.stringify(r));assert.equal(r.glError,0);
   assert.ok(r.device.x>=9&&r.device.r<=width-9&&r.device.y>=r.nav.b+7&&r.device.b<=r.bar.y-7,JSON.stringify(r));
   for(const c of r.copy){assert.ok(c.r<=width-14,JSON.stringify(r));if(width<=760)assert.ok(r.device.y>=c.b+10,JSON.stringify(r));else assert.ok(r.device.x>=c.r+8||r.device.r<=c.x-8,JSON.stringify(r));}
   check('Fit and readable copy '+width+'x'+height+' p='+p,r);
  }
 }
 await page.setViewportSize({width:1440,height:960});await page.waitForTimeout(250);
 for(const p of [.08,.12,.145,.225,.255,.279,.30,.365,.410]){await move(p);await shot('sequence-'+p);check('Forward scene '+p,await metrics());}
 for(const p of [.12,.185,.279,.335,.405]){await move(p);const before=await metrics();await move(.45);await move(p);const after=await metrics();assert.ok(Math.max(...before.matrix.map((n,i)=>Math.abs(n-after.matrix[i])))<.001,JSON.stringify({p,before,after}));assert.equal(before.chapter,after.chapter);check('Reversible pose and chapter '+p);}
 const baseline=await ctx.newPage();await baseline.goto('http://127.0.0.1:8078',{waitUntil:'networkidle'});await baseline.evaluate(()=>document.fonts.ready);await baseline.waitForFunction(()=>window.__MOVVA_QA__?.ready);
 for(const p of [0,.04,.495,.68,.835,.975]){await move(p);await move(p,baseline);const a=await page.evaluate(()=>({m:__MOVVA_QA__.modelMatrix,bg:document.querySelector('#stage').style.backgroundColor,score:document.querySelector('#score-number').textContent})),b=await baseline.evaluate(()=>({m:__MOVVA_QA__.modelMatrix,bg:document.querySelector('#stage').style.backgroundColor,score:document.querySelector('#score-number').textContent}));assert.ok(Math.max(...a.m.map((v,i)=>Math.abs(v-b.m[i])))<.001,JSON.stringify({p,a,b}));assert.equal(a.bg,b.bg);assert.equal(a.score,b.score);check('Unchanged outside Stage 4 at '+p);}
 await baseline.close();
 await move(0);await page.locator('.hero-cta').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.18)<.0002);assert.equal(await page.locator('#chapter-name').innerText(),'TUDO CONECTADO');check('Hero CTA reaches connected hold');
 await page.locator('.chapter-dots [data-jump="0.33"]').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.33)<.0002);assert.equal(await page.locator('#chapter-name').innerText(),'TRAINING');check('Chapter navigation reaches Training');
 await page.locator('#motion').click();assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);assert.equal(await page.evaluate(()=>document.querySelector('#stage').classList.contains('intro-active')),false);assert.equal(await page.locator('.scene[aria-hidden="true"]').count(),0);check('Motion-off restores all seven chapters and clears intro overrides');
 const rp=await browser.newContext({reducedMotion:'reduce',viewport:{width:393,height:852}});const reduced=await rp.newPage();await reduced.goto(base,{waitUntil:'networkidle'});assert.equal(await reduced.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);assert.equal(await reduced.locator('.scene').count(),7);check('Reduced-motion linear reading preserved');await rp.close();
 const np=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:667}});const nojs=await np.newPage();await nojs.goto(base,{waitUntil:'networkidle'});assert.equal(await nojs.locator('.scene').count(),7);assert.equal(await nojs.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);check('No-JavaScript reading preserved');await np.close();
 assert.equal(report.pageErrors.length,0,JSON.stringify(report.pageErrors));assert.equal(report.localErrors.length,0,JSON.stringify(report.localErrors));check('No page errors or missing local files');report.status='PASS';
}
(async()=>{try{await run()}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}})();
