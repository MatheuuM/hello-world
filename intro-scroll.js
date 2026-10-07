/* Stage 4 — only Hero → Connected → Training (0.08 < p < 0.435).
 * One reversible scroll clock. No wheel listeners, autoplay, new UI data or assets.
 * Initial Stage 3 hero and every chapter from Nutrition onwards remain unchanged.
 */
(() => {
'use strict';
const stage=document.querySelector('#stage');
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*v*(v*(v*6-15)+10);};
const ramp=(p,a,b)=>ease((p-a)/(b-a));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const copies=[...document.querySelectorAll('.scene .copy')].slice(0,3);
const pillars=[...document.querySelectorAll('.scene-connected .pillars span')];
const modes=[...document.querySelectorAll('.scene-training .modality-list span')];
const detail=document.querySelector('.scene-training .micro-note');
let layout=null,opening=null,touched=false;
function measure(){
 const vw=stage.clientWidth,vh=stage.clientHeight;if(!vw||!vh)return;
 const tall=vw<=760,gutter=parseFloat(getComputedStyle(stage).getPropertyValue('--gutter'))||24;
 // Always reserve the same navigation height; class changes while scrolling must not resize the camera slot.
 const bottom=vh-(tall?36:34)-30;
 const header=document.querySelector('.header').offsetHeight;
 const top=tall?Math.max(...copies.map(c=>c.parentElement.offsetTop+c.offsetTop+c.offsetHeight))+23:Math.max(header+30,112);
 const common={y:top,height:Math.max(80,bottom-top),viewportWidth:vw,viewportHeight:vh};
 const w=tall?vw-2*32:Math.min(vw*.37,vw-gutter*2);
 layout={tall,right:{...common,x:tall?32:vw-gutter-w,width:w},left:{...common,x:tall?32:gutter,width:w}};
 opening=null;
}
function bounds(pose,compose,hw,hh){
 const [nx,ny,s,rx,ry,rz]=pose,m=compose(nx*hw,ny*hh,0,rx,ry,rz,s),xs=[],ys=[],vw=stage.clientWidth,vh=stage.clientHeight;
 for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){
  const px=m[0]*x+m[4]*y+m[8]*z+m[12],py=m[1]*x+m[5]*y+m[9]*z+m[13],pz=m[2]*x+m[6]*y+m[10]*z+m[14];
  xs.push((px/(hw*(1-pz/14))+1)*vw/2);ys.push((1-py/(hh*(1-pz/14)))*vh/2);
 }
 return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
}
function fitSlot(slot,angles,compose,hw,hh){
 const {x,y,width:w,height:h,viewportWidth:vw,viewportHeight:vh}=slot,cx=x+w/2,cy=y+h/2;
 let pose=[cx/vw*2-1,1-cy/vh*2,Math.min(h/(vh/(2*hh)*6.25),w/(vw/(2*hw)*3.13)),...angles];
 for(let n=0;n<3;n++){
  const r=bounds(pose,compose,hw,hh);
  pose[0]+=(cx-(r.left+r.right)/2)/(vw/2);pose[1]-=(cy-(r.top+r.bottom)/2)/(vh/2);
  pose[2]*=Math.min(w*.96/(r.right-r.left),h*.96/(r.bottom-r.top),1.025);
 }
 return pose;
}
// Quintic camera beats: the pause at each composition is intentional reading time.
// Right/rear → edge-on crossing → left/front. The phone crosses after copy leaves.
const beats=[
 [.135,0,[-.05,1.23,-.025]], [.187,0,[-.075,3.22,.033]],
 [.225,0,[-.065,3.46,.042]], [.253,0,[-.04,4.00,.015]],
 [.279,.50,[.075,4.96,-.035]], [.309,1,[-.045,6.48,.060]],
 [.365,1,[-.060,6.62,-.038]], [.401,1,[-.035,6.52,-.025]]
];
function fit(p,base,compose,hw,hh){
 if(p<=.08||p>=.435||!layout)return base;
 // Derive an immutable hand-off from the measured, approved Stage 3 opening.
 if(!opening){opening=window.MOVVA_HERO.fit(.08,base,compose,hw,hh);window.MOVVA_HERO.fit(p,base,compose,hw,hh);}
 const at=b=>fitSlot(mixSlot(b[1]),b[2],compose,hw,hh);
 let result;
 if(p<beats[0][0])result=mix(opening,at(beats[0]),ramp(p,.08,beats[0][0]));
 else {
  let i=0;while(i<beats.length-2&&p>beats[i+1][0])i++;
  result=mix(at(beats[i]),at(beats[i+1]),ramp(p,beats[i][0],beats[i+1][0]));
 }
 // Exact identity outside this scope, including all later chapter poses.
 return mix(result,base,ramp(p,.401,.435));
}
function mixSlot(t){const a=layout.right,b=layout.left;return {...a,x:a.x+(b.x-a.x)*t,width:a.width+(b.width-a.width)*t};}
function weights(p,base){
 if(p<=.08||p>=.435)return base;
 const w=[...base];
 w[0]=1-ramp(p,.09,.138);
 w[1]=ramp(p,.124,.159)*(1-ramp(p,.229,.266));
 w[2]=ramp(p,.286,.314)*(1-ramp(p,.400,.435));
 return w;
}
function active(p,fallback){return p>.08&&p<.435?(p<.129?0:p<.28?1:p<.433?2:fallback):fallback;}
function background(p,base){
 if(p<=.12||p>=.435)return base;
 let color=p<.225?mix([242,239,230],[234,232,220],ramp(p,.12,.225)):mix([234,232,220],[35,43,34],ramp(p,.235,.302));
 return mix(color,base,ramp(p,.409,.435)).map(Math.round);
}
function screen(p){
 if(p<=.08||p>=.31)return null;
 return p<.264?{ix:0,blend:0}:p<.289?{ix:0,blend:ramp(p,.264,.289)}:{ix:1,blend:0};
}
function panel(p,chapter,a){return chapter===2&&p<.435?ramp(p,.319,.349)*(1-ramp(p,.387,.418)):a;}
function visual(p){
 const on=p>.08&&p<.435;stage.classList.toggle('intro-active',on);
 if(!on){reset();return;}
 touched=true;
 // Keep the header and copy contrast in sync with the actual ambient transition.
 const dark=p>=.272;stage.classList.toggle('dark',dark);document.querySelector('.header').classList.toggle('dark',dark);
 stage.style.setProperty('--intro-quiet',String(1-ramp(p,.40,.435)));
 pillars.forEach((el,i)=>{const t=ramp(p,.159+i*.009,.186+i*.009);el.style.opacity=String(.42+.58*t);el.style.transform=`translateY(${(1-t)*7}px)`;});
 modes.forEach((el,i)=>{const t=ramp(p,.313+i*.008,.337+i*.008);el.style.opacity=String(t);el.style.transform=`translateY(${(1-t)*8}px)`;});
 detail.style.opacity=String(ramp(p,.348,.375));
}
function reset(){
 stage.classList.remove('intro-active');
 if(!touched)return;touched=false;
 stage.style.removeProperty('--intro-quiet');
 [...pillars,...modes,detail].forEach(el=>{el.style.removeProperty('opacity');el.style.removeProperty('transform');});
}
window.MOVVA_INTRO={measure,fit,weights,active,background,screen,panel,visual,reset,get layout(){return layout;}};
const observer=new ResizeObserver(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
copies.forEach(c=>observer.observe(c));
document.fonts?.ready.then(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
})();
