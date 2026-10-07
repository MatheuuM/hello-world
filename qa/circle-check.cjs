'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const group=process.env.QA_GROUP||'layout',out='qa-circle-'+group,base='http://127.0.0.1:8077',baseline='http://127.0.0.1:8078';
fs.mkdirSync(out,{recursive:true});
const report={stage:7,group,commit:process.env.GITHUB_SHA,baseline:'7c4cb583502b16d150c3e9fa37bcb3b1bc36b292',status:'RUNNING',checks:[],images:[],errors:[],started:new Date().toISOString()};
const check=(name,detail)=>{report.checks.push({name,pass:true,detail});console.log(new Date().toISOString(),'PASS',name);};let browser;
async function run(){
 for(const file of ['experience.js','intro-scroll.js','intro-scroll.css','hero-layout.js','hero.css','nutrition-scroll.js','nutrition-scroll.css','evolution-scroll.js','evolution-scroll.css','site.css','assets/home.webp','assets/training.webp','assets/nutrition.webp','assets/evolution.webp','assets/circle.webp'])assert.ok(fs.readFileSync(file).equals(cp.execFileSync('git',['show',report.baseline+':'+file])),file+' changed');
 check('Renderer, earlier chapters and five reference captures unchanged');
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1}),page=await ctx.newPage();page.setDefaultTimeout(18000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 async function ready(url=base){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.__MOVVA_QA__?.ready,null,{timeout:20000,polling:100});}
 await ready();await page.waitForFunction(()=>window.MOVVA_CIRCLE?.layout);check('Circle hook and 3D textures initialize',await page.evaluate(()=>({textures:__MOVVA_QA__.textureSizes,scope:MOVVA_CIRCLE.scope,reference:MOVVA_CIRCLE.reference,fonts:[...document.fonts].map(f=>({name:f.family,status:f.status}))})));
 async function move(p){await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);await page.waitForFunction(p=>{const e=document.querySelector('#experience'),s=document.querySelector('#stage'),a=Math.max(0,Math.min(1,(scrollY-e.offsetTop)/(e.offsetHeight-s.clientHeight)));return Math.abs(a-p)<.00016&&Math.abs(__MOVVA_QA__.progress-a)<1e-7;},p,{polling:100,timeout:18000});}
 const state=()=>page.evaluate(()=>{const r=e=>{const a=e.getBoundingClientRect();return{x:a.left,r:a.right,y:a.top,b:a.bottom}},s=document.querySelector('#stage'),vw=s.clientWidth,vh=s.clientHeight,m=__MOVVA_QA__.modelMatrix,hh=14*Math.tan(32*Math.PI/360),hw=hh*vw/vh,xs=[],ys=[];
  for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){let px=m[0]*x+m[4]*y+m[8]*z+m[12],py=m[1]*x+m[5]*y+m[9]*z+m[13],pz=m[2]*x+m[6]*y+m[10]*z+m[14];xs.push((px/(hw*(1-pz/14))+1)*vw/2);ys.push((1-py/(hh*(1-pz/14)))*vh/2)}
  return{matrix:m,device:{x:Math.min(...xs),r:Math.max(...xs),y:Math.min(...ys),b:Math.max(...ys)},copy:r(document.querySelector('#circle .copy')),end:r(document.querySelector('#rhythm .copy')),nav:r(document.querySelector('.header')),bar:r(document.querySelector('.chapter-bar')),score:document.querySelector('#score-number').textContent,total:document.querySelector('#activity-minutes').textContent,water:document.querySelector('#water-number').textContent,bg:s.style.backgroundColor,chapter:document.querySelector('#chapter-name').textContent,gather:s.style.getPropertyValue('--circle-gather'),gl:document.querySelector('#world').getContext('webgl').getError(),overflow:document.documentElement.scrollWidth>innerWidth,progress:__MOVVA_QA__.progress};});
 async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});report.images.push(name+'.png');}
 if(group==='layout'){
  for(const [width,height] of [[320,667],[375,667],[393,852],[430,932],[768,1024],[1024,768],[1440,960],[1920,1080]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(300);
   for(const p of [.875,.979]){await move(p);const a=await state(),c=p<.9?a.copy:a.end;await shot((p<.9?'circle-':'closing-')+width+'x'+height);
    assert.equal(a.overflow,false,JSON.stringify(a));assert.equal(a.gl,0);assert.ok(c.y>=a.nav.b+6&&c.r<=width-14&&c.b<a.bar.y,JSON.stringify(a));
    assert.ok(a.device.x>=9&&a.device.r<=width-9&&a.device.y>=a.nav.b+8&&a.device.b<=a.bar.y-7,JSON.stringify(a));
    if(width<=760||p>.9)assert.ok(a.device.y>=c.b+10,JSON.stringify(a));else assert.ok(a.device.r<=c.x-8,JSON.stringify(a));
    if(width<=760&&p<.9)assert.ok(a.device.b-a.device.y>=Math.max(180,height*.30),JSON.stringify(a));
    check('Readable '+(p<.9?'Circle':'closing')+' and fitted device '+width+'x'+height,a);
   }
  }
  for(const width of [393,1440]){await page.setViewportSize({width,height:852});await page.waitForTimeout(250);await page.locator('#launch').scrollIntoViewIfNeeded();await shot('launch-'+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);check('Contact closing fits '+width);}
 }
 if(group==='sequence'){
  for(const p of [.775,.811,.842,.877,.903,.927,.950,.979,1]){await move(p);const a=await state();await shot('sequence-'+p);assert.equal(a.gl,0);assert.equal(a.overflow,false);check('Forward Circle and closing '+p,a);}
  for(const p of [.844,.911,.979]){await move(p);const a=await state();await move(1);await move(.77);await move(p);const b=await state();assert.ok(Math.max(...a.matrix.map((n,i)=>Math.abs(n-b.matrix[i])))<.001);assert.equal(a.chapter,b.chapter);assert.equal(a.gather,b.gather);assert.equal(a.bg,b.bg);check('Reversible model, group symbolism and chapter '+p);}
  await move(.877);assert.equal(await page.locator('.circle-orbit b').count(),5);assert.equal(await page.locator('.circle-surface').getAttribute('aria-hidden'),'true');assert.equal(await page.locator('.circle-count>span').innerText(),'2—5');check('Decorative five dots cannot impersonate live members');
  await move(1);const m=(await state()).matrix;await page.waitForTimeout(350);assert.deepEqual((await state()).matrix,m);check('Final device pose settles without autoplay');
 }
 if(group==='regression'){
  const points=[0,.185,.335,.495,.552,.595,.66,.731,.755,.775],states=new Map();for(const p of points){await move(p);states.set(p,await state());}
  await ready(baseline);
  for(const p of points){await move(p);const a=states.get(p),b=await state(),diff=Math.max(...a.matrix.map((v,i)=>Math.abs(v-b.matrix[i])));assert.ok(diff<.001,JSON.stringify({p,diff}));for(const k of ['bg','score','total','water','chapter'])assert.equal(a[k],b[k],k+' at '+p);check('Earlier chapters unchanged at '+p,{matrixMaxDifference:diff,chapter:a.chapter});}
 }
 if(group==='controls'){
  await page.locator('.chapter-dots [data-jump="0.83"]').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.83)<.0002);assert.equal((await state()).chapter,'CIRCLE');check('Navigation reaches Circle');
  await page.locator('.chapter-dots [data-jump="0.97"]').click();await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.97)<.0002);assert.equal((await state()).chapter,'MOVVA');check('Navigation reaches closing');
  await page.locator('#rhythm .text-link').click();await page.waitForFunction(()=>document.querySelector('#launch').getBoundingClientRect().top<160);check('Final CTA reaches launch section');
  assert.equal(await page.locator('#launch .dark-button').getAttribute('href'),'mailto:suporte@movvawellness.com.br');assert.equal(await page.locator('form').count(),0);assert.equal(await page.locator('a[href="#"]').count(),0);check('Honest preparation status and no fake purchase or contact form');
  for(const route of ['/support/','/privacy/','/terms/'])assert.equal((await page.request.get(base+route)).status(),200);check('Support, privacy and terms remain accessible');
  await page.locator('#launch .replay').click();await page.waitForFunction(()=>__MOVVA_QA__.progress<.0002);check('Replay returns to beginning');
  await move(.875);await page.locator('#motion').click();assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);assert.equal(await page.locator('.scene[aria-hidden="true"]').count(),0);assert.equal(await page.evaluate(()=>document.querySelector('#stage').classList.contains('circle-active')),false);check('Movement switch restores all chapters and clears decorations');
  for(const mode of ['reduced','nojs','nogl']){
   const c=await browser.newContext({viewport:{width:393,height:852},...(mode==='reduced'?{reducedMotion:'reduce'}:{}),...(mode==='nojs'?{javaScriptEnabled:false}:{})});
   if(mode==='nogl')await c.addInitScript(()=>{const f=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...args){return /webgl/i.test(k)?null:f.call(this,k,...args)}});
   const pg=await c.newPage();await pg.goto(base,{waitUntil:'networkidle'});if(mode!=='nojs')await pg.waitForFunction(()=>window.__MOVVA_QA__!==undefined);
   assert.equal(await pg.evaluate(()=>document.documentElement.classList.contains('enhanced')),false);assert.equal(await pg.locator('.scene').count(),7);
   const proportions=await pg.evaluate(async()=>{const im=document.querySelector('#circle .static-shot');im.loading='eager';await im.decode();const r=im.getBoundingClientRect(),s=getComputedStyle(im),w=r.width-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),h=r.height-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth);return{actual:w/h,expected:im.naturalWidth/im.naturalHeight,overflow:document.documentElement.scrollWidth>innerWidth};});assert.ok(Math.abs(proportions.actual-proportions.expected)<.002);assert.equal(proportions.overflow,false);
   await pg.locator('#circle').scrollIntoViewIfNeeded();await pg.screenshot({path:path.join(out,'fallback-'+mode+'.png')});report.images.push('fallback-'+mode+'.png');check('Complete static chapters and proportional Circle: '+mode,proportions);await c.close();
  }
  await page.setViewportSize({width:667,height:375});await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>__MOVVA_QA__.enabled),false);check('Short landscape retains linear reading');
 }
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));check('No local asset failures or uncaught page errors');report.status='PASS';
}
(async()=>{try{await run()}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();report.finished=new Date().toISOString();report.seconds=(Date.parse(report.finished)-Date.parse(report.started))/1000;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({stage:7,group,status:report.status,checks:report.checks.length,seconds:report.seconds,failure:report.failure},null,2));}})();
