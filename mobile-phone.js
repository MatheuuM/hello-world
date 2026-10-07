/* Scroll-native DOM 3D fallback for iOS and browsers without reliable WebGL. */
(() => {
'use strict';
const stage=document.getElementById('stage'),rig=document.getElementById('css3d-device'),device=document.getElementById('css3d-object');
const frames=[...rig.querySelectorAll('.css3d-screen')];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
const tween=(a,b,t)=>a+(b-a)*ease(t);
const rotations=[
 [0,-12,-3,-3], [.10,-12,-3,-3], [.16,-135,1,0], [.215,-171,4,2],
 [.26,-235,4,2], [.32,-346,-2,-2], [.40,-350,1,2],
 [.46,-364,-2,2], [.58,-345,2,-2], [.66,-350,-2,2],
 [.77,-368,2,1], [.84,-379,-2,2], [.92,-385,2,-2], [1,-390,1,0]
];
function poseAt(p){let i=0;while(i<rotations.length-2&&p>rotations[i+1][0])i++;const a=rotations[i],b=rotations[i+1],t=(p-a[0])/(b[0]-a[0]);return a.slice(1).map((v,k)=>tween(v,b[k+1],t))}
const names=['home','training','nutrition','evolution','circle'];
function render(p,active,ix,blend){
 const stageR=stage.getBoundingClientRect(),vw=stage.clientWidth,vh=stage.clientHeight;
 const scene=document.querySelectorAll('.scene')[active],copy=scene?.querySelector('.copy');
 const copyR=copy?.getBoundingClientRect();
 const bar=stage.querySelector('.chapter-bar'),barTop=bar?.getBoundingClientRect().top-stageR.top;
 const mobile=vw<=760;
 let cx,cy,h;
 if(mobile){
  const contentBottom=clamp((copyR?.bottom||vh*.47)-stageR.top+14,135,vh*.82);
  const freeEnd=clamp(barTop-15,250,vh-43),available=Math.max(80,freeEnd-contentBottom);
  h=Math.min(vw<=355?360:410,available*.94);
  h=Math.max(100,h);cx=vw*.5;cy=contentBottom+available*.48;
  if(active===6){h=Math.min(h,250);cy=Math.max(contentBottom+h*.45,Math.min(vh*.78,cy+10));}
 }else{
  const right=active===2||active===3||active===5;
  const left=active===4||active===0||active===1;
  cx=vw*(left?.73:right?.27:.5);cy=vh*.52;h=Math.min(610,vh*.71);
  if(active===6){cx=vw*.5;cy=vh*.73;h=Math.min(300,vh*.38)}
 }
 const w=h*.467;
 rig.style.width=w+'px';rig.style.height=h+'px';rig.style.left=cx+'px';rig.style.top=cy+'px';
 const [ry,rx,rz]=poseAt(p);
 const safeRy=mobile?clamp(ry,-398,-8):ry;
 device.style.transform='rotateY('+safeRy.toFixed(3)+'deg) rotateX('+rx.toFixed(3)+'deg) rotateZ('+rz.toFixed(3)+'deg)';
 frames.forEach((el,i)=>{el.style.opacity=i===ix?String(1-blend):i===ix+1?String(blend):'0'});
 rig.style.opacity=mobile&&h<135?String(clamp((h-100)/35)):'1';
 rig.setAttribute('data-screen',names[ix]||'home');rig.dataset.chapter=String(active);
}
window.MOVVA_DOM_DEVICE={render,get active(){return document.documentElement.classList.contains('dom-device')}};
})();