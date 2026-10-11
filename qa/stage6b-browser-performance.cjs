'use strict';
/* Controlled headless performance comparison, NOT a hardware FPS benchmark.
   Expects previous production on 8078 and candidate on 8077. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const cases=[['desktop',1440,900,1],['mobile',393,852,2]];
const urls=[['previous',process.env.PERF_BASE_URL||'http://127.0.0.1:8078/'],
            ['candidate',process.env.PERF_CURRENT_URL||'http://127.0.0.1:8077/']];
const pick=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*p)]};
const obj=list=>Object.fromEntries(list.map(x=>[x.name,x.value]));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const result=[];
 try{
 for(const [view,width,height,throttle] of cases){
  for(const [label,url] of urls){
   const context=await browser.newContext({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
   const page=await context.newPage();
   const dev=await context.newCDPSession(page);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await dev.send('Performance.enable');
   await dev.send('Emulation.setCPUThrottlingRate',{rate:throttle});
   const start=Date.now();
   const response=await page.goto(url,{waitUntil:'load',timeout:40000});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready,null,{timeout:35000});
   const readyMs=Date.now()-start;
   await page.waitForTimeout(450);
   const begin=obj((await dev.send('Performance.getMetrics')).metrics);
   const data=await page.evaluate(async()=>{
    const exp=document.querySelector('#experience'),stage=document.querySelector('#stage');
    const offset=exp.offsetTop,travel=exp.offsetHeight-stage.clientHeight;
    const times=[];const n=56;
    await new Promise(done=>{
     let i=0,last=0;
     const tick=t=>{
      if(last)times.push(t-last);last=t;
      const f=i/n,p=f<.5?.08+f*1.5:.83-(f-.5)*1.5;
      window.scrollTo({top:offset+p*travel,behavior:'instant'});
      if(i++<n)requestAnimationFrame(tick);else done();
     };requestAnimationFrame(tick);
    });
    return{times,dom:MOVVA_DOM_DEVICE.metrics,chapters:window.MOVVA_CHAPTER_MOTION?.metrics};
   });
   const end=obj((await dev.send('Performance.getMetrics')).metrics);
   const diff=k=>+((end[k]||0)-(begin[k]||0)).toFixed(3);
   const measure={
    view,label,http:response.status(),readyMs,throttle,errors,
    sampleCount:data.times.length,
    medianMs:+pick(data.times,.5).toFixed(1),
    p90Ms:+pick(data.times,.9).toFixed(1),
    p95Ms:+pick(data.times,.95).toFixed(1),
    over33ms:data.times.filter(x=>x>33.3).length,
    scriptSec:diff('ScriptDuration'),taskSec:diff('TaskDuration'),
    styleSec:diff('RecalcStyleDuration'),layoutSec:diff('LayoutDuration'),
    styleCount:diff('RecalcStyleCount'),layoutCount:diff('LayoutCount'),
    dom:data.dom,chapters:data.chapters
   };
   result.push(measure);console.log(JSON.stringify(measure));
   await context.close();
  }
 }
 }finally{await browser.close();}
 fs.mkdirSync('qa-performance',{recursive:true});
 fs.writeFileSync('qa-performance/comparison.json',JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
