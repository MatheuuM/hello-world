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
const compact=matchMedia('(max-width:760px)').matches;
const legacyGeometry=new URLSearchParams(location.search).get('quality')==='legacy';
const ua=navigator.userAgent||'';
const isWebKit=/AppleWebKit/i.test(ua)&&(!/(?:Chrome|Chromium|Edg|OPR|SamsungBrowser)/i.test(ua)||/iPhone|iPad|iPod/i.test(ua));
const composeSurfaces=isWebKit&&!legacyGeometry;
const surfacePose=composeSurfaces ? 'var(--shell-pose) ' : '';
if(isWebKit)rig.classList.add('css3d-webkit-engine');
rig.classList.toggle('movva-legacy-geometry',legacyGeometry);
rig.classList.toggle('movva-physical-shell',!legacyGeometry);
const W=170,H=W/PRO_MAX_RATIO;
const FACE=.056,WALL=.038,INSET=.0092;
const frontAperture={faceInset:INSET,x:.0355,y:.0155};
rig.style.setProperty('--shell-face-inset',String(frontAperture.faceInset));
rig.style.setProperty('--chapter-glass-inset-x',(frontAperture.x*100)+'%');
rig.style.setProperty('--chapter-glass-inset-y',(frontAperture.y*100)+'%');

// Front glass, back plate and side walls share the same rounded perimeter.
const edgeInset=legacyGeometry ? 0 : W*INSET;
const halfW=W/2-edgeInset,halfH=H/2-edgeInset;
const rx=W*(legacyGeometry ? .135 : .158)-edgeInset;
const ry=(legacyGeometry ? H*.063 : W*.158)-edgeInset;
const CORNER=legacyGeometry ? (compact ? 10 : 14) : (compact ? 7 : 12);
const STRAIGHT_OVERLAP=.16,CURVE_OVERLAP=legacyGeometry ? .055 : .18,DEPTH_OVERLAP=.02;
const contour=[],pt=(x,y)=>contour.push({x,y});
pt(-halfW+rx,-halfH);pt(halfW-rx,-halfH);
const corners=[
 [halfW-rx,-halfH+ry,-Math.PI/2,0],
 [halfW-rx,halfH-ry,0,Math.PI/2],
 [-halfW+rx,halfH-ry,Math.PI/2,Math.PI],
 [-halfW+rx,-halfH+ry,Math.PI,1.5*Math.PI]
];
for(let c=0;c<4;c++){
 const [cx,cy,a,b]=corners[c];
 for(let j=1;j<=CORNER;j++){const t=a+(b-a)*j/CORNER;pt(cx+rx*Math.cos(t),cy+ry*Math.sin(t));}
 if(c===0)pt(halfW,halfH-ry);
 if(c===1)pt(-halfW+rx,halfH);
 if(c===2)pt(-halfW,-halfH+ry);
}
pt(-halfW+rx,-halfH);
const layers=!legacyGeometry||compact?
 [{aZ:-FACE,bZ:FACE,aInset:0,bInset:0,className:'wall'}]:
 [
  {aZ:-FACE,bZ:-WALL,aInset:INSET,bInset:0,className:'rear'},
  {aZ:-WALL,bZ:WALL,aInset:0,bInset:0,className:'wall'},
  {aZ:WALL,bZ:FACE,aInset:0,bInset:INSET,className:'front'}
 ];
