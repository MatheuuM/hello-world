'use strict';
/* MOVVA Stage 4B: cinematic pose continuity, scroll reversibility and 3D card lift.
   Test must work in both Chromium and WebKit without depending on wall-clock animation. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.QA_ENGINE||'chromium';
const root=path.join('qa-cinema',engine);
fs.mkdirSync(root,{recursive:true});
const result={engine,status:'RUNNING',checks:0,screenshots:[],metrics:[],errors:[]};
const assertNear=(a,b,tolerance,description)=>assert.ok(Math.abs(a-b)<=tolerance,description+': '+a+' vs '+b);
const stops=[.042,.178,.335,.512,.67,.842,.178,.042,.842,.512,.335,.178];
const viewports=[['desktop',1440,900],['mobile',393,852]];
const knots=[.10,.16,.215,.26,.32,.40,.46,.58,.66,.77,.84,.92];

(async()=>{
 let browser;
 try{
  browser=await({chromium,webkit})[engine].launch({headless:true,args:engine==='chromium'?['--enable-unsafe-swiftshader','--use-angle=swiftshader']:[]});
  for(const [label,width,height] of viewports){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<430,hasTouch:width<430});
   page.on('pageerror',e=>result.errors.push(String(e)));
   await page.goto('http://127.0.0.1:8077/',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__MOVVA_QA__?.ready&&window.MOVVA_DOM_DEVICE?.poseAt&&window.MOVVA_MOTION,null,{timeout:30000});
   const kinetic=await page.evaluate(({knots})=>{
    const pose=p=>window.MOVVA_DOM_DEVICE.poseAt(p);
    const eps=.0001;
    let largestKnotError=0,maxAngularIncrement=0,minCameraTurn=0;
    for(const k of knots){
     const a=pose(k-eps),m=pose(k),b=pose(k+eps);
     for(let i=0;i<3;i++)largestKnotError=Math.max(largestKnotError,Math.abs((m[i]-a[i])/eps-(b[i]-m[i])/eps));
    }
    let last=pose(0);
    for(let p=.002;p<=1.0001;p+=.002){
     const now=pose(Math.min(1,p));
     maxAngularIncrement=Math.max(maxAngularIncrement,Math.abs(now[0]-last[0]));
     if(p>=.10&&p<=.32)minCameraTurn=Math.max(minCameraTurn,now[0]-last[0]);
     last=now;
    }
    const positions=[0,.035,.10,.16,.215,.26,.32,.66,.92,1].map(p=>({p,angles:pose(p)}));
    const rewind=[.07,.178,.335,.512,.842,.178,.07].map(p=>({p,angles:pose(p)}));
    return {largestKnotError,maxAngularIncrement,minCameraTurn,positions,rewind,engine:MOVVA_3D_STATUS().engine};
   },{knots});
   assert.equal(kinetic.engine,'CSS3D DOM');
   assert.ok(kinetic.largestKnotError<38,'Angular velocity discontinuity at scene keyframe: '+JSON.stringify(kinetic));
   assert.ok(kinetic.maxAngularIncrement<10,'Abnormally fast per-sample rotation: '+JSON.stringify(kinetic));
   assert.ok(kinetic.minCameraTurn<.004,'Camera backspun while rotating to rear: '+JSON.stringify(kinetic));
   const seen=new Map();
   for(const item of kinetic.rewind){
    const saved=seen.get(item.p);
    if(saved)for(let i=0;i<3;i++)assertNear(saved[i],item.angles[i],1e-9,'Pure scroll reversibility');
    else seen.set(item.p,item.angles);
   }
   result.checks+=4;
   result.metrics.push({viewport:label,kinetic:{
    velocityKnotError:+kinetic.largestKnotError.toFixed(4),
    maxAngularIncrement:+kinetic.maxAngularIncrement.toFixed(4),
    minCameraTurn:+kinetic.minCameraTurn.toFixed(5)
   }});
   const seenStates=new Map();
   for(const p of stops){
    await page.evaluate(value=>__MOVVA_QA__.setProgress(value),p);
    await page.waitForFunction(value=>Math.abs(__MOVVA_QA__.progress-value)<.0006,p,{timeout:20000});
    await page.waitForTimeout(100);
    const state=await page.evaluate(()=>{
     const visible=[...document.querySelectorAll('.motion-fragment')]
      .filter(el=>getComputedStyle(el).visibility!=='hidden'&&+getComputedStyle(el).opacity>.30);
     const cards=visible.map(el=>({
      kind:el.dataset.kind,x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,
      depth:parseFloat(el.style.getPropertyValue('--movva-card-depth')),
      transform:el.style.transform
     }));
     return {progress:__MOVVA_QA__.progress,phone:document.querySelector('#css3d-object').style.transform,
      active:document.querySelector('#css3d-device').dataset.chapter, cards};
    });
    assert.ok(state.phone.includes('rotateY('));
    assert.ok(Number.isFinite(state.progress));
    for(const card of state.cards){
     assert.ok(Number.isFinite(card.depth)&&card.depth>=-39&&card.depth<=111,'Invalid Z position: '+JSON.stringify(card));
     assert.ok(card.transform.includes('rotateX(')&&card.transform.includes('translateZ('),'Missing physical tilt: '+JSON.stringify(card));
    }
    if([.178,.335,.512,.67,.842].includes(p))assert.ok(state.cards.some(c=>c.depth>75),label+' has no lifted card at '+p);
    if(seenStates.has(p)){
     const prior=seenStates.get(p);
     assert.equal(state.active,prior.active,'Chapter shifted when reversing');
     const a=+state.phone.match(/rotateY\(([-.0-9]+)deg\)/)[1];
     const b=+prior.phone.match(/rotateY\(([-.0-9]+)deg\)/)[1];
     assertNear(a,b,1.7,'Device turned differently after reversing at '+p);
     for(const old of prior.cards){
      const now=state.cards.find(x=>x.kind===old.kind);
      if(!now)continue;
      assertNear(now.x,old.x,4,'Card X drift after reversing '+old.kind);
      assertNear(now.y,old.y,4,'Card Y drift after reversing '+old.kind);
      assertNear(now.depth,old.depth,1.5,'Card depth drift after reversing '+old.kind);
     }
    }else seenStates.set(p,state);
    result.checks++;
    if(([.178,.335,.67].includes(p)&&label==='desktop')||([.178,.512].includes(p)&&label==='mobile')){
     const shot=label+'-'+p.toFixed(3)+'.png';
     await page.screenshot({path:path.join(root,shot),timeout:20000});
     result.screenshots.push(shot);
    }
   }
   await page.close();
  }
  assert.deepEqual(result.errors,[]);
  result.status='PASS_TECHNICAL_VISUAL_REVIEW_PENDING';
 }catch(e){
  result.status='FAIL';result.failure=e.stack||String(e);process.exitCode=1;
 }finally{
  await browser?.close().catch(()=>{});
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({engine,status:result.status,checks:result.checks,shots:result.screenshots.length,metrics:result.metrics,failure:result.failure},null,2));
 }
})();
