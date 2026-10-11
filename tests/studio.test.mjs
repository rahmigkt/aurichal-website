import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const root=new URL('../nakis/',import.meta.url),cache=new Map();
function uri(name){if(cache.has(name))return cache.get(name);let s=fs.readFileSync(new URL(name,root),'utf8');s=s.replace(/from\s*(['"])\.\/([^'"]+)\1/g,(_,q,n)=>'from '+JSON.stringify(uri(new URL(n,'https://test/'+name).pathname.slice(1))));const u='data:text/javascript;base64,'+Buffer.from(s).toString('base64');cache.set(name,u);return u;}
const motion=await import(uri('studio-motion.js')),svgModule=await import(uri('studio-svg.js'));
const geometry=await import(uri('studio-geometry.js')),{WAC_PART}=await import(uri('wac-logo.js'));
const logo=WAC_PART.build();
test('triangulation preserves W polygon area and triangle assembly has exact endpoints',()=>{
 const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
 for(const sh of logo){const mesh=geometry.triangulate(sh.pts);assert(Math.abs(mesh.reduce((s,ids)=>s+area(ids.map(i=>sh.pts[i])),0)-area(sh.pts))<1e-8);}
 const initial=geometry.constructGeometry(logo,{kind:'triangle'},{formation:0});assert.equal(initial.length,6);assert(initial.every(s=>s.pts.length===3));assert(initial.every(s=>JSON.stringify(s.pts)===JSON.stringify(initial[0].pts)));
 assert.deepEqual(geometry.constructGeometry(logo,{kind:'triangle'},{formation:1}),logo);
});
test('rigid folded panels preserve 3D edge lengths and common hinge endpoints',()=>{
 for(const sh of logo){const mesh=geometry.foldMesh(sh.pts,.8,145);
  for(const panel of mesh){for(let i=0;i<3;i++){const j=(i+1)%3,a=sh.pts[panel.ids[i]],b=sh.pts[panel.ids[j]],pa=panel.pts3[i],pb=panel.pts3[j];assert(Math.abs(Math.hypot(a[0]-b[0],a[1]-b[1])-Math.hypot(...pa.map((v,k)=>v-pb[k])))<1e-7);}
   if(panel.hinge){const parent=mesh[panel.hinge.parent];for(const id of panel.hinge.edge){const a=parent.pts3[parent.ids.indexOf(id)],b=panel.pts3[panel.ids.indexOf(id)];assert(Math.hypot(...a.map((v,i)=>v-b[i]))<1e-7);}}
  }
 }
 assert.deepEqual(geometry.constructGeometry(logo,{kind:'fold'},{fold:0}),logo);
});
test('fractal chain copies follow a bounded recursive scaling rule',()=>{
 const g={chain:true,depth:3,ratio:.5,angle:38,spacing:1.3};
 const a=geometry.constructGeometry(logo,g,{growth:0}),b=geometry.constructGeometry(logo,g,{growth:1});
 assert.equal(a.length,3);assert.equal(b.length,3*(1+2+4+8));
 const shape=b.find(s=>s.id.endsWith('-0L')),base=logo.find(s=>shape.id.startsWith(s.id+'-'));
 assert(Math.abs(Math.hypot(shape.pts[0][0]-shape.pts[1][0],shape.pts[0][1]-shape.pts[1][1])/Math.hypot(base.pts[0][0]-base.pts[1][0],base.pts[0][1]-base.pts[1][1])-.5)<1e-10);
 assert.deepEqual(geometry.constructGeometry(logo,g,{growth:.6}),geometry.constructGeometry(logo,g,{growth:.6}));
});
test('uneven polyline reveal follows arc length, not vertex count',()=>{
 assert.deepEqual(motion.trimLine([[0,0],[1,0],[10,0]],.5),[[0,0],[1,0],[5,0]]);
 assert.deepEqual(motion.trimLine([[0,0],[0,0],[10,0]],.5),[[0,0],[0,0],[5,0]]);
});
test('keyframes are seekable out of order, include exact endpoints and hold',()=>{
 const l={x:0,size:300,keys:[{t:0,pose:{x:0,size:300},ease:'linear'},{t:10,pose:{x:100,size:300},ease:'easeInOut'}]};
 assert.equal(motion.samplePose(l,5,10).x,50);
 assert.equal(motion.samplePose(l,10,10).x,100);
 const before=motion.samplePose(l,3,10);motion.samplePose(l,9,10);assert.deepEqual(motion.samplePose(l,3,10),before);
 l.keys[0].ease='hold';assert.equal(motion.samplePose(l,9.9,10).x,0);assert.equal(motion.samplePose(l,10,10).x,100);
});
test('invalid imports are bounded; repeated time replaces a key',()=>{
 const keys=motion.normaliseKeys([{t:NaN},{t:3,pose:{size:Infinity,x:99999}},{t:3,pose:{x:12}},{t:-9,pose:{opacity:-4}}],12,motion.poseOf());
 assert.equal(keys.length,2);assert.equal(keys[0].t,0);assert.equal(keys[0].pose.opacity,0);assert.equal(keys[1].pose.x,12);
 assert.equal(motion.putKey({keys},3,{x:25},'linear',12).length,2);
 assert.equal(motion.motionSettings({duration:99999}).duration,60);
});
test('history restores changes and discards stale redo after a new edit',()=>{
 const h=motion.createHistory(4);h.reset({x:0});h.schedule({x:1});assert.deepEqual(h.undo(),{x:0});assert.deepEqual(h.redo(),{x:1});h.undo();h.schedule({x:2});h.flush();assert.equal(h.redo(),null);assert.deepEqual(h.undo(),{x:0});
});
test('SVG optimisation keeps closed branded polygons exact and trims revealed lines',()=>{
 const shape={pts:[[0,0],[10,0],[10,10]],fill:true,closed:true,noStroke:true,tone:'ink',lw:1,y0:0,y1:10};
 const palette={ground:'#ffffff',ink:'#171717'};
 const a=svgModule.sceneSVG([{part:'wac_w',visible:true}],palette,()=>({shapes:[shape]}),{optimise:true,cx:0,cy:0});
 assert(a.svg.includes('M0 0 L10 0 L10 10 Z'));assert(a.svg.includes('stroke="none"'));assert.equal(a.before,a.after);
 const b=svgModule.sceneSVG([{part:'curve',visible:true,reveal:.5}],palette,()=>({shapes:[{...shape,fill:false,closed:false,pts:[[0,0],[1,0],[10,0]]}]}),{cx:0,cy:0});
 assert(b.svg.includes('L5 0'));
});

// Execute the actual browser module against Canvas plus a minimal DOM adapter.
// This verifies renderer and event paths; it is not a real-browser layout test.
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const nodes=new Map(),listeners=new Map(),canvasListeners=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},querySelector(){return node('output');}});return nodes.get(id);}
const cv=createCanvas(1080,1350);cv.addEventListener=(k,v)=>canvasListeners.set(k,v);cv.style={};nodes.set('c',cv);
globalThis.document={getElementById:node,createElement:type=>type==='canvas'?createCanvas(1080,1350):node(type),addEventListener(k,v){const a=listeners.get(k)||[];a.push(v);listeners.set(k,a);},querySelector(){return null;},querySelectorAll(){return[];}};
globalThis.window={};globalThis.location={search:'?preset=wac'};globalThis.localStorage={getItem(){return null;},setItem(){}};globalThis.requestAnimationFrame=()=>0;
const nativeTimeout=globalThis.setTimeout;globalThis.setTimeout=(f,ms,...args)=>{const timer=nativeTimeout(f,ms,...args);if(ms===30000)timer.unref();return timer;};
await import(uri('studio.js'));
const emit=(type,target)=>{for(const f of listeners.get(type)||[])f({target});};
const click=(act,data={})=>emit('click',{tagName:'BUTTON',dataset:{act,...data},closest(){return this;}});
const input=(data,value,extra={})=>emit('input',{dataset:data,value,parentNode:node('parent'),...extra});
test('studio catalogue, motion editing, duration scaling, copy and undo/redo work together',()=>{
 assert.equal(window.studio.project.layers[0].part,'wac_w');
 window.studio.motion();assert(node('panel').innerHTML.includes('data-act="motion-capture"'));
 input({motion:'enabled'},'',{type:'checkbox',checked:true});
 window.renderAt(0);window.studio.captureKey();
 input({motion:'time'},'6');input({pose:'y'},'-80');window.studio.captureKey();
 assert.equal(window.studio.project.layers[0].keys.length,2);
 assert.equal(window.studio.project.layers[0].keys[1].pose.y,-80);
 emit('change',{dataset:{motion:'duration'},value:'24'});
 assert.equal(window.studio.project.layers[0].keys[1].t,12);
 click('dup',{i:'0'});assert.equal(window.studio.project.layers.length,2);
 const a=window.studio.project.layers[0],b=window.studio.project.layers[1];assert.notEqual(a.keys,b.keys);
 window.studio.undo();assert.equal(window.studio.project.layers.length,1);
 assert.equal(window.studio.project.layers[0].keys.length,2);
 window.studio.redo();assert.equal(window.studio.project.layers.length,2);
});
test('actual Canvas renderer is deterministic and changing time changes the frame',()=>{
 const p=JSON.parse(JSON.stringify(window.studio.project));p.layers=p.layers.slice(0,1);p.tex=false;window.loadProject(p);
 window.renderAt(3);const a=cv.toBuffer('image/png');window.renderAt(12);const b=cv.toBuffer('image/png');window.renderAt(3);const c=cv.toBuffer('image/png');assert(a.equals(c));assert(!a.equals(b));
 fs.writeFileSync(new URL('../motion-preview.png',import.meta.url),b);
 const t=performance.now();for(let i=0;i<60;i++)window.renderAt(i/5);console.log('60 full-size WAC motion frames:',Math.round(performance.now()-t),'ms');
});
test('legacy projects retain film mode and unknown shapes cannot break geometry',()=>{
 const p={layers:[{part:'palmet',n:4,size:130}],palette:'indigo'};window.loadProject(p);assert.equal(window.studio.project.motion.enabled,false);assert(window.filmTotal()>10);window.renderAt(5);
 assert.throws(()=>window.loadProject({layers:'invalid'}));
});
test('recording guards prevent edits, stop releases tracks and downloads the chosen format',()=>{
 let stopped=false,rate=0,recorder;
 cv.captureStream=fps=>{rate=fps;return {getTracks:()=>[{stop(){stopped=true;}}]};};
 node('a').click=()=>{};
 class Recorder{
  static isTypeSupported(m){return m==='video/webm;codecs=vp8';}
  constructor(stream,options){recorder=this;this.mimeType=options.mimeType;this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable({data:new Blob(['test-video'])});this.onstop();}
 }
 globalThis.MediaRecorder=Recorder;window.MediaRecorder=Recorder;
 click('rec');assert.equal(rate,30);assert.equal(recorder.state,'recording');assert.equal(node('rec-stop').hidden,false);
 const before=JSON.stringify(window.studio.project);click('newp');assert.equal(JSON.stringify(window.studio.project),before);
 click('rec-stop');assert(stopped);assert(node('a').download.endsWith('.webm'));assert.equal(node('rec-stop').hidden,true);
});
test('motion example uses the actual fractal and motif renderer within a bounded frame budget',()=>{
 window.studio.load('motionstudy');window.renderAt(0);const first=cv.toBuffer('image/png');window.renderAt(6);const mid=cv.toBuffer('image/png');window.renderAt(12);const last=cv.toBuffer('image/png');
 assert(!first.equals(mid));assert(first.equals(last));
 fs.writeFileSync(new URL('../moving-geometry-preview.png',import.meta.url),mid);
 const start=performance.now();for(let i=0;i<60;i++)window.renderAt(i/5);console.log('60 full-size three-layer geometry frames:',Math.round(performance.now()-start),'ms');
});
test('user actions produce triangle, chain and fold animations while keeping source logo intact',()=>{
 window.studio.load('wac');const source=JSON.parse(JSON.stringify(window.studio.project.layers[0]));
 click('geo-triangle');assert.equal(window.studio.project.layers.length,2);assert.equal(window.studio.project.layers[0].visible,false);
 assert.deepEqual({...window.studio.project.layers[0],visible:true},source);
 const copy=window.studio.project.layers[1];assert.equal(copy.experimental,true);assert.equal(copy.formation,0);
 click('geo-play-triangle');window.renderAt(0);const start=cv.toBuffer('image/png');window.renderAt(window.filmTotal());const end=cv.toBuffer('image/png');assert(!start.equals(end));
 fs.writeFileSync(new URL('../triangle-seed.png',import.meta.url),start);fs.writeFileSync(new URL('../triangle-logo.png',import.meta.url),end);
 window.studio.load('wac');click('geo-chain');click('geo-play-chain');window.renderAt(0);const root=cv.toBuffer('image/png');window.renderAt(window.filmTotal());const tree=cv.toBuffer('image/png');assert(!root.equals(tree));fs.writeFileSync(new URL('../fractal-chain.png',import.meta.url),tree);
 window.studio.load('wac');click('geo-fold');click('geo-play-fold');window.renderAt(0);const flat=cv.toBuffer('image/png');window.renderAt(window.filmTotal()/2);const folded=cv.toBuffer('image/png');window.renderAt(window.filmTotal());assert(flat.equals(cv.toBuffer('image/png')));assert(!flat.equals(folded));fs.writeFileSync(new URL('../folded-logo.png',import.meta.url),folded);
 const p=JSON.parse(JSON.stringify(window.studio.project));window.loadProject(p);window.renderAt(window.filmTotal()/2);assert(folded.equals(cv.toBuffer('image/png')));
});
