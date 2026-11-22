/* MOVVA · Stage 5. Bounded Nutrition presentation, 0.435 < p < 0.595.
 * The Stage 4 controller is delegated unchanged outside this interval.
 * No new render loop, scroll interception, dependencies or account-data access.
 */
(() => {
'use strict';
const stage=document.querySelector('#stage'), scene=document.querySelector('#nutrition');
const original=window.MOVVA_INTRO;
if(!stage||!scene||!original)return;
const copy=scene.querySelector('.copy'), steps=[...scene.querySelectorAll('.nutrition-chapters span')];
const readout=scene.querySelector('.nutrition-readout'), note=scene.querySelector('.micro-note');
const number=document.querySelector('#water-number'), fill=document.querySelector('#water-fill');
const formatWater=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const ramp=(p,a,b)=>ease((p-a)/(b-a));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const inside=p=>p>.435&&p<.595;
const hydrationProgress=p=>ramp(p,.466,.557);
let slot=null,touched=false;
const camera = scene.querySelector('.nutrition-camera');
const cameraAnchor = document.createComment('Camera chapter');
if (camera) camera.before(cameraAnchor);
let frame = null;
let cards = [];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function loadCamera() {
 if (!camera || frame) return;
 camera.insertAdjacentHTML('beforeend', `
        <div class="nc-frame" aria-hidden="true">
          <img class="nc-opening" src="/assets/camera-studio.webp" alt="" width="1672" height="941">

          <div class="nc-phone">
            <div class="nc-phone-glass">
              <img class="nc-screen-shot" src="/assets/camera-inclinada.jpg" alt="" width="589" height="1280">
              <div class="nc-finder">
                <img class="nc-finder-photo" src="/assets/camera-studio.webp" alt="" width="1672" height="941">
              </div>

              <div class="nc-camera-ui">
                <img class="nc-camera-controls" src="/assets/camera-inclinada.jpg" alt="" width="589" height="1280">
                <svg class="nc-guides" viewBox="0 0 589 1280" fill="none" aria-hidden="true">
                  <path d="M102 475v-20q0-10 10-10h20m325 0h20q10 0 10 10v20M102 800v20q0 10 10 10h20m325 0h20q10 0 10-10v-20"/>
                </svg>
                <img class="nc-tilt nc-tilt-warning" src="/assets/camera-inclinada.jpg" alt="" width="589" height="1280">
                <img class="nc-tilt nc-tilt-aligned" src="/assets/camera-alinhada.jpg" alt="" width="589" height="1280">
                <div class="nc-shutter-flash"></div>
              </div>

              <div class="nc-scan">
                <div class="nc-scan-line"></div>
                <div class="nc-scan-note">
                  <strong>Analisando a refeição</strong>
                  <span class="nc-scan-progress"><i></i></span>
                </div>
              </div>

              <div class="nc-screen-result">
                <span>Estimativa da refeição</span>
                <strong>1.200 <small>kcal</small></strong>
              </div>
            </div>
          </div>

          <div class="nc-results">
            <div class="nc-result-card nc-result-energy">
              <span>Estimativa da refeição</span>
              <strong>1.200 <small>kcal</small></strong>
            </div>
            <div class="nc-result-card">
              <span>Proteínas</span>
              <strong>68 <small>g</small></strong>
            </div>
            <div class="nc-result-card">
              <span>Carboidratos</span>
              <strong>123 <small>g</small></strong>
            </div>
            <div class="nc-result-card">
              <span>Gorduras</span>
              <strong>48 <small>g</small></strong>
            </div>
          </div>
        </div>`);
 frame = camera.querySelector('.nc-frame');
 cards = Array.from(frame.querySelectorAll('.nc-result-card'));
 const photos = Array.from(frame.querySelectorAll('img'));
 Promise.all(photos.map(photo => photo.decode())).then(() => {
  camera.dataset.loaded = '';
 }).catch(() => { /* Keep the photograph with the composed visor on decode failure. */ });
}

function updateCamera(p) {
 if (!camera) return;
 if (camera.parentElement !== stage) stage.insertBefore(camera, stage.querySelector('.chapter-bar'));
 const t = clamp((p - .467) / (.572 - .467));
 const align = 1 - Math.pow(1 - clamp(t / .29), 2);
 const flash = reducedMotion.matches ? 0 : ramp(t, .47, .52) * (1 - ramp(t, .52, .56));
 camera.style.setProperty('--camera-presence', (ramp(p, .455, .474) * (1 - ramp(p, .576, .593))).toFixed(4));
 camera.style.setProperty('--finder-x', (-36 * (1 - align)).toFixed(2) + 'px');
 camera.style.setProperty('--finder-y', (26 * (1 - align)).toFixed(2) + 'px');
 camera.style.setProperty('--finder-roll', (-8 * (1 - align)).toFixed(2) + 'deg');
 camera.style.setProperty('--finder-scale', (1.18 - .15 * align).toFixed(4));
 camera.style.setProperty('--flash', flash.toFixed(4));
 camera.style.setProperty('--analysis', clamp((t - .54) / .18).toFixed(4));
 const phase = t < .29 ? 'aim' : t < .54 ? 'aligned' : t < .72 ? 'processing' : 'results';
 if (camera.dataset.phase !== phase) camera.dataset.phase = phase;
 cards.forEach((card, index) => {
  const start = .72 + .028 * index;
  const rise = ramp(t, start, start + .16);
  card.style.setProperty('--card-alpha', ramp(t, start, start + .075).toFixed(4));
  card.style.setProperty('--card-rise', rise.toFixed(4));
  card.style.setProperty('--card-scale', (.18 + .82 * rise).toFixed(4));
 });
}
function measure(){
 const vw=stage.clientWidth,vh=stage.clientHeight;if(!vw||!vh)return;
 const tall=vw<=760,gutter=parseFloat(getComputedStyle(stage).getPropertyValue('--gutter'))||24;
 const header=document.querySelector('.header').offsetHeight,bar=document.querySelector('.chapter-bar');
 const bottom=vh-(bar.offsetHeight||32)-27;
 const top=tall?scene.offsetTop+copy.offsetTop+copy.offsetHeight+22:header+34;
 const x=tall?28:gutter+8,width=tall?vw-56:vw*.39;
 slot={x,y:top,width,height:Math.max(60,bottom-top),vw,vh,tall};
 if (camera) {
  const usableHeight = Math.max(100, bottom - header - 12);
  const portrait = tall && vh > vw;
  const scale = portrait ? Math.min(vw / 830, usableHeight / 1170) : Math.min(vw / 1672, usableHeight / 941);
  const centerX = vw / 2 + (portrait ? 306 * scale : 0);
  const centerY = header + (bottom - header) / 2 - (portrait ? 84 * scale : 0);
  camera.style.setProperty('--camera-scale',scale.toFixed(5));
  camera.style.setProperty('--camera-center-x',centerX.toFixed(2)+'px');
  camera.style.setProperty('--camera-center-y',centerY.toFixed(2)+'px');
 }
}
function bounds(pose,compose,hw,hh){
 const[nx,ny,s,rx,ry,rz]=pose,m=compose(nx*hw,ny*hh,0,rx,ry,rz,s),xs=[],ys=[];
 for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){
  const tx=m[0]*x+m[4]*y+m[8]*z+m[12],ty=m[1]*x+m[5]*y+m[9]*z+m[13],tz=m[2]*x+m[6]*y+m[10]*z+m[14];
  xs.push((tx/(hw*(1-tz/14))+1)*slot.vw/2);ys.push((1-ty/(hh*(1-tz/14)))*slot.vh/2);
 }
 return{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
}
function fit(p,base,compose,hw,hh){
 const previous=original.fit(p,base,compose,hw,hh);
 if(!inside(p)||!slot)return previous;
 const w=ramp(p,.435,.466)*(1-ramp(p,.565,.595));
 const{x,y,width:sw,height:sh,vw,vh,tall}=slot,cx=x+sw/2,cy=y+sh/2;
 const orbit=ramp(p,.469,.553),ry=-.12+.32*orbit,rx=-.045+.025*orbit,rz=tall?-.025:-.028+.055*orbit;
 let pose=[cx/vw*2-1,1-cy/vh*2,Math.min(sh/(vh/(2*hh)*6.25),sw/(vw/(2*hw)*3.2)),rx,ry,rz];
 for(let i=0;i<3;i++){
  const r=bounds(pose,compose,hw,hh);
  pose[0]+=(cx-(r.left+r.right)/2)/(vw/2);pose[1]-=(cy-(r.top+r.bottom)/2)/(vh/2);
  pose[2]*=Math.min(sw*.94/(r.right-r.left),sh*.94/(r.bottom-r.top),1.02);
 }
 return mix(previous,pose,w);
}
function background(p,base){
 const previous=original.background(p,base);if(!inside(p))return previous;
 const t=ramp(p,.435,.462)*(1-ramp(p,.569,.595));
 return mix(previous,[255,255,255],t).map(Math.round);
}
function panel(p,chapter,base){
 const previous=original.panel(p,chapter,base);
 if(!inside(p)||chapter!==3)return previous;
 const target=slot&&slot.vw>=1100?ramp(p,.495,.527)*(1-ramp(p,.551,.580))*.79:0;
 const weight=ramp(p,.435,.456)*(1-ramp(p,.577,.595));
 return previous+(target-previous)*weight;
}
function reset(){
 stage.classList.remove('nutrition-active');
 if(!touched)return;touched=false;
 if (camera && camera.parentElement === stage) cameraAnchor.after(camera);
 stage.style.removeProperty('--nutrition-presence');
 [...steps,readout,note].forEach(el=>{el.style.removeProperty('opacity');el.style.removeProperty('transform');});
}
function visual(p){
 original.visual(p);
 if (p > .40 && p < .605) loadCamera();
 if(!inside(p)){reset();return;}
 touched=true;stage.classList.add('nutrition-active');
 const presence=ramp(p,.442,.47)*(1-ramp(p,.565,.595));
 stage.style.setProperty('--nutrition-presence',presence.toFixed(5));
 updateCamera(p);
 steps.forEach((el,i)=>{const t=ramp(p,.463+i*.009,.487+i*.009);el.style.opacity=String(.45+.55*t);el.style.transform=`translateY(${(1-t)*5}px)`;});
 const reveal=ramp(p,.474,.494);readout.style.opacity=String(reveal);readout.style.transform=`translateY(${(1-reveal)*8}px)`;
 const progress=hydrationProgress(p);
 const value=formatWater.format(progress),width=Math.round(progress*3700)/100;
 if(number.textContent!==value)number.textContent=value;
 if(parseFloat(fill.style.width)!==width)fill.style.width=width+'%';
 note.style.opacity=String(ramp(p,.507,.528));
}
window.MOVVA_NUTRITION={measure,fit,background,panel,visual,reset,hydrationProgress,get layout(){return slot?{...slot}:null},scope:[.435,.595]};
window.MOVVA_INTRO=Object.assign(Object.create(original),{
 measure(){original.measure();measure();},fit,background,panel,visual,
 reset(){original.reset();reset();}
});
const observer=new ResizeObserver(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});observer.observe(copy);
document.fonts?.ready.then(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
})();
