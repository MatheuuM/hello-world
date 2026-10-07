'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const group=process.env.QA_GROUP||'layout',out='qa-evolution-'+group,base='http://127.0.0.1:8077',baseline='http://127.0.0.1:8078';
fs.mkdirSync(out,{recursive:true});
const report={stage:6,group,commit:process.env.GITHUB_SHA,baseline:'044119d5012f40534ceeaa72ae5b70d54cc19d5b',status:'RUNNING',checks:[],images:[],errors:[],started:new Date().toISOString()};
const check=(name,detail)=>{report.checks.push({name,pass:true,detail});console.log(new Date().toISOString(),'PASS',name);};let browser;
async function run(){
 for(const file of ['experience.js','intro-scroll.js','intro-scroll.css','hero-layout.js','hero.css','nutrition-scroll.js','nutrition-scroll.css','site.css','assets/home.webp','assets/training.webp','assets/nutrition.webp','assets/evolution.webp','assets/circle.webp'])assert.ok(fs.readFileSync(file).equals(cp.execFileSync('git',['show',report.baseline+':'+file])),file+' changed');
 check('Approved renderer, previous chapter modules and five textures unchanged');
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1}),page=await ctx.newPage();page.setDefaultTimeout(16000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 async function ready(url=base){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.__MOVVA_QA__?.ready,null,{timeout:20000,polling:100});}
 await ready();await page.waitForFunction(()=>window.MOVVA_EVOLUTION?.layout);check('Evolution hook and actual WebGL textures initialize',await page.evaluate(()=>({textures:__MOVVA_QA__.textureSizes,objects:__MOVVA_QA__.meshCount,reference:MOVVA_EVOLUTION.reference})));
 async function move(p){await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForFunction(p=>{const e=document.querySelector('#experience'),s=document.querySelector('#stage'),a=Math.max(0,Math.min(1,(scrollY-e.offsetTop)/(e.offsetHeight-s.clientHeight)));return Math.abs(a-p)<.00016&&Math.abs(__MOVVA_QA__.progress-a)<1e-7;},p,{polling:100,timeout:18000});}
 const state=()=>page.evaluate(()=>{const r=e=>{const a=e.getBoundingClientRect();return{x:a.left,r:a.right,y:a.top,b:a.bottom}},s=document.querySelector('#stage'),vw=s.clientWidth,vh=s.clientHeight,m=__MOVVA_QA__.modelMatrix,hh=14*Math.tan(32*Math.PI/360),hw=hh*vw/vh,xs=[],ys=[];
  for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){let px=m[0]*x+m[4]*y+m[8]*z+m[12],py=m[1]*x+m[5]*y+m[9]*z+m[13],pz=m[2]*x+m[6]*y+m[10]*z+m[14];xs.push((px/(hw*(1-pz/14))+1)*vw/2);ys.push((1-py/(hh*(1-pz/14)))*vh/2)}
  return{matrix:m,device:{x:Math.min(...xs),r:Math.max(...xs),y:Math.min(...ys),b:Math.max(...ys)},copy:r(document.querySelector('#evolution .copy')),nav:r(document.querySelector('.header')),bar:r(document.querySelector('.chapter-bar')),chart:r(document.querySelector('#evolution .activity-story')),score:document.querySelector('#score-number').textContent,arc:document.querySelector('#score-arc').style.strokeDashoffset,total:document.querySelector('#activity-minutes').textContent,bars:[...document.querySelectorAll('.activity-bar')].map(e=>({minutes:+e.dataset.minutes,h:+e.getAttribute('height'),y:+e.getAttribute('y')})),water:document.querySelector('#water-number').textContent,bg:s.style.backgroundColor,chapter:document.querySelector('#chapter-name').textContent,gl:document.querySelector('#world').getContext('webgl').getError(),overflow:document.documentElement.scrollWidth>innerWidth,progress:__MOVVA_QA__.progress};});
 async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});report.images.push(name+'.png');}
 if(group==='layout'){
  for(const [width,height] of [[320,667],[375,667],[393,852],[430,932],[768,1024],[1024,768],[1440,960],[1920,1080]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(300);await move(.731);const a=await state();await shot('evolution-'+width+'x'+height);
   assert.equal(a.overflow,false,JSON.stringify(a));assert.equal(a.gl,0);assert.ok(a.copy.y>=a.nav.b+6&&a.copy.r<=width-14&&a.copy.b<a.bar.y,JSON.stringify(a));
   assert.ok(a.device.x>=9&&a.device.r<=width-9&&a.device.y>=a.nav.b+8&&a.device.b<=a.bar.y-7,JSON.stringify(a));
   assert.ok(a.chart.x>=a.copy.x-1&&a.chart.r<=a.copy.r+1&&a.chart.b<=a.copy.b,JSON.stringify(a));
   if(width<=760){assert.ok(a.device.y>=a.copy.b+10,JSON.stringify(a));assert.ok(a.device.b-a.device.y>=Math.max(180,height*.30),JSON.stringify(a));}else assert.ok(a.device.x>=a.copy.r+8,JSON.stringify(a));
   check('Evolution fit, visible chart and meaningful device size '+width+'x'+height,a);
  }
 }
 if(group==='sequence'){
  let lastS=-1,lastT=-1;
  for(const p of [.595,.623,.642,.672,.695,.714,.735,.775]){await move(p);const a=await state();await shot('sequence-'+p);assert.equal(a.gl,0);assert.equal(a.overflow,false);if(p>.595&&p<.775){assert.ok(+a.score>=lastS&&+a.total>=lastT);assert.ok(+a.score<=52&&+a.total<=425);lastS=+a.score;lastT=+a.total;}check('Forward graph and score '+p,a);}
  for(const p of [.644,.699,.721]){await move(p);const a=await state();await move(.79);await move(p);const b=await state();assert.ok(Math.max(...a.matrix.map((n,i)=>Math.abs(n-b.matrix[i])))<.001);assert.equal(a.score,b.score);assert.equal(a.arc,b.arc);assert.equal(a.total,b.total);assert.deepEqual(a.bars,b.bars);check('Reversible model, ring, total and daily bars '+p,{score:a.score,total:a.total,arc:a.arc});}
  await move(.735);const a=await state();assert.equal(a.score,'52');assert.equal(a.total,'425');assert.ok(Math.abs(+a.arc-289.026*.48)<.001);assert.deepEqual(a.bars.map(b=>b.minutes),[56,45,66,45,0,45,168]);for(const b of a.bars)assert.ok(Math.abs(b.h-b.minutes/168*78)<.001);check('Final values match partial 52/100 and all seven reference totals');
  await move(.623);const z=await state();assert.equal(z.score,'0');assert.equal(z.total,'0');assert.ok(z.bars.every(b=>b.h===0));check('Scroll backward resets the demonstration, not the app data');
 }
 if(group==='regression'){
  const points=[0,.08,.185,.335,.48,.533,.595,.775,.835,.975],states=new Map();
  for(const p of points){await move(p);states.set(p,await state());}
  await ready(baseline);
  for(const p of points){await move(p);const a=states.get(p),b=await state(),diff=Math.max(...a.matrix.map((v,i)=>Math.abs(v-b.matrix[i])));assert.ok(diff<.001,JSON.stringify({p,diff}));for(const k of ['bg','score','total','water','chapter'])assert.equal(a[k],b[k],k+' at '+p);check('Outside-Evolution regression '+p,{matrixMaxDifference:diff,score:a.score,total:a.total,chapter:a.chapter});}
 }
 if(group==='controls'){
  await page.locator('.chapter-dots [data-jump="0.66"]').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.66)<.0002);assert.equal((await state()).chapter,'EVOLUTION');check('Chapter navigation reaches Evolution');
  await move(.731);await page.locator('#motion').click();assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);assert.equal(await page.evaluate(()=>document.querySelector('#stage').classList.contains('evolution-active')),false);assert.equal(await page.locator('#score-number').innerText(),'52');assert.equal(await page.locator('#activity-minutes').innerText(),'425');assert.equal(await page.locator('.scene[aria-hidden="true"]').count(),0);check('Motion-off restores complete chapters and reference values');
  for(const mode of ['reduced','nojs','nogl']){
   const c=await browser.newContext({viewport:{width:393,height:852},...(mode==='reduced'?{reducedMotion:'reduce'}:{}),...(mode==='nojs'?{javaScriptEnabled:false}:{})});
   if(mode==='nogl')await c.addInitScript(()=>{const f=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...args){return /webgl/i.test(k)?null:f.call(this,k,...args)}});
   const pg=await c.newPage();await pg.goto(base,{waitUntil:'networkidle'});if(mode!=='nojs')await pg.waitForFunction(()=>window.__MOVVA_QA__!==undefined);
   assert.equal(await pg.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);assert.equal(await pg.locator('.scene').count(),7);assert.equal(await pg.locator('#score-number').innerText(),'52');assert.equal(await pg.locator('#activity-minutes').innerText(),'425');
   const proportions=await pg.evaluate(async()=>{const im=document.querySelector('#evolution .static-shot');await im.decode();const r=im.getBoundingClientRect(),s=getComputedStyle(im),w=r.width-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),h=r.height-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth);return{actual:w/h,expected:im.naturalWidth/im.naturalHeight,overflow:document.documentElement.scrollWidth>innerWidth};});assert.ok(Math.abs(proportions.actual-proportions.expected)<.002,JSON.stringify(proportions));assert.equal(proportions.overflow,false);
   await pg.locator('#evolution').scrollIntoViewIfNeeded();await pg.screenshot({path:path.join(out,'fallback-'+mode+'.png')});report.images.push('fallback-'+mode+'.png');check('Readable reference values and proportional screenshot: '+mode,proportions);await c.close();
  }
  await page.setViewportSize({width:667,height:375});await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);check('Short landscape viewport keeps linear reading');
 }
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));check('No local asset failures or uncaught page errors');report.status='PASS';
}
(async()=>{try{await run()}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();report.finished=new Date().toISOString();report.seconds=(Date.parse(report.finished)-Date.parse(report.started))/1000;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({stage:6,group,status:report.status,checks:report.checks.length,seconds:report.seconds,failure:report.failure},null,2));}})();
