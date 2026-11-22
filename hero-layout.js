/* Scroll-owned cuts from the studio photograph to the app and into Training. */
(() => {
'use strict';
const stage=document.querySelector('#stage'),copy=document.querySelector('.scene-hero .copy'),slot=document.querySelector('.hero-device-slot');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const connected=document.querySelector('#connected'),connectedCopy=connected.querySelector('.copy');
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
let previousProgress;
function visual(p){
 const progress=clamp(p,0,.311);
 const weight=1-ease((progress-.101)/.034);
 if(progress!==previousProgress){
  // Finish each shot before the next phone appears. The renderer can continue
  // positioning the Training screen off-camera during the Connected chapter.
  stage.classList.toggle('hero-active',progress<.135);
  stage.classList.toggle('hero-backdrop',progress<.179);
  stage.classList.toggle('hero-transition',progress<.311);
  stage.style.setProperty('--hero-intensity',weight>0?'1':'0');
  stage.style.setProperty('--hero-cut',((1-weight)*100).toFixed(3)+'%');
  stage.style.setProperty('--connected-copy-alpha',connected.style.opacity||'0');
  const connectedShot=ease((progress-.125)/.021)*(1-ease((progress-.269)/.022));
  stage.style.setProperty('--connected-shot-alpha',connectedShot.toFixed(5));
  const trainingReveal=ease((progress-.289)/.022);
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
window.MOVVA_HERO={measure,fit,visual,get layout(){return layout?{...layout}:null}};
// Font loading can change the text block's height, especially on an iPhone.
const observer=new ResizeObserver(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
observer.observe(copy);
observer.observe(connectedCopy);
document.fonts?.ready.then(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
})();
