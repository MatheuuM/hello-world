'use strict';
const {chromium,webkit}=require('playwright');
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const engine=process.env.ENGINE||'chromium',out='qa-chassis-1a/'+engine;
fs.mkdirSync(out,{recursive:true});
let browser;
const r={engine,commit:process.env.GITHUB_SHA,status:'PENDING',screens:[],checks:[],errors:[]};
const check=(name,data)=>{r.checks.push({name,data});console.log('PASS',name)};
(async()=>{
try{
browser=await ({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
for(const viewport of [{width:1440,height:900},{width:393,height:852},{width:320,height:667}]){
const ctx=await browser.newContext({viewport,isMobile:viewport.width<=430,hasTouch:viewport.width<=430});
const page=await ctx.newPage();page.on('pageerror',e=>r.errors.push(e.message));
await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
await page.waitForFunction(()=>__MOVVA_QA__?.ready===true,{timeout:25000});
const values=[['front',0],['threequarter',.13],['rear',.195],['profile',.275],['training',.35],['nutrition',.52],['evolution',.7]];
for(const [name,p] of values){
 await page.evaluate(p=>__MOVVA_QA__.setProgress(p),p);
 await page.waitForFunction(p=>Math.abs(__MOVVA_QA__.progress-p)<.00045,p,{timeout:18000});
 await page.waitForTimeout(180);
 const data=await page.evaluate(()=>{
 const get=s=>{const e=document.querySelector(s),b=e.getBoundingClientRect(),c=getComputedStyle(e);return{top:b.top,bottom:b.bottom,left:b.left,right:b.right,w:b.width,h:b.height,transform:c.transform,display:c.display}};
 return{phone:get('#css3d-device'),front:get('.css3d-front'),back:get('.css3d-back'),left:get('.css3d-rail-left'),right:get('.css3d-rail-right'),top:get('.css3d-top'),bottom:get('.css3d-bottom'),overflow:document.documentElement.scrollWidth-innerWidth,depth:getComputedStyle(document.querySelector('.css3d-object')).getPropertyValue('--chassis-depth')};
 });
 assert.ok(Math.abs(data.overflow)<=1,JSON.stringify(data));
 assert.equal(data.depth.trim(),'12px');check(viewport.width+' '+name+' chassis geometry',data.depth);
 let filename=viewport.width+'-'+name+'.png';
 await page.screenshot({path:path.join(out,filename)});r.screens.push(filename);
}
await ctx.close();
}
assert.deepEqual(r.errors,[]);r.status='PASS';
}catch(e){r.status='FAIL';r.failure=e.stack||String(e);process.exitCode=1;}
finally{await browser?.close().catch(()=>{});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({engine,status:r.status,checks:r.checks.length,screens:r.screens.length,failure:r.failure},null,2));}
})();