// A shared directional light is sampled per tangent (not per repeated CSS tile).
// This keeps the highlight continuous as the phone turns past each corner.
const palette={
 rear:[[58,57,60],[174,171,169],[88,86,89]],
 wall:[[58,57,61],[201,198,195],[91,89,92]],
 front:[[82,80,83],[218,215,212],[110,107,110]]
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
  piece.style.background=legacyGeometry?
   'linear-gradient(180deg,'+tone(colors[0],light)+' 0%,'+tone(colors[1],light)+' 48%,'+tone(colors[2],light)+' 100%)':
   'linear-gradient(180deg,'+tone([109,113,119],light)+' 0%,'+tone([220,224,228],light)+' 24%,'+tone([148,151,157],light)+' 68%,'+tone([68,71,77],light)+' 100%)';
  piece.style.transform=surfacePose+'translate3d(calc(var(--shell-w) * '+(x/W).toFixed(9)+'),calc(var(--shell-h) * '+(y/H).toFixed(9)+'),calc(var(--shell-w) * '+z.toFixed(9)+')) rotateZ('+tangent.toFixed(5)+'deg) rotateX('+angle.toFixed(5)+'deg) translate(-50%,-50%)';
  shell.appendChild(piece);count++;
 }
}
// Five independent mechanical controls: action, volume up/down, lock, camera.
for(const b of [
 {x:-.504,y:-.312,h:.047,kind:'action'},
 {x:-.504,y:-.216,h:.095,kind:'volume'},
 {x:-.504,y:-.090,h:.095,kind:'volume'},
 {x:.504,y:-.178,h:.146,kind:'lock'},
 {x:.504,y:.210,h:.073,kind:'camera-control'}
]){
 const x=legacyGeometry ? b.x : Math.sign(b.x)*(.5-INSET+.003);
 const el=document.createElement('i');
 el.className='css3d-control css3d-control--'+(b.x<0?'left':'right')+' css3d-control--'+b.kind;
 el.style.height='calc(var(--shell-h) * '+b.h+')';
 el.style.transform=surfacePose+'translate3d(calc(var(--shell-w) * '+x+'),calc(var(--shell-h) * '+b.y+'),0) rotateY('+(b.x<0?-90:90)+'deg) translate(-50%,-50%)';
 device.appendChild(el);
}
// Bottom-edge cutouts, visible only as the handset tilts away from camera.
// Keep these in the device coordinate system, not as UI overlays.
for(const klass of ['css3d-port','css3d-speakers']){
 const e=document.createElement('span');
 e.className=klass;e.setAttribute('aria-hidden','true');
 device.appendChild(e);
}
for(const side of [-1,1]){
 const x=side*(legacyGeometry ? .499 : .5-INSET+.0008);
 for(const y of [-.333,.333]){
  const seam=document.createElement('i');
  seam.className='css3d-antenna';seam.setAttribute('aria-hidden','true');
  seam.style.transform=surfacePose+'translate3d(calc(var(--shell-w) * '+x+'),calc(var(--shell-h) * '+y+'),0) rotateY('+(x<0?-90:90)+'deg) translate(-50%,-50%)';
  device.appendChild(seam);
 }
}
// Camera plateau walls use a center transform origin. Center them in the
// parent plane *before* rotation; doing this after rotateZ/rotateX applies the
// half-width offset in rotated axes and ejects long side/bottom faces outside
// the handset (visible as vertical bars and dotted detached rays).
// Physical camera-plateau walls. Unlike a shadow, their side faces occlude and
// change perspective during the scroll rotation; radius remains round in profile.
const camera=device.querySelector('.css3d-camera-rig .css3d-camera');
let cameraWallCount=0;
if(camera){
 const pw=W*.939,ph=pw/1.88,pr=W*.105,steps=legacyGeometry ? (compact ? 8 : 11) : (compact ? 4 : 6);
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
  wall.style.transform='translate3d(calc(var(--shell-w) * '+((a.x+b.x)/(2*W)).toFixed(9)+'),calc(var(--shell-w) * '+((a.y+b.y)/(2*W)).toFixed(9)+'),calc(var(--shell-w) * .0145)) translate(-50%,-50%) rotateZ('+(Math.atan2(dy,dx)*180/Math.PI).toFixed(4)+'deg) rotateX(90deg)';
  const n=dx/(len||1),light=.84+.17*n;
  wall.style.background='linear-gradient(180deg,'+tone([209,205,202],light)+' 0%,'+tone([155,151,151],light)+' 30%,'+tone([80,79,82],light)+' 90%)';
  camera.insertBefore(wall,camera.querySelector('.css3d-camera-deck'));
  cameraWallCount++;
 }
}
function setSize(w,h){rig.style.setProperty('--shell-w',w.toFixed(3)+'px');rig.style.setProperty('--shell-h',h.toFixed(3)+'px')}
setSize(W,H);

let profile;
if(legacyGeometry){
 profile=document.createElement('div');
 profile.className='css3d-webkit-profile';
 profile.setAttribute('aria-hidden','true');
 profile.innerHTML=[
  '<span class="profile-camera-ledge"></span>',
  '<i class="profile-button profile-button--action" data-side="left"></i>',
  '<i class="profile-button profile-button--volume-up" data-side="left"></i>',
  '<i class="profile-button profile-button--volume-down" data-side="left"></i>',
  '<i class="profile-button profile-button--lock" data-side="right"></i>',
  '<i class="profile-button profile-button--camera-control" data-side="right"></i>',
  '<i class="profile-antenna profile-antenna--top"></i>',
  '<i class="profile-antenna profile-antenna--bottom"></i>'
 ].join('');
 rig.appendChild(profile);
}
let lastSurfacePose;
function setPose(ry,rx,rz){
 if(composeSurfaces){
  // Combining the global pose and the local face transform avoids WebKit
  // flattening the nested wall group into the front plane at a quarter turn.
  const livePose=device.style.transform;
  if(livePose&&livePose!==lastSurfacePose){
   rig.style.setProperty('--shell-pose',livePose);
   lastSurfacePose=livePose;
  }
  return;
 }
 if(!isWebKit||!profile)return;
 const radians=ry*Math.PI/180;
 const facing=Math.abs(Math.cos(radians)),sin=Math.sin(radians);
 const side=sin<=0?'right':'left';
 // Safari clips some nested CSS 3D faces at edge-on angles. Avoid a double
 // silhouette: render real geometry until the near-profile crossover, then
 // replace the WHOLE device with a physically sized metallic edge view.
 // The handoff is deterministic from scroll progress; no autoplay or timers.
 const useProfile=facing<=.21;
 if(profile.dataset.side!==side)profile.dataset.side=side;
 rig.classList.toggle('css3d-profile-active',useProfile);
 if(!useProfile){
  if(profile.style.visibility!=='hidden')profile.style.visibility='hidden';
  return;
 }
 const width=parseFloat(rig.style.getPropertyValue('--shell-w'))||W;
 const projected=width*(facing+FACE*2*Math.abs(sin));
 // Match the current projected device silhouette. No translation from the
 // center: the previous side shift detached the safety rail from the handset.
 profile.style.width=projected.toFixed(3)+'px';
 profile.style.opacity='1';
 profile.style.visibility='visible';
 profile.style.transform='translateX(-50%) rotateZ('+rz.toFixed(3)+'deg) rotateX('+rx.toFixed(3)+'deg)';
}

window.MOVVA_SHELL={setSize,setPose,frontAperture,isWebKit,composeSurfaces,compact,legacyGeometry,fastEdgeCount:0,partCount:count,edgeCount:count/layers.length,layerCount:layers.length,bodyDepthFactor:FACE*2,cornerSegments:CORNER,curveOverlapPx:CURVE_OVERLAP,cameraWallCount,referenceAspectRatio:PRO_MAX_RATIO,
 get width(){return parseFloat(rig.style.getPropertyValue('--shell-w'))||W},
 get height(){return parseFloat(rig.style.getPropertyValue('--shell-h'))||H}
};
})();