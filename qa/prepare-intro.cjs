/* Bounded candidate assembly. Baseline locked; no source network requests. */
'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const base='a77e9fa2751fc7e2741bc221a5f79784eacb54e8';
const before='/tmp/movva-intro-baseline';fs.mkdirSync(before,{recursive:true});
for(const file of cp.execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n')){
 const dest=path.join(before,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,cp.execFileSync('git',['show',base+':'+file]));
}
function replace(s,a,b){if(!s.includes(a))throw new Error('Baseline guard failed: '+a.slice(0,65));return s.replace(a,b);}
let s=fs.readFileSync('experience.js','utf8');
if(!s.includes('const intro=window.MOVVA_INTRO;')){
 s=replace(s,"version:'hero-stage3-1'","version:'intro-stage4-1'");
 s=replace(s,'const w=weights(p),bg=background(p),active=w.indexOf(Math.max(...w));','const intro=window.MOVVA_INTRO;\n const w=intro?intro.weights(p,weights(p)):weights(p),bg=intro?intro.background(p,background(p)):background(p);\n const selected=w.indexOf(Math.max(...w)),active=intro?intro.active(p,selected):selected;');
 s=replace(s,'const model=compose(nx*halfW','if(intro)[nx,ny,scale,rx,ry,rz]=intro.fit(p,[nx,ny,scale,rx,ry,rz],compose,halfW,halfH);\n intro?.visual(p);\n const model=compose(nx*halfW');
 s=replace(s,"const labels=['home','training','nutrition','evolution','circle'],txA=","const change=intro?.screen(p);if(change){ix=change.ix;blend=change.blend;}\n const labels=['home','training','nutrition','evolution','circle'],txA=");
 s=replace(s,'const a=w[o.chapter];if(a<.015)','const a=intro?intro.panel(p,o.chapter,w[o.chapter]):w[o.chapter];if(a<.015)');
 s=replace(s,'function resize(){window.MOVVA_HERO?.measure();','function resize(){window.MOVVA_HERO?.measure();window.MOVVA_INTRO?.measure();');
 s=replace(s,"function clearScenes(){stage.classList.remove('hero-active');","function clearScenes(){window.MOVVA_INTRO?.reset();stage.classList.remove('hero-active');");
 fs.writeFileSync('experience.js',s);
}
s=fs.readFileSync('index.html','utf8');if(!s.includes('/intro-scroll.js')){
 s=replace(s,'<script defer src="/experience.js"></script>','<link rel="stylesheet" href="/intro-scroll.css">\n<script defer src="/intro-scroll.js"></script>\n<script defer src="/experience.js"></script>');fs.writeFileSync('index.html',s);
}
console.log('Candidate ready; immutable baseline retained for comparison.');
