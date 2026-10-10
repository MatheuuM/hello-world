/* MOVVA Stage 1A — parametric rounded perimeter shared by both bevels and sidewall.
   Hardware geometry only. App screenshots remain swappable assets. */
(()=>{
'use strict';
const rig=document.getElementById('css3d-device');
const device=document.getElementById('css3d-object');
const shell=device?.querySelector('.css3d-unibody');
if(!rig||!device||!shell)return;
const W=170,H=W/.467,RX=W*.135,RY=H*.063,CORNER=10;
const FACE=.056,WALL=.038,INSET=.0092,OVERLAP=.70;
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
  const piece=document.createElement('i');
  piece.className='css3d-shell-face css3d-shell-face--'+layer.className;
  piece.setAttribute('aria-hidden','true');
  piece.style.width='calc(var(--shell-w) * '+(L/W).toFixed(9)+' + '+OVERLAP+'px)';
  piece.style.height='calc(var(--shell-w) * '+(height/W).toFixed(9)+' + .20px)';
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
function setSize(w,h){rig.style.setProperty('--shell-w',w.toFixed(3)+'px');rig.style.setProperty('--shell-h',h.toFixed(3)+'px')}
setSize(W,H);
window.MOVVA_SHELL={setSize,partCount:count,edgeCount:contour.length-1,layerCount:layers.length,bodyDepthFactor:FACE*2,
 get width(){return parseFloat(rig.style.getPropertyValue('--shell-w'))||W},
 get height(){return parseFloat(rig.style.getPropertyValue('--shell-h'))||H}
};
})();