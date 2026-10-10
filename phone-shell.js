/* MOVVA Stage 1A — parametric rounded perimeter shared by both bevels and sidewall.
   Hardware geometry only. App screenshots remain swappable assets. */
(()=>{
'use strict';
const rig=document.getElementById('css3d-device');
const device=document.getElementById('css3d-object');
const shell=device?.querySelector('.css3d-unibody');
if(!rig||!device||!shell)return;
// Apple 18 Pro Max physical ratio: 78 / 163.4 (MOVVA-exclusive finish).
const PRO_MAX_RATIO=78/163.4;
const W=170,H=W/PRO_MAX_RATIO,RX=W*.135,RY=H*.063,CORNER=14;
// Each tangent is sized to the true contour; excessive strip overlap caused
// visibly folded corners when CSS transformed the individual faces.
const FACE=.056,WALL=.038,INSET=.0092;
const STRAIGHT_OVERLAP=.16,CURVE_OVERLAP=.055,DEPTH_OVERLAP=.02;
const contour=[],pt=(x,y)=>contour.push({x,y});
pt(-W/2+RX,-H/2);pt(W/2-RX,-H/2);
const corners=[
 [W/2-RX,-H/2+RY,-Math.PI/2,0],
 [W/2-RX,H/2-RY,0,Math.PI/2],
 [-W/2+RX,H/2-RY,Math.PI/2,Math.PI],
 [-W/2+RX,-H/2+RY,Math.PI,1.5*Math.PI]
];
for(let c=0;c<4;c++){
 const [cx,cy,a,b]=corners[c];
 for(let j=1;j<=CORNER;j++){const t=a+(b-a)*j/CORNER;pt(cx+RX*Math.cos(t),cy+RY*Math.sin(t));}
 if(c===0)pt(W/2,H/2-RY);
 if(c===1)pt(-W/2+RX,H/2);
 if(c===2)pt(-W/2,-H/2+RY);
}
pt(-W/2+RX,-H/2);
const layers=[
 {aZ:-FACE,bZ:-WALL,aInset:INSET,bInset:0,className:'rear'},
 {aZ:-WALL,bZ:WALL,aInset:0,bInset:0,className:'wall'},
 {aZ:WALL,bZ:FACE,aInset:0,bInset:INSET,className:'front'}
];
// A shared directional light is sampled per tangent (not per repeated CSS tile).
// This keeps the highlight continuous as the phone turns past each corner.
const palette={
 rear:[[61,68,62],[106,114,104],[93,100,91]],
 wall:[[62,69,63],[139,148,133],[83,91,82]],
 front:[[84,91,83],[173,181,166],[107,115,105]]
};
const tone=(rgb,shade)=>'rgb('+rgb.map(v=>Math.round(Math.max(0,Math.min(255,v*shade)))).join(',')+')';
let count=0;
for(let i=0;i<contour.length-1;i++){
 const a=contour[i],b=contour[i+1],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);
 if(L<.000001)continue;
 const tangent=Math.atan2(dy,dx)*180/Math.PI,outX=dy/L,outY=-dx/L;
 for(const layer of layers){
  const inset=(layer.aInset+layer.bInset)*W*.5;
  const x=(a.x+b.x)*.5-outX*inset,y=(a.y+b.y)*.5-outY*inset;
  const dz=(layer.bZ-layer.aZ)*W,di=(layer.bInset-layer.aInset)*W;
  const height=Math.hypot(dz,di),angle=Math.atan2(dz,di)*180/Math.PI;
  const z=(layer.aZ+layer.bZ)*.5;
  const isStraight=i===0||(i-1)%(CORNER+1)===CORNER;
  const overlap=isStraight?STRAIGHT_OVERLAP:CURVE_OVERLAP;
  const light=Math.max(.72,Math.min(1.12,.87+.23*(-.65*outX-.76*outY)));
  const colors=palette[layer.className];
  const piece=document.createElement('i');
  piece.className='css3d-shell-face css3d-shell-face--'+layer.className;
  piece.setAttribute('aria-hidden','true');
  piece.style.width='calc(var(--shell-w) * '+(L/W).toFixed(9)+' + '+overlap+'px)';
  piece.style.height='calc(var(--shell-w) * '+(height/W).toFixed(9)+' + '+DEPTH_OVERLAP+'px)';
  piece.style.background='linear-gradient(180deg,'+tone(colors[0],light)+' 0%,'+tone(colors[1],light)+' 48%,'+tone(colors[2],light)+' 100%)';
  piece.style.transform='translate3d(calc(var(--shell-w) * '+(x/W).toFixed(9)+'),calc(var(--shell-h) * '+(y/H).toFixed(9)+'),calc(var(--shell-w) * '+z.toFixed(9)+')) rotateZ('+tangent.toFixed(5)+'deg) rotateX('+angle.toFixed(5)+'deg) translate(-50%,-50%)';
  shell.appendChild(piece);count++;
 }
}
for(const b of [{x:-.504,y:-.218,h:.115},{x:-.504,y:-.089,h:.115},{x:.504,y:-.17,h:.14}]){
 const el=document.createElement('i');
 el.className='css3d-control css3d-control--'+(b.x<0?'left':'right');
 el.style.height='calc(var(--shell-h) * '+b.h+')';
 el.style.transform='translate3d(calc(var(--shell-w) * '+b.x+'),calc(var(--shell-h) * '+b.y+'),0) rotateY('+(b.x<0?-90:90)+'deg) translate(-50%,-50%)';
 device.appendChild(el);
}
// Physical camera-plateau walls. Unlike a shadow, their side faces occlude and
// change perspective during the scroll rotation; radius remains round in profile.
const camera=device.querySelector('.css3d-camera-rig .css3d-camera');
let cameraWallCount=0;
if(camera){
 const pw=W*.939,ph=pw/1.88,pr=W*.105,steps=11;
 const profile=[],add=(x,y)=>profile.push({x,y});
 add(-pw/2+pr,-ph/2);add(pw/2-pr,-ph/2);
 const corners=[
  [pw/2-pr,-ph/2+pr,-Math.PI/2,0],
  [pw/2-pr,ph/2-pr,0,Math.PI/2],
  [-pw/2+pr,ph/2-pr,Math.PI/2,Math.PI],
  [-pw/2+pr,-ph/2+pr,Math.PI,Math.PI*1.5]
 ];
 for(let c=0;c<4;c++){
  const [cx,cy,start,end]=corners[c];
  for(let j=1;j<=steps;j++){const theta=start+(end-start)*j/steps;add(cx+pr*Math.cos(theta),cy+pr*Math.sin(theta));}
  if(c===0)add(pw/2,ph/2-pr);
  if(c===1)add(-pw/2+pr,ph/2);
  if(c===2)add(-pw/2,-ph/2+pr);
 }
 add(-pw/2+pr,-ph/2);
 for(let i=0;i<profile.length-1;i++){
  const a=profile[i],b=profile[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  if(len<.00001)continue;
  const wall=document.createElement('span');
  wall.className='css3d-camera-wall-face';wall.setAttribute('aria-hidden','true');
  wall.style.width='calc(var(--shell-w) * '+(len/W).toFixed(9)+' + .10px)';
  wall.style.height='calc(var(--shell-w) * .021 + .10px)';
  wall.style.transform='translate3d(calc(var(--shell-w) * '+((a.x+b.x)/(2*W)).toFixed(9)+'),calc(var(--shell-w) * '+((a.y+b.y)/(2*W)).toFixed(9)+'),calc(var(--shell-w) * .0145)) rotateZ('+(Math.atan2(dy,dx)*180/Math.PI).toFixed(4)+'deg) rotateX(90deg) translate(-50%,-50%)';
  const n=dx/(len||1),light=.84+.17*n;
  wall.style.filter='brightness('+light.toFixed(3)+')';
  camera.insertBefore(wall,camera.querySelector('.css3d-camera-deck'));
  cameraWallCount++;
 }
}
function setSize(w,h){rig.style.setProperty('--shell-w',w.toFixed(3)+'px');rig.style.setProperty('--shell-h',h.toFixed(3)+'px')}
setSize(W,H);

const ua=navigator.userAgent||'';
const isWebKit=/AppleWebKit/i.test(ua)&&(!/(?:Chrome|Chromium|Edg|OPR|SamsungBrowser)/i.test(ua)||/iPhone|iPad|iPod/i.test(ua));
const profile=document.createElement('div');
profile.className='css3d-webkit-profile';
profile.setAttribute('aria-hidden','true');
profile.innerHTML='<i class="profile-button"></i><i class="profile-button"></i>';
rig.appendChild(profile);
if(isWebKit)rig.classList.add('css3d-webkit-engine');
function setPose(ry,rx,rz){
 if(!isWebKit)return;
 const a=ry*Math.PI/180,c=Math.abs(Math.cos(a)),sin=Math.sin(a);
 const t=Math.max(0,Math.min(1,(.68-c)/.58)),fade=t*t*(3-2*t);
 const width=parseFloat(rig.style.getPropertyValue('--shell-w'))||W;
 const projected=width*c+width*FACE*2*Math.abs(sin);
 const sign=Math.sign(-sin*Math.cos(a))||1;
 const shift=sign*Math.max(0,(projected-width*FACE*2)*.5);
 profile.style.opacity=fade.toFixed(4);
 profile.style.transform='translateX(calc(-50% + '+shift.toFixed(3)+'px)) rotateZ('+rz.toFixed(3)+'deg) rotateX('+rx.toFixed(3)+'deg)';
}

window.MOVVA_SHELL={setSize,setPose,isWebKit,partCount:count,edgeCount:count/layers.length,layerCount:layers.length,bodyDepthFactor:FACE*2,cornerSegments:CORNER,curveOverlapPx:CURVE_OVERLAP,cameraWallCount,referenceAspectRatio:PRO_MAX_RATIO,
 get width(){return parseFloat(rig.style.getPropertyValue('--shell-w'))||W},
 get height(){return parseFloat(rig.style.getPropertyValue('--shell-h'))||H}
};
})();