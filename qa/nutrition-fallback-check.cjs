'use strict';
// Extend the existing controls report; never turn an earlier failure into a pass.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const file='qa-nutrition-controls/report.json',report=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(report.status,'PASS');report.status='RUNNING';fs.writeFileSync(file,JSON.stringify(report,null,2));let browser;
(async()=>{try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [width,mode] of [[320,'reduced'],[393,'nojs'],[1440,'reduced']]){
  const ctx=await browser.newContext({viewport:{width,height:960},reducedMotion:mode==='reduced'?'reduce':'no-preference',javaScriptEnabled:mode!=='nojs'});const page=await ctx.newPage();await page.goto('http://127.0.0.1:8077/',{waitUntil:'networkidle'});await page.locator('#nutrition .static-shot').scrollIntoViewIfNeeded();
  const a=await page.locator('#nutrition .static-shot').evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect(),w=r.width-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),h=r.height-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth);return{width:w,height:h,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,error:Math.abs((w/h)/(el.naturalWidth/el.naturalHeight)-1)};});
  assert.ok(a.naturalWidth>0);assert.ok(a.error<.01,JSON.stringify(a));
  const image='proportions-'+width+'-'+mode+'.png';await page.locator('#nutrition').screenshot({path:'qa-nutrition-controls/'+image});report.images.push(image);report.checks.push({name:'Undistorted reference screenshot '+width+' '+mode,pass:true,detail:a});await ctx.close();
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();report.finished=new Date().toISOString();report.seconds=(Date.parse(report.finished)-Date.parse(report.started))/1000;fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}})();
