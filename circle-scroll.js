/* MOVVA — Stage 7. Circle and the closing scene only, p > .775.
 * One native-scroll clock. Dots are decorative, not accounts or testimonials.
 * The approved Stage 6/5/4 hooks and actual 3D renderer are delegated unchanged.
 */
(() => {
'use strict';
const stage=document.querySelector('#stage'),scene=document.querySelector('#circle'),finale=document.querySelector('#rhythm');
const original=window.MOVVA_INTRO;if(!stage||!scene||!finale||!original)return;
const copy=scene.querySelector('.copy'),endCopy=finale.querySelector('.copy'),words=[...scene.querySelectorAll('.circle-values span')],bond=scene.querySelector('.circle-bond');
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const ramp=(p,a,b)=>ease((p-a)/(b-a)),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),inside=p=>p>.775;
let layout=null,touched=false;
const surface=document.createElement('div');surface.className='circle-surface';surface.setAttribute('aria-hidden','true');surface.innerHTML='<div class="circle-orbit"><i></i><i></i><b></b><b></b><b></b><b></b><b></b></div>';stage.insertBefore(surface,document.querySelector('#world'));
function measure(){
 const vw=stage.clientWidth,vh=stage.clientHeight;if(!vw||!vh)return;
 const tall=vw<=760,gutter=parseFloat(getComputedStyle(stage).getPropertyValue('--gutter'))||24,header=document.querySelector('.header').offsetHeight,bar=document.querySelector('.chapter-bar');
 const bottom=vh-(bar.offsetHeight||32)-27,y=tall?scene.offsetTop+copy.offsetTop+copy.offsetHeight+20:header+34;
 const width=tall?vw-56:Math.min(vw*.38,vw-gutter*2),x=tall?28:gutter+9,endY=finale.offsetTop+endCopy.offsetTop+endCopy.offsetHeight+24;
 layout={tall,circle:{x,y,width,height:Math.max(65,bottom-y),vw,vh},end:{x:vw*.27,y:endY,width:vw*.46,height:Math.max(65,bottom-endY),vw,vh}};
 surface.style.left=(x+width/2)+'px';surface.style.top=(y+(bottom-y)/2)+'px';surface.style.setProperty('--circle-slot-height',Math.max(65,bottom-y)+'px');
}
function bounds(pose,compose,hw,hh,slot){
 const[nx,ny,s,rx,ry,rz]=pose,m=compose(nx*hw,ny*hh,0,rx,ry,rz,s),xs=[],ys=[];
 for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){const tx=m[0]*x+m[4]*y+m[8]*z+m[12],ty=m[1]*x+m[5]*y+m[9]*z+m[13],tz=m[2]*x+m[6]*y+m[10]*z+m[14];xs.push((tx/(hw*(1-tz/14))+1)*slot.vw/2);ys.push((1-ty/(hh*(1-tz/14)))*slot.vh/2);}
 return{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
}
function fitSlot(slot,angles,compose,hw,hh,limit=1){
 const{x,y,width:w,height:h,vw,vh}=slot,cx=x+w/2,cy=y+h/2;
 let pose=[cx/vw*2-1,1-cy/vh*2,Math.min(h/(vh/(2*hh)*6.25),w/(vw/(2*hw)*3.2))*limit,...angles];
 for(let i=0;i<3;i++){const r=bounds(pose,compose,hw,hh,slot);pose[0]+=(cx-(r.left+r.right)/2)/(vw/2);pose[1]-=(cy-(r.top+r.bottom)/2)/(vh/2);pose[2]*=Math.min(w*.94/(r.right-r.left),h*.94/(r.bottom-r.top),1.015);}
 return pose;
}
function fit(p,base,compose,hw,hh){
 const previous=original.fit(p,base,compose,hw,hh);if(!inside(p)||!layout)return previous;
 const orbit=ramp(p,.812,.883),reading=fitSlot(layout.circle,[-.035,Math.PI*2+.19-.34*orbit,-.035+.055*orbit],compose,hw,hh),finish=fitSlot(layout.end,[-.025,Math.PI*2+.025,-.014],compose,hw,hh,.78),leave=ramp(p,.889,.957),closing=mix(reading,finish,leave);
 closing[4]+=Math.sin(leave*Math.PI)*.82;
 return mix(previous,closing,ramp(p,.775,.809));
}
function weights(p,base){const previous=original.weights(p,base);if(!inside(p))return previous;const w=[...previous],handoff=ramp(p,.775,.799);w[5]=previous[5]+(ramp(p,.777,.806)*(1-ramp(p,.893,.928))-previous[5])*handoff;w[6]=ramp(p,.937,.966);return w;}
function active(p,fallback){return !inside(p)?original.active(p,fallback):p<.939?5:6;}
function background(p,base){const previous=original.background(p,base);if(!inside(p))return previous;return mix(previous,mix([238,234,221],[243,240,230],ramp(p,.892,.966)),ramp(p,.775,.809)).map(Math.round);}
function reset(){stage.classList.remove('circle-active','closing-active');if(!touched)return;touched=false;['--circle-presence','--circle-gather','--circle-orbit','--closing-progress'].forEach(k=>stage.style.removeProperty(k));[...words,bond].forEach(el=>{el.style.removeProperty('opacity');el.style.removeProperty('transform');});}
function visual(p){
 original.visual(p);if(!inside(p)){reset();return;}touched=true;stage.classList.toggle('circle-active',p<.934);stage.classList.toggle('closing-active',p>=.918);
 stage.style.setProperty('--circle-presence',(ramp(p,.79,.817)*(1-ramp(p,.893,.934))).toFixed(5));stage.style.setProperty('--circle-gather',ramp(p,.808,.870).toFixed(5));stage.style.setProperty('--circle-orbit',ramp(p,.799,.902).toFixed(5));stage.style.setProperty('--closing-progress',ramp(p,.918,1).toFixed(5));
 words.forEach((el,i)=>{const t=ramp(p,.809+i*.011,.835+i*.011);el.style.opacity=String(t);el.style.transform=`translateY(${(1-t)*6}px)`;});const b=ramp(p,.823,.848);bond.style.opacity=String(b);bond.style.transform=`translateY(${(1-b)*7}px)`;
}
window.MOVVA_CIRCLE={measure,fit,weights,active,background,visual,reset,scope:[.775,1],get layout(){return layout},reference:{groupSize:[2,5],demo:true}};
window.MOVVA_INTRO=Object.assign(Object.create(original),{measure(){original.measure();measure();},fit,weights,active,background,visual,reset(){original.reset();reset();}});
const observer=new ResizeObserver(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});[copy,endCopy].forEach(c=>observer.observe(c));document.fonts?.ready.then(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
})();
