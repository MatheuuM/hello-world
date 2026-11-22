/* Scroll-owned transitions from the opening into Training. */
(() => {
'use strict';
const stage=document.querySelector('#stage'),copy=document.querySelector('.scene-hero .copy'),slot=document.querySelector('.hero-device-slot');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const connected=document.querySelector('#connected'),connectedCopy=connected.querySelector('.copy');
const surface=stage.querySelector('.hero-surface');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let layout=null;
function measure(){
 if(!stage||!copy||!slot)return;
 const s=stage.getBoundingClientRect();
 const r=slot.getBoundingClientRect();
 const copyEnd=connectedCopy.offsetTop+connectedCopy.offsetHeight;
 stage.style.setProperty('--connected-copy-end', copyEnd+'px');
 layout={x:r.left-s.left,y:r.top-s.top,width:r.width,height:r.height,viewportWidth:s.width,viewportHeight:s.height};
 if(layout.width>0&&layout.height>0)stage.style.setProperty('--hero-ground',((layout.y+layout.height+12)/s.height*100).toFixed(2));
}
let previousPhoneProgress,previousReduced;
function positionPhone(p){
 const progress=clamp(p,0,.166);
 if(progress===previousPhoneProgress&&reduced.matches===previousReduced)return;
 // Translate the same handset on the native scroll track, even before its renderer loads.
 const glide=reduced.matches?0:Math.sqrt(progress/.166);
 surface.style.setProperty('--hero-phone-slide',(-5.2*glide).toFixed(3)+'vw');
 surface.style.setProperty('--hero-phone-scale',(1+.08*glide).toFixed(4));
 surface.style.setProperty('--hero-poster-tilt',(-9*glide).toFixed(3)+'deg');
 surface.classList.toggle('hero-front',progress>=.162);
 previousPhoneProgress=progress;
 previousReduced=reduced.matches;
}
let previousProgress;
function visual(p){
 const progress=clamp(p,0,.311);
 const weight=1-ease((progress-.267)/.027);
 if(progress!==previousProgress){
  // Keep one handset visible while the title and palette change.
  stage.classList.toggle('hero-active',progress<.294);
  stage.classList.toggle('hero-transition',progress<.311);
  stage.style.setProperty('--hero-intensity',weight.toFixed(5));
  stage.style.setProperty('--hero-connected-mix',ease((progress-.110)/.056).toFixed(5));
  const openingExit=ease((progress-.081)/.036);
  const connectedEnter=ease((progress-.134)/.036);
  const connectedExit=ease((progress-.235)/.041);
  const connectedAlpha=connectedEnter*(1-connectedExit);
  stage.style.setProperty('--hero-opening-copy-alpha',(1-openingExit).toFixed(5));
  stage.style.setProperty('--hero-opening-copy-y',(-10*openingExit).toFixed(3)+'px');
  stage.style.setProperty('--hero-opening-copy-visibility',openingExit<1?'visible':'hidden');
  stage.style.setProperty('--connected-copy-alpha',connectedAlpha.toFixed(5));
  stage.style.setProperty('--connected-copy-y',(10*(1-connectedEnter)-10*connectedExit).toFixed(3)+'px');
  stage.style.setProperty('--connected-copy-visibility',connectedAlpha>0?'visible':'hidden');
  const trainingReveal=ease((progress-.295)/.016);
  stage.style.setProperty('--hero-hardware-alpha',trainingReveal.toFixed(5));
  previousProgress=progress;
 }
 return weight;
}
function fit(p,pose,compose,halfW,halfH){
 const weight=visual(p);
 if(!weight||!layout||layout.width<=0||layout.height<=0)return pose;
 const {x,y,width:w,height:h,viewportWidth:vw,viewportHeight:vh}=layout;
 const tall=vw<=760;
 const rx=-.055,ry=-.32+.16*ease(p/.085),rz=tall?-.055:-.073;
 const cx=x+w*.5,cy=y+h*.5;
 let scale=Math.min(h/(vh/(2*halfH)*6.20),w/(vw/(2*halfW)*3.10));
 let nx=cx/vw*2-1,ny=1-cy/vh*2;
 // Three bounded projection passes fit the actual rotated 3D bounding volume,
 // including camera protrusion. Not a 2D CSS scaling approximation.
 for(let pass=0;pass<3;pass++){
  const m=compose(nx*halfW,ny*halfH,0,rx,ry,rz,scale);
  const xs=[],ys=[];
  for(const px of [-1.44,1.44])for(const py of [-3.03,3.03])for(const pz of [-.43,.27]){
   const tx=m[0]*px+m[4]*py+m[8]*pz+m[12],ty=m[1]*px+m[5]*py+m[9]*pz+m[13],tz=m[2]*px+m[6]*py+m[10]*pz+m[14];
   xs.push((tx/(halfW*(1-tz/14))+1)*vw/2);ys.push((1-ty/(halfH*(1-tz/14)))*vh/2);
  }
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  nx+=(cx-(left+right)/2)/(vw/2);ny-= (cy-(top+bottom)/2)/(vh/2);
  scale*=Math.min(w*.965/(right-left),h*.965/(bottom-top),1.035);
 }
 const opening=[nx,ny,scale,rx,ry,rz];
 return pose.map((v,i)=>v+(opening[i]-v)*weight);
}
window.MOVVA_HERO={measure,positionPhone,fit,visual,get layout(){return layout?{...layout}:null}};
// Font loading can change the text block's height, especially on an iPhone.
const observer=new ResizeObserver(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
observer.observe(copy);
observer.observe(connectedCopy);
document.fonts?.ready.then(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
})();
