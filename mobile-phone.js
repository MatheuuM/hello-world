/* Scroll-native DOM 3D fallback for iOS and browsers without reliable WebGL. */
(() => {
'use strict';
const stage=document.getElementById('stage'),rig=document.getElementById('css3d-device'),device=document.getElementById('css3d-object');
const frames=[...rig.querySelectorAll('.css3d-screen')];
const studioFront=rig.querySelector('.css3d-glint');
const studioBack=rig.querySelector('.css3d-back');
const studioDeck=rig.querySelector('.css3d-camera-deck');
const scenes=[...document.querySelectorAll('.scene')],bar=stage.querySelector('.chapter-bar');
const PRO_MAX_ASPECT=78/163.4;
// On every scroll frame the hardware contains hundreds of CSS3D faces.
// Avoid invalidating the entire shell's calc()-driven geometry when its
// width and height did not actually change.
const BASE_WIDTH=170,BASE_HEIGHT=BASE_WIDTH/PRO_MAX_ASPECT;
const last={w:NaN,h:NaN,x:NaN,y:NaN,screen:-1,chapter:-1,rear:null,opacity:null,mode:null,rigTransform:null,pose:null,dolly:1};
const metrics={renders:0,sizeWrites:0,scaleWrites:0,positionWrites:0,screenWrites:0,chapterWrites:0,layoutReads:0};
// Mobile scroll must not force layout after mutating the 3D transform.
// Copy boxes are static across a chapter and can be measured on resize.
const layout={width:0,height:0,viewportW:0,viewportH:0,barTop:0,sceneBottom:[],dirty:true};
function stageLayout(){
 if(!layout.dirty&&layout.viewportW===innerWidth&&layout.viewportH===innerHeight)return layout;
 const rect=stage.getBoundingClientRect();
 layout.width=stage.clientWidth;layout.height=stage.clientHeight;
 layout.viewportW=innerWidth;layout.viewportH=innerHeight;
 layout.barTop=bar?bar.getBoundingClientRect().top-rect.top:layout.height-45;
 layout.sceneBottom=scenes.map(scene=>{
  const box=scene.querySelector('.copy')?.getBoundingClientRect();
  // Avoid following decorative translateY during chapter crossfades.
  const shift=Number(scene.style.transform.match(/translateY\(([-\d.]+)px\)/)?.[1]||0);
  return (box?.bottom??layout.height*.47)-rect.top-shift;
 });
 layout.dirty=false;metrics.layoutReads++;
 return layout;
}
addEventListener('resize',()=>{layout.dirty=true;},{passive:true});
document.fonts?.ready?.then(()=>{layout.dirty=true;});
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
// Monotone cubic interpolation: continuous angular velocity at chapter knots.
// Previous per-keyframe smoothstep forced the phone to stop/start at every beat.
const slope=(i,k)=>{
 if(i<=0||i>=rotations.length-1)return 0; // intentional rest at start and end
 const a=rotations[i-1],b=rotations[i],c=rotations[i+1];
 const left=(b[k]-a[k])/(b[0]-a[0]),right=(c[k]-b[k])/(c[0]-b[0]);
 if(left*right<=0)return 0; // no overshoot through a held pose or change of direction
 const h0=b[0]-a[0],h1=c[0]-b[0],w0=2*h1+h0,w1=h1+2*h0;
 return (w0+w1)/(w0/left+w1/right);
};
const rotations=[
 [0,-12,-3,-3], [.10,-12,-3,-3], [.16,-135,1,0], [.215,-171,4,2],
 [.26,-235,4,2], [.32,-346,-2,-2], [.40,-350,1,2],
 [.46,-364,-2,2], [.58,-345,2,-2], [.66,-350,-2,2],
 [.77,-368,2,1], [.84,-379,-2,2], [.92,-385,2,-2], [1,-390,1,0]
];
function poseAt(p){
 p=clamp(p);
 if(p===1)return rotations[rotations.length-1].slice(1);
 let i=0;
 while(i<rotations.length-2&&p>rotations[i+1][0])i++;
 const a=rotations[i],b=rotations[i+1],h=b[0]-a[0],t=(p-a[0])/h,t2=t*t,t3=t2*t;
 const h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=-2*t3+3*t2,h11=t3-t2;
 return [1,2,3].map(k=>
  h00*a[k]+h10*h*slope(i,k)+h01*b[k]+h11*h*slope(i+1,k)
 );
}
const names=['home','training','nutrition','evolution','circle'];
// Chapter switches are discrete accessibility states; the physical camera is
// not. Positions must be sampled from continuous scroll progress alone.
const desktopMoves=[
 [.216,.334,.73,.27], // Connected -> Training, wider camera move
 [.532,.653,.27,.73], // Nutrition -> Evolution
 [.717,.831,.73,.27], // Evolution -> Circle
 [.906,.983,.27,.50]  // Circle -> closing scene
];
function desktopX(p){
 let value=.73;
 for(const [start,end,from,to] of desktopMoves){
  if(p<start)return value;
  if(p<end)return lerp(from,to,smooth((p-start)/(end-start)));
  value=to;
 }
 return value;
}
const sceneCuts=[.129,.280,.433,.593,.773,.939];
const cutHalfWidths=[.028,.038,.028,.037,.031,.043];
function mobileFrame(sceneIndex,vw,vh,barTop){
 const contentBottom=clamp((layout.sceneBottom[sceneIndex]??vh*.47)+14,135,vh*.82);
 const freeEnd=clamp(barTop-15,250,vh-43),available=Math.max(80,freeEnd-contentBottom);
 let h=Math.max(100,Math.min(vw<=355?385:460,available*.994));
 let cy=contentBottom+available*.48;
 if(sceneIndex===6){
  h=Math.min(h,250);
  cy=Math.max(contentBottom+h*.45,Math.min(vh*.78,cy+10));
 }
 if(h*PRO_MAX_ASPECT>vw*.54)h=vw*.54/PRO_MAX_ASPECT;
 return{cx:vw*.5,cy,h};
}
function mobileCamera(p,vw,vh,barTop){
 let index=0;
 for(let i=0;i<sceneCuts.length;i++){
  const a=sceneCuts[i]-cutHalfWidths[i],b=sceneCuts[i]+cutHalfWidths[i];
  if(p<a)break;
  if(p<=b){
   const from=mobileFrame(i,vw,vh,barTop);
   const to=mobileFrame(i+1,vw,vh,barTop);
   const t=smooth((p-a)/(b-a));
   return{cx:lerp(from.cx,to.cx,t),cy:lerp(from.cy,to.cy,t),h:lerp(from.h,to.h,t)};
  }
  index=i+1;
 }
 return mobileFrame(index,vw,vh,barTop);
}
function desktopCamera(p,vw,vh){
 const close=smooth((p-.906)/(.983-.906));
 return {
  cx:vw*desktopX(p),
  cy:vh*lerp(.52,.73,close),
  h:lerp(Math.min(610,vh*.71),Math.min(300,vh*.38),close)
 };
}
function render(p,active,ix,blend){
const cached=stageLayout(),vw=cached.width,vh=cached.height;
 const mobile=vw<=760,barTop=cached.barTop;
 const {cx,cy,h}=mobile?
   mobileCamera(p,vw,vh,barTop):
  desktopCamera(p,vw,vh);
 const w=h*PRO_MAX_ASPECT;
 metrics.renders++;
 if(mobile){
  if(last.mode!=='compact'){
   rig.style.width=BASE_WIDTH+'px';rig.style.height=BASE_HEIGHT+'px';
   window.MOVVA_SHELL?.setSize(BASE_WIDTH,BASE_HEIGHT);
   last.mode='compact';metrics.sizeWrites++;
  }
  const transform='translate(-50%,-50%) scale('+(h/BASE_HEIGHT).toFixed(6)+')';
  if(transform!==last.rigTransform){
   rig.style.transform=transform;last.rigTransform=transform;metrics.scaleWrites++;
  }
  last.w=w;last.h=h;
 }else{
  if(last.mode!=='desktop'){
   rig.style.transform='translate(-50%,-50%)';last.rigTransform=null;
   last.mode='desktop';last.w=NaN;last.h=NaN;
  }
  if(Math.abs(w-last.w)>.001||Math.abs(h-last.h)>.001||!Number.isFinite(last.w)){
   rig.style.width=w+'px';rig.style.height=h+'px';
   window.MOVVA_SHELL?.setSize(w,h);
   last.w=w;last.h=h;metrics.sizeWrites++;
  }
 }
 if(Math.abs(cx-last.x)>.001||Math.abs(cy-last.y)>.001||!Number.isFinite(last.x)){
  rig.style.left=cx+'px';rig.style.top=cy+'px';
  last.x=cx;last.y=cy;metrics.positionWrites++;
 }
 const [ry,rx,rz]=poseAt(p);
 const safeRy=mobile?clamp(ry,-398,-8):ry;
 // 6A: a restrained studio-camera dolly over the flagship rear module.
 // Transform the assembled object, not the shell width; this preserves
 // Stage 5A's inexpensive static CSS3D geometry and Stage 4C framing.
 const rearShow=smooth((p-.112)/.055)*(1-smooth((p-.224)/.085));
 const dolly=1+.032*rearShow;
 last.pose=[safeRy,rx,rz];last.dolly=dolly;
 device.style.transform='rotateY('+safeRy.toFixed(3)+'deg) rotateX('+rx.toFixed(3)+'deg) rotateZ('+rz.toFixed(3)+'deg) scale('+dolly.toFixed(5)+')';
 // Studio specular ribbons move in lockstep with the scroll in physical
 // device coordinates. No time-based animations or full-screen blur.
 const sheen=(p*160-80).toFixed(2)+'%';
 const frontIntensity=(.16+.15*smooth((p-.29)/.075)).toFixed(3);
 const cameraIntensity=(.22+.29*rearShow).toFixed(3);
 if(!mobile){
 if(studioFront){
  studioFront.style.setProperty('--movva-sheen-x',sheen);
  studioFront.style.setProperty('--movva-sheen-opacity',frontIntensity);
 }
 if(studioBack){
  studioBack.style.setProperty('--movva-sheen-x',sheen);
  studioBack.style.setProperty('--movva-sheen-opacity',cameraIntensity);
 }
 if(studioDeck){
  studioDeck.style.setProperty('--movva-sheen-x',sheen);
  studioDeck.style.setProperty('--movva-sheen-opacity',cameraIntensity);
 }
 }
 window.MOVVA_SHELL?.setPose(safeRy,rx,rz);
 const selected=Math.min(frames.length-1,ix+(blend>=.5?1:0));
 if(selected!==last.screen){
  frames.forEach((el,i)=>{el.style.display=i===selected?'block':'none';el.style.opacity='1';});
  last.screen=selected;metrics.screenWrites++;
 }
 const degrees=((-safeRy%360)+360)%360;
 const rear=degrees>92&&degrees<268;
 if(rear!==last.rear){
  rig.querySelector('.css3d-front').style.visibility=rear?'hidden':'visible';
  rig.querySelector('.css3d-back').style.visibility=rear?'visible':'hidden';
  last.rear=rear;
 }
 const opacity=mobile&&h<135?String(clamp((h-100)/35)):'1';
 if(opacity!==last.opacity){rig.style.opacity=opacity;last.opacity=opacity;}
 if(last.screen===selected&&rig.dataset.screen!==names[selected])rig.dataset.screen=names[selected]||'home';
 if(active!==last.chapter){rig.dataset.chapter=String(active);last.chapter=active;metrics.chapterWrites++;}
}
// Project a point in the screenshot (0-1 UV) through the actual CSS3D
// camera pose. It is computed from the same transforms, with no per-frame
// getBoundingClientRect on the hundreds of shell faces.
function projectScreenPoint(u,v){
 if(!last.pose||!Number.isFinite(last.x)||!Number.isFinite(last.h))return null;
 const mobile=last.mode==='compact';
 const width=mobile?BASE_WIDTH:last.w,height=mobile?BASE_HEIGHT:last.h;
 const frameInset=width*(.0092+.021);
 const x0=(u-.5)*(width-2*frameInset),y0=(v-.5)*(height-2*frameInset);
 const z0=width*.056;
 const [ry,rx,rz]=last.pose.map(angle=>angle*Math.PI/180);
 const cy=Math.cos(ry),sy=Math.sin(ry);
 const cx=Math.cos(rx),sx=Math.sin(rx);
 const cz=Math.cos(rz),sz=Math.sin(rz);
 const x1=x0*cz-y0*sz,y1=x0*sz+y0*cz;
 const y2=y1*cx-z0*sx,z2=y1*sx+z0*cx;
 const x3=x1*cy+z2*sy,z3=-x1*sy+z2*cy;
 const zoom=last.dolly||1, perspective=1200/(1200-z3*zoom);
 const outer=mobile?last.h/BASE_HEIGHT:1;
 return {
  x:last.x+outer*x3*zoom*perspective,
  y:last.y+outer*y2*zoom*perspective,
  normal:cy*cx,
  u,v
 };
}
window.MOVVA_DOM_DEVICE={render,poseAt,projectScreenPoint,get visualSize(){return{w:last.w,h:last.h,x:last.x,y:last.y}},get metrics(){return {...metrics}},get layout(){return stageLayout()},get active(){return document.documentElement.classList.contains('dom-device')}};
})();