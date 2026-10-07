'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out='qa-closeout-output';fs.mkdirSync(out,{recursive:true});
const expected={layout:18,sequence:16,regression:8,controls:7};
const summary={stage:4,commit:process.env.GITHUB_SHA,status:'FAIL',matrixResult:process.env.MATRIX_RESULT,groups:[],uniqueChecks:0,screenshots:0,generatedAt:new Date().toISOString()};
try{
 const names=new Set();
 for(const [group,count] of Object.entries(expected)){
  const file=path.join('qa-closeout-input','movva-intro-stage4-'+group,'report.json');
  assert.ok(fs.existsSync(file),'Missing group report: '+group);
  const r=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(r.group,group);assert.equal(r.commit,summary.commit);assert.equal(r.status,'PASS',group+': '+r.failure);
  assert.equal(r.checks.length,count,'Missing original checks in '+group);
  assert.equal(r.pageErrors.length,0);assert.equal(r.localErrors.length,0);assert.equal(r.events.length,0);
  for(const c of r.checks){assert.equal(c.pass,true);names.add(c.name);}
  summary.groups.push({group,status:r.status,checks:r.checks.length,seconds:r.elapsedSeconds,images:r.images.length});summary.screenshots+=r.images.length;
  fs.copyFileSync(file,path.join(out,group+'-report.json'));
 }
 summary.uniqueChecks=names.size;summary.checkNames=[...names];
 assert.equal(names.size,43,'Original 43 distinct checks must all be present');
 assert.equal(summary.matrixResult,'success','A workflow job did not complete successfully');
 summary.runtime=JSON.parse(fs.readFileSync('qa/stage4-runtime-manifest.json','utf8')).runtime;
 summary.status='PASS';
}catch(e){summary.failure=e.stack;process.exitCode=1;}
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
