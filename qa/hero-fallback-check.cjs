'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out='qa-hero-output',report={stage:3,checks:[],status:'FAIL'};let browser;
(async()=>{try{
 browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const opts of [{reducedMotion:'reduce'},{javaScriptEnabled:false}]){
 const ctx=await browser.newContext({viewport:{width:393,height:852},...opts}),page=await ctx.newPage();
 await page.goto(process.env.QA_URL||'http://127.0.0.1:8077',{waitUntil:'networkidle'});
 if(opts.reducedMotion)await page.waitForFunction(()=>window.__MOVVA_QA__!==undefined);
 const ratios=await page.locator('.scene-hero .static-shot').evaluate(e=>({rendered:e.clientWidth/e.clientHeight,original:e.naturalWidth/e.naturalHeight,width:e.clientWidth,height:e.clientHeight}));
 assert.ok(Math.abs(ratios.rendered-ratios.original)<.003,JSON.stringify(ratios));
 const mode=opts.reducedMotion?'reduced-motion':'no-javascript';
 await page.screenshot({path:out+'/hero-'+mode+'-final.png'});
 report.checks.push({name:'Hero image proportions preserved: '+mode,pass:true,ratios});
 await ctx.close();
 }
 report.status='PASS';
}catch(e){report.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/fallback-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}})();
