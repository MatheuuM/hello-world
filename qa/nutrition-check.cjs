'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const group=process.env.QA_GROUP||'layout',out='qa-nutrition-'+group,base='http://127.0.0.1:8077',baseline='http://127.0.0.1:8078';fs.mkdirSync(out,{recursive:true});
const report={stage:5,group,commit:process.env.GITHUB_SHA,status:'RUNNING',checks:[],images:[],errors:[],started:new Date().toISOString()};
const check=(name,detail)=>{report.checks.push({name,pass:true,detail});console.log(new Date().toISOString(),'PASS',name);};let browser;
const immutable='f6795872907f3b458a346bf720fdafb4ccbf32e4';
async function run(){
 for(const file of ['experience.js','intro-scroll.js','intro-scroll.css','hero-layout.js','hero.css','site.css','assets/home.webp','assets/training.webp','assets/nutrition.webp','assets/evolution.webp','assets/circle.webp'])assert.ok(fs.readFileSync(file).equals(cp.execFileSync('git',['show',immutable+':'+file])),file+' changed');
 check('Stable renderer, previous chapters and all real textures unchanged');
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});const page=await ctx.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 async function ready(url=base){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.__MOVVA_QA__?.ready,null,{timeout:20000,polling:100});}
 await ready();await page.waitForFunction(()=>window.MOVVA_NUTRITION?.layout);check('Nutrition hook and five textures initialize',await page.evaluate(()=>({textures:__MOVVA_QA__.textureSizes,objects:__MOVVA_QA__.meshCount})));
 async function move(p){await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForFunction(p=>{const e=document.querySelector('#experience'),s=document.querySelector('#stage'),actual=Math.max(0,Math.min(1,(scrollY-e.offsetTop)/(e.offsetHeight-s.clientHeight)));return Math.abs(actual-p)<.00016&&Math.abs(__MOVVA_QA__.progress-actual)<1e-7;},p,{polling:100,timeout:18000});}
 const state=()=>page.evaluate(()=>{const r=e=>{const a=e.getBoundingClientRect();return{x:a.left,r:a.right,y:a.top,b:a.bottom}},s=document.querySelector('#stage'),vw=s.clientWidth,vh=s.clientHeight,m=__MOVVA_QA__.modelMatrix,hh=14*Math.tan(32*Math.PI/360),hw=hh*vw/vh,xs=[],ys=[];
 for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){let px=m[0]*x+m[4]*y+m[8]*z+m[12],py=m[1]*x+m[5]*y+m[9]*z+m[13],pz=m[2]*x+m[6]*y+m[10]*z+m[14];xs.push((px/(hw*(1-pz/14))+1)*vw/2);ys.push((1-py/(hh*(1-pz/14)))*vh/2)}
 return{matrix:m,device:{x:Math.min(...xs),r:Math.max(...xs),y:Math.min(...ys),b:Math.max(...ys)},copy:r(document.querySelector('#nutrition .copy')),nav:r(document.querySelector('.header')),bar:r(document.querySelector('.chapter-bar')),water:document.querySelector('#water-number').textContent,fill:document.querySelector('#water-fill').style.width,score:document.querySelector('#score-number').textContent,bg:s.style.backgroundColor,chapter:document.querySelector('#chapter-name').textContent,gl:document.querySelector('#world').getContext('webgl').getError(),overflow:document.documentElement.scrollWidth>innerWidth,progress:__MOVVA_QA__.progress};});
 async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});report.images.push(name+'.png');}
 if(group==='layout'){
  for(const [width,height] of [[320,667],[375,667],[393,852],[430,932],[768,1024],[1024,768],[1440,960],[1920,1080]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(300);await move(.533);const a=await state();await shot('nutrition-'+width+'x'+height);
   assert.equal(a.overflow,false,JSON.stringify(a));assert.equal(a.gl,0);assert.ok(a.copy.y>=a.nav.b+6&&a.copy.r<=width-14&&a.copy.b<a.bar.y,JSON.stringify(a));
   assert.ok(a.device.x>=9&&a.device.r<=width-9&&a.device.y>=a.nav.b+8&&a.device.b<=a.bar.y-7,JSON.stringify(a));
   if(width<=760)assert.ok(a.device.y>=a.copy.b+10,JSON.stringify(a));else assert.ok(a.device.r<=a.copy.x-8,JSON.stringify(a));
   check('Nutrition fit and text separation '+width+'x'+height,a);
  }
 }
 if(group==='sequence'){
  for(const p of [.435,.454,.474,.497,.518,.552,.580,.595]){await move(p);await shot('sequence-'+p);const a=await state();assert.equal(a.gl,0);assert.equal(a.overflow,false);check('Forward frame '+p,a);}
  for(const p of [.481,.517,.549]){await move(p);const a=await state();await move(.62);await move(p);const b=await state();assert.ok(Math.max(...a.matrix.map((n,i)=>Math.abs(n-b.matrix[i])))<.001);assert.equal(a.water,b.water);assert.equal(a.fill,b.fill);check('Reversible pose, hydration and fill '+p,{water:a.water,fill:a.fill});}
  await move(.552);assert.equal((await state()).water,'2,0');assert.ok(Math.abs(parseFloat((await state()).fill)-100*2/2.7)<.01);check('Counter ends at 2.0 of 2.7 L from reference capture');
  await move(.481);assert.equal((await state()).water,'0,0');check('Scroll backward restores zero demonstration');
 }
 if(group==='regression'){
  const points=[0,.08,.185,.335,.435,.595,.68,.835,.975],states=new Map();
  for(const p of points){await move(p);states.set(p,await state());}
  await ready(baseline);
  for(const p of points){await move(p);const a=states.get(p),b=await state(),diff=Math.max(...a.matrix.map((v,i)=>Math.abs(v-b.matrix[i])));assert.ok(diff<.001,JSON.stringify({p,diff,a,b}));assert.equal(a.bg,b.bg);assert.equal(a.score,b.score);assert.equal(a.chapter,b.chapter);check('Outside-scope regression '+p,{matrixMaxDifference:diff,bg:a.bg,score:a.score,chapter:a.chapter});}
 }
 if(group==='controls'){
  await page.locator('.chapter-dots [data-jump="0.48"]').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.48)<.0002);assert.equal((await state()).chapter,'NUTRITION');check('Chapter navigation reaches Nutrition');
  await move(.533);await page.locator('#motion').click();assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);assert.equal(await page.evaluate(()=>document.querySelector('#stage').classList.contains('nutrition-active')),false);assert.equal(await page.locator('#water-number').innerText(),'2,0');assert.equal(await page.locator('.scene[aria-hidden="true"]').count(),0);check('Motion switch clears Nutrition overrides and preserves all chapters');
  for(const mode of ['reduced','nojs','nogl']){const c=await browser.newContext({viewport:{width:393,height:852},...(mode==='reduced'?{reducedMotion:'reduce'}:{}),...(mode==='nojs'?{javaScriptEnabled:false}:{})});if(mode==='nogl')await c.addInitScript(()=>{const f=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...args){return /webgl/i.test(k)?null:f.call(this,k,...args)}});const pg=await c.newPage();await pg.goto(base,{waitUntil:'networkidle'});if(mode!=='nojs')await pg.waitForFunction(()=>window.__MOVVA_QA__!==undefined);assert.equal(await pg.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);assert.equal(await pg.locator('.scene').count(),7);await pg.locator('#nutrition').scrollIntoViewIfNeeded();await pg.screenshot({path:path.join(out,'fallback-'+mode+'.png')});report.images.push('fallback-'+mode+'.png');assert.equal(await pg.locator('#water-number').innerText(),'2,0');check('Complete readable Nutrition without animation: '+mode);await c.close();}
 }
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));check('No local resource failures or page errors');report.status='PASS';
}
(async()=>{try{await run()}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();report.finished=new Date().toISOString();report.seconds=(Date.parse(report.finished)-Date.parse(report.started))/1000;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}})();
