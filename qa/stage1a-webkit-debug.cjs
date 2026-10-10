'use strict';
const {chromium,webkit}=require('playwright');
const fs=require('fs'),path=require('path');
const engine=process.env.QA_ENGINE||'webkit';
const out=path.join('qa-stage1a-debug',engine);fs.mkdirSync(out,{recursive:true});
const variants={
 original:'',
 showBackface:'.css3d-shell-face{backface-visibility:visible!important;-webkit-backface-visibility:visible!important}',
 removeContain:'.css3d-device{contain:none!important}',
 both:'.css3d-device{contain:none!important}.css3d-shell-face{backface-visibility:visible!important;-webkit-backface-visibility:visible!important}',
 preserve:'.css3d-device,.css3d-unibody,.css3d-object{transform-style:preserve-3d!important;backface-visibility:visible!important}',
 shellTranslate:'.css3d-unibody{transform:translateZ(0)!important}'
};
(async()=>{const browser=await({webkit,chromium})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});let report=[];
try{
 for(const [variant,style] of Object.entries(variants)){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_SHELL);
  await page.evaluate(()=>__MOVVA_QA__.setProgress(.35));
  await page.waitForFunction(()=>Math.abs(__MOVVA_QA__.progress-.35)<.0006,{timeout:16000});
  await page.addStyleTag({content:'.motion-studio,.halo,.ghost-word{display:none!important}'+style});
  for(const angle of [55,90,145]){
   await page.evaluate(deg=>{
    document.querySelector('#css3d-object').style.transform='rotateY('+(-deg)+'deg) rotateX(3deg)';
    const b=deg>92&&deg<268;
    document.querySelector('.css3d-back').style.visibility=b?'visible':'hidden';
    document.querySelector('.css3d-front').style.visibility=b?'hidden':'visible';
   },angle);
   await page.waitForTimeout(120);
   const file=variant+'-'+angle+'.png';
   await page.screenshot({path:path.join(out,file)});
   const metrics=await page.evaluate(()=>{
    const e=document.querySelector('.css3d-shell-face--wall'),b=e.getBoundingClientRect(),s=getComputedStyle(e),shell=document.querySelector('.css3d-unibody');
    return {band:b.toJSON(),transform:s.transform,backface:s.backfaceVisibility,contain:getComputedStyle(document.querySelector('.css3d-device')).contain,shellStyle:getComputedStyle(shell).transformStyle};
   });
   report.push({variant,angle,file,metrics});
  }
  await ctx.close();
 }
}catch(e){report.push({error:e.stack||String(e)});process.exitCode=1}
finally{await browser.close();fs.writeFileSync(path.join(out,'debug.json'),JSON.stringify(report,null,2))}
})();