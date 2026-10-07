/* Stage 3: fit the opening hardware into a measured editorial slot.
 * Active only before progress .13. No changes to subsequent scenes or textures.
 * The device uses the same WebGL geometry and perspective camera as Stage 2.
 */
(() => {
'use strict';
const stage=document.querySelector('#stage'),copy=document.querySelector('.scene-hero .copy'),slot=document.querySelector('.hero-device-slot');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
let layout=null;
function measure(){
 if(!stage||!copy||!slot)return;
 const s=stage.getBoundingClientRect();
 // offsetTop/offsetHeight avoid the scrolling scene's transient transform.
 const top=copy.parentElement.offsetTop+copy.offsetTop+copy.offsetHeight+24;
 stage.style.setProperty('--hero-slot-top',Math.round(top)+'px');
 const r=slot.getBoundingClientRect();
 layout={x:r.left-s.left,y:r.top-s.top,width:r.width,height:r.height,viewportWidth:s.width,viewportHeight:s.height};
 if(layout.width>0&&layout.height>0)stage.style.setProperty('--hero-ground',((layout.y+layout.height+12)/s.height*100).toFixed(2));
}
function fit(p,pose,compose,halfW,halfH){
 const weight=1-ease((p-.085)/.045);
 stage.classList.toggle('hero-active',p<.13);
 stage.style.setProperty('--hero-intensity',weight.toFixed(5));
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
window.MOVVA_HERO={measure,fit,get layout(){return layout?{...layout}:null}};
// Font loading can change the text block's height, especially on an iPhone.
const observer=new ResizeObserver(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
observer.observe(copy);
document.fonts?.ready.then(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
})();
