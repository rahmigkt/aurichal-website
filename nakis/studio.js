// NAKIŞ Studio — compose a motif from parts, dye it, weave it, film it.
import {motionSettings,poseOf,samplePose,normaliseKeys,putKey,trimLine,createHistory,EASINGS} from './studio-motion.js';
import {motionPanel} from './studio-motion-panel.js';
import {sceneSVG} from './studio-svg.js';
import {geometrySettings,constructGeometry,shadeColour,triangulate} from './studio-geometry.js';
import {geometryPanel} from './studio-geometry-panel.js';
import {WAC_PART} from './wac-logo.js';
import {MOTIFS} from './motifs.js';
import {RULES,build as buildCurve} from './iter-core.js';
import {L} from './prim.js';
import {clamp,smooth,inOut,outBack,mix,lum} from './film-core.js';
import {WEAVES,WEAVE_ORDER,MOTIF_WEAVE,weaveFor,weaveTile} from './weave.js';
import {HISTORIC,HISTORIC_ORDER,contrast} from './palettes.js';
import {brocadeOver} from './cloth.js';

const W=1080,H=1350,CX=540,CY=625,ROLES=['ink','accent','soft'];
const SERIF='"Cormorant Garamond","Times New Roman",Georgia,serif',SANS='Poppins,system-ui,-apple-system,"Segoe UI",sans-serif',GOLD='#f2c14e',CORAL='#ff6b5e';
const INTRO=2.4,HOLD=1.6,REP=8,GROUND=4.5,SW=4.4,FADE=1,TAIL=2.5,OUTRO=3.5;
const $=id=>document.getElementById(id);
const cv=$('c'),mctx=cv.getContext('2d',{willReadFrequently:true});let ctx=mctx;
const ca=document.createElement('canvas'),cb=document.createElement('canvas');ca.width=cb.width=W;ca.height=cb.height=H;
const caX=ca.getContext('2d',{willReadFrequently:true}),cbX=cb.getContext('2d',{willReadFrequently:true});

// ───────────── part catalogue ─────────────
const PARTS={};
for(const [k,v] of Object.entries(MOTIFS))PARTS[k]={title:v.title,tag:v.tag,counts:v.counts,blurb:v.blurb,f:v.f,build:v.build,group:'motif'};
const CUR={
 levy:{rule:'levy',arms:4,title:'Lévy C Curve',max:8,blurb:'Each piece becomes two smaller pieces joined at a right angle',g:n=>2**n,form:'each segment → 2 segments at 90°'},
 dragon:{rule:'dragon',arms:4,title:'Dragon Curve',max:8,blurb:'Folds alternate in direction; four arms tile the plane without gaps',g:n=>2**n,form:'folds alternate left and right'},
 twin:{rule:'dragon',arms:2,title:'Twin Dragon',max:8,blurb:'Two dragons grow back to back from one point',g:n=>2**n,form:'two dragons from one point'},
 terdragon:{rule:'terdragon',arms:4,title:'Terdragon',max:7,blurb:'Each piece becomes three smaller pieces turned by 120°',g:n=>3**n,form:'each segment → 3 segments at 120°'}
};
for(const [k,c] of Object.entries(CUR))PARTS['c_'+k]={title:c.title,tag:'FRACTAL',group:'fractal',counts:Array.from({length:c.max},(_,i)=>i+1),blurb:c.blurb,
 build:n=>buildCurve(RULES[c.rule],n,c.arms).map((a,i)=>L('c'+i,a.full,ROLES[i%3],{thin:true})),
 f:n=>[c.form,`n = ${n}`,`segments: ${c.arms*c.g(n)}`]};
PARTS.wac_w=WAC_PART;
const PART_KEYS=Object.keys(PARTS);
const shapeCache=new Map(),normCache=new Map();
const shapesOf=(p,n)=>{const k=p+':'+n;if(!shapeCache.has(k))shapeCache.set(k,PARTS[p].build(n));return shapeCache.get(k);};
function norm(p){if(!normCache.has(p)){const sh=shapesOf(p,PARTS[p].counts.at(-1));let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const s of sh)for(const q of s.pts){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}normCache.set(p,{cx:(x0+x1)/2,cy:(y0+y1)/2,m:Math.max(x1-x0,y1-y0)/2||1});}return normCache.get(p);}

// ───────────── project model ─────────────
let lang=(()=>{try{return localStorage.getItem('nakis-lang')||'tr';}catch{return 'tr';}})();
const t2=(tr,en)=>lang==='tr'?tr:en;
let uid=1;
const newLayer=(part,o={})=>({id:uid++,part,n:PARTS[part].counts.at(-1),x:0,y:0,size:300,rot:0,flip:false,sym:'none',k:6,shift:0,visible:true,opacity:1,reveal:1,formation:1,fold:0,growth:1,experimental:false,geo:geometrySettings(),keys:[],...o});
const defaultProject=()=>({v:1,title:'Untitled Composition',subtitle:'A study in woven geometry',note:'',mark:'Hüseyin Rahmi Göktaş · Global Science Advancement',palette:'turkeyred',custom:{ground:'#7a1230',ink:'#f6e8d2',accent:'#f2c25a',soft:'#eba3b6'},weave:'twill22',cycle:false,repeat:'single',cell:300,pace:2.6,showcase:[],tex:true,motion:motionSettings(),layers:[]});
let proj=defaultProject(),sel=0,tab='parts',mode='edit',now=0,playing=false,rec=null;
let draftPose=null,selectedEase='easeInOut',onion=false,restoring=false;
const history=createHistory();

const polar=(r,deg)=>({x:Math.round(r*Math.sin(deg*Math.PI/180)),y:-Math.round(r*Math.cos(deg*Math.PI/180))});
const PRESETS={
 motionstudy:()=>({"v": 1, "title": "Moving Geometry", "subtitle": "A layered motion study", "mark": "", "palette": "custom", "custom": {"ground": "#ffffff", "ink": "#171717", "accent": "#626262", "soft": "#9d9d9d"}, "tex": false, "repeat": "single", "showcase": [], "motion": {"enabled": true, "duration": 12, "loop": true}, "layers": [{"part": "c_twin", "n": 7, "x": 0, "y": 0, "size": 285, "rot": 0, "opacity": 1, "reveal": 1, "flip": false, "sym": "none", "k": 6, "shift": 0, "visible": true, "keys": [{"t": 0, "pose": {"x": 0, "y": 0, "size": 285, "rot": 0, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}, {"t": 6, "pose": {"x": 0, "y": 0, "size": 304.95000000000005, "rot": 16, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}, {"t": 12, "pose": {"x": 0, "y": 0, "size": 285, "rot": 0, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}]}, {"part": "c_dragon", "n": 5, "x": 0, "y": 0, "size": 135, "rot": 0, "opacity": 1, "reveal": 1, "flip": false, "sym": "none", "k": 6, "shift": 1, "visible": true, "keys": [{"t": 0, "pose": {"x": 0, "y": 0, "size": 135, "rot": 0, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}, {"t": 6, "pose": {"x": 0, "y": 0, "size": 144.45000000000002, "rot": -20, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}, {"t": 12, "pose": {"x": 0, "y": 0, "size": 135, "rot": 0, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}]}, {"part": "kalpyaprak", "n": 3, "x": 0, "y": -340, "size": 30, "rot": 0, "opacity": 1, "reveal": 1, "flip": false, "sym": "radial", "k": 12, "shift": 2, "visible": true, "keys": [{"t": 0, "pose": {"x": 0, "y": -340, "size": 30, "rot": 0, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}, {"t": 6, "pose": {"x": 0, "y": -340, "size": 32.1, "rot": 8, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}, {"t": 12, "pose": {"x": 0, "y": -340, "size": 30, "rot": 0, "opacity": 1, "reveal": 1}, "ease": "easeInOut"}]}]}),
 wac:()=>({title:'WAC 2027',subtitle:'',mark:'',palette:'custom',custom:{ground:'#ffffff',ink:'#171717',accent:'#171717',soft:'#171717'},tex:false,repeat:'single',showcase:[],layers:[newLayer('wac_w',{size:320})]}),
 medallion:()=>({title:'Medallion of Palmettes',subtitle:'Eight-fold garden: palmette, iris and heart-leaf rings around a damask core',palette:'indigo',weave:'diamond',repeat:'single',layers:[
  newLayer('damask',{n:3,size:95}),
  newLayer('iris',{n:3,size:100,...polar(175,22.5),rot:22.5,sym:'radial',k:8}),
  newLayer('palmet',{n:4,size:130,y:-285,sym:'radial',k:8}),
  newLayer('kalpyaprak',{n:3,size:46,y:-395,sym:'radial',k:16})]}),
 garden:()=>({title:'Vine and Lotus Garden',subtitle:'A mirrored vine carries lotus, bellflower and palmette',palette:'turkeyred',weave:'twill22',repeat:'halfdrop',cell:330,layers:[
  newLayer('asma',{n:6,size:380,x:-190,sym:'mirror'}),
  newLayer('nilufer',{n:5,size:130,y:-60,sym:'mirror4'}),
  newLayer('cancicegi',{n:4,size:100,x:0,y:260,sym:'mirror'}),
  newLayer('palmet',{n:3,size:110,y:-330})]}),
 fractal:()=>({title:'Dragon Rosette',subtitle:'A dragon curve and a twin dragon, ringed by heart leaves',palette:'turkishblue',weave:'satin',repeat:'single',layers:[
  newLayer('c_dragon',{n:8,size:360}),
  newLayer('c_twin',{n:7,size:150,shift:1}),
  newLayer('kalpyaprak',{n:3,size:40,y:-395,sym:'radial',k:16,shift:1})]})
};

// ───────────── geometry ─────────────
const pcache=new Map();
function symList(l){
 const R=a=>p=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)],k=Math.max(1,l.k|0),out=[];
 if(l.sym==='mirror')return [p=>p,p=>[-p[0],p[1]]];
 if(l.sym==='mirror4')return [p=>p,p=>[-p[0],p[1]],p=>[p[0],-p[1]],p=>[-p[0],-p[1]]];
 if(l.sym==='radial'||l.sym==='dihedral'){for(let j=0;j<k;j++){const r=R(2*Math.PI*j/k);out.push(r);if(l.sym==='dihedral')out.push(p=>r([-p[0],p[1]]));}return out;}
 return [p=>p];
}
function placed(l,cache=true){
 const key=JSON.stringify([l.part,l.n,l.size,l.rot,l.flip,l.sym,l.k,l.shift,l.x,l.y,l.experimental,l.geo,l.formation,l.fold,l.growth]);
 if(cache&&pcache.has(key))return pcache.get(key);
 const source=shapesOf(l.part,l.n),base=l.experimental?constructGeometry(source,l.geo,l):source,N=norm(l.part),k=l.size/N.m,r=l.rot*Math.PI/180,cr=Math.cos(r),sr=Math.sin(r),sh=((l.shift%3)+3)%3,mp=t=>{const i=ROLES.indexOf(t);return i<0?t:ROLES[(i+sh)%3];};
 const out=[],syms=symList(l);
 for(const sy of syms)for(const s of base){
  const pts=s.pts.map(p=>{let sx=(p[0]-N.cx)*k,syy=-(p[1]-N.cy)*k;if(l.flip)sx=-sx;return sy([sx*cr-syy*sr+l.x,sx*sr+syy*cr+l.y]);});
  let y0=1e9,y1=-1e9;for(const q of pts){if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}
  out.push({...s,pts,tone:mp(s.tone),tone2:s.tone2&&mp(s.tone2),edge:s.edge&&mp(s.edge),lw:Math.max(1.1,l.size*.0075*(s.thin?.9:s.edge?.55:.95)),y0,y1});
 }
 let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const s of out)for(const q of s.pts){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
 const res={shapes:out,box:{x0,x1,y0,y1}};if(cache){if(pcache.size>120)pcache.clear();pcache.set(key,res);}return res;
}
const visLayers=()=>proj.layers.filter(l=>l.visible);

// ───────────── drawing ─────────────
function drawSh(sh,P,ox,oy,sc,alpha,prog){
 const col=shadeColour(P[sh.tone],sh.faceShade??1);if(!col||alpha<=0||prog<=0)return;
 ctx.save();ctx.translate(ox,oy);ctx.scale(sc,sc);ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=Math.max(1.1/sc,sh.lw);
 const pts=sh.fill?sh.pts:trimLine(sh.pts,prog),n=pts.length,upto=n-1;
 ctx.beginPath();for(let i=0;i<=upto;i++){const p=pts[i];i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}
 if(sh.closed&&prog>=.999)ctx.closePath();
 if(sh.fill){let f=col;if(sh.tone2){const g=ctx.createLinearGradient(0,sh.y0,0,sh.y1);g.addColorStop(0,col);g.addColorStop(1,P[sh.tone2]||col);f=g;}ctx.fillStyle=f;ctx.globalAlpha=alpha*smooth(prog*1.4-.2);ctx.fill();ctx.globalAlpha=alpha;}
 ctx.strokeStyle=sh.tone2?(P[sh.tone2]||col):(P[sh.edge||sh.tone]||col);if(!sh.noStroke)ctx.stroke();ctx.restore();
}
const drawAll=(P,ox,oy,sc,alpha,layers=visLayers())=>{for(const l of layers)for(const s of placed(l,mode!=='motion').shapes)drawSh(s,P,ox,oy,sc,alpha*(l.opacity??1),l.reveal??1);};
function text(s,x,y,size,col,{font=SERIF,style='italic',align='left',alpha=1,weight='',fit=0}={}){
 if(!s)return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.textAlign=align;
 let z=size;ctx.font=`${style} ${weight} ${z}px ${font}`;if(fit){const w=ctx.measureText(s).width;if(w>fit){z=Math.floor(size*fit/w);ctx.font=`${style} ${weight} ${z}px ${font}`;}}
 ctx.fillText(s,x,y);ctx.restore();
}
function wrap(s,x,y,size,col,maxW,lh,o={}){if(!s)return;ctx.save();ctx.font=`${o.style||'italic'} ${size}px ${o.font||SERIF}`;const words=s.split(/\s+/);let line='',yy=y;const lines=[];for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;}lines.push(line);ctx.restore();lines.slice(0,4).forEach((ln,i)=>text(ln,x,yy+i*lh,size,col,o));}
const tiles={};for(const k of WEAVE_ORDER)tiles[k]=mctx.createPattern(weaveTile(k,7),'repeat');
const weaveOver=(P,y0,y1,al=.3)=>{if(!P.wk)return;ctx.save();ctx.globalCompositeOperation='overlay';ctx.fillStyle=tiles[P.wk];ctx.globalAlpha=al*P.wv;ctx.fillRect(0,y0,W,y1-y0);ctx.restore();};
function draft(wv,x1,y0,fg,al=1){const n=Math.min(wv.P,16),c=Math.floor(150/n);ctx.save();
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const X=x1-n*c+i*c,Y=y0+j*c;if(wv.top(i,j)){ctx.fillStyle=fg;ctx.globalAlpha=.9*al;ctx.fillRect(X,Y,c-1,c-1);}else{ctx.strokeStyle=fg;ctx.globalAlpha=.35*al;ctx.lineWidth=1;ctx.strokeRect(X+.5,Y+.5,c-2,c-2);}}
 ctx.restore();text('interlacing draft (■ warp over weft)',x1,y0+n*c+26,19,fg,{align:'right',alpha:.6*al,font:SANS,style:'normal'});}

// ───────────── palettes / stages / timeline ─────────────
const P0={ink:'#efe6d2',accent:'#e0a84a',soft:'#5fb8c8',ground:'#3a4a6a',paper:'#4b5b7b',n:'',dye:'',wk:null,wv:0};
const colourway=k=>k==='custom'?{n:'Custom Colourway',dye:'Custom · mixed in the studio',...proj.custom}:HISTORIC[k];
const stageOf=(c,wk)=>({...c,paper:mix(c.ground,c.ink,.22),wk,wv:1});
let TL,ST,rep=false;
function rebuild(){
 rep=proj.repeat!=='single';const vis=visLayers(),n=Math.max(1,vis.length),pace=proj.pace;
 const a=INTRO,bEnd=a+n*pace,ae=bEnd+HOLD,m=ae,me=m+(rep?REP:0),g=me,ge=g+GROUND,c=ge,extras=proj.showcase.filter(k=>k!==proj.palette);
 TL={a,bEnd,ae,m,me,g,ge,c,extras,ce:c+extras.length*SW+TAIL,total:c+extras.length*SW+TAIL+OUTRO,n,vis};
 ST=[P0,stageOf(colourway(proj.palette),proj.weave),...extras.map((k,i)=>stageOf(colourway(k),proj.cycle?weaveFor(i+1):proj.weave))];
 let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const l of vis){const b=placed(l).box;x0=Math.min(x0,b.x0);x1=Math.max(x1,b.x1);y0=Math.min(y0,b.y0);y1=Math.max(y1,b.y1);}
 if(x0>x1){x0=-100;x1=100;y0=-100;y1=100;}
 TL.hw=Math.max(40,(x1-x0)/2,Math.abs(x0),Math.abs(x1));TL.hh=Math.max(40,(y1-y0)/2,Math.abs(y0),Math.abs(y1));
}
const pal=t=>{
 if(t<TL.g)return {A:ST[0],B:null,w:0};
 if(t<TL.ge)return {A:ST[0],B:ST[1],w:smooth((t-TL.g)/GROUND)};
 for(let k=1;k<ST.length-1;k++){const c=TL.c+k*SW,u=(t-(c-FADE/2))/FADE;if(u<0)return {A:ST[k],B:null,w:0};if(u<1)return {A:ST[k],B:ST[k+1],w:smooth(u)};}
 return {A:ST[ST.length-1],B:null,w:0};
};

// ───────────── descriptions ─────────────
const symText=l=>({none:'placed once',mirror:'mirrored left–right (2×)',mirror4:'fourfold mirror (4×)',radial:`rotated ${l.k}× about the centre`,dihedral:`${l.k}-fold rotation with mirror (${2*l.k}×)`}[l.sym]);
function describe(){
 const c=colourway(proj.palette),wv=WEAVES[proj.weave],fw=WEAVES[MOTIF_WEAVE[proj.weave]],vis=visLayers();
 const L1=[`# ${proj.title}`,proj.subtitle,'', `## Construction`];
 vis.forEach((l,i)=>{const p=PARTS[l.part],f=p.f(l.n);L1.push(`${i+1}. **${p.title}** (${p.tag}) — ${p.blurb}. ${f[0]}; ${f[1]}; ${f[2]}. Placement: ${symText(l)}.`);});
 L1.push('',`## Colour`,`${c.n} — ${c.dye}.`);
 const ex=TL?TL.extras:[];if(ex.length)L1.push(`Also shown: ${ex.map(k=>colourway(k).n).join(', ')}.`);
 L1.push('',`## Weave`,`${wv.name} (${wv.spec}). Damask principle: the ground is woven in ${wv.name}, the figure in ${fw.name}.`);
 if(proj.repeat!=='single')L1.push('',`## Repeat`,proj.repeat==='halfdrop'?'Half-drop repeat: every other column shifts down by half a height.':'Square grid repeat.');
 if(proj.note)L1.push('',`## Note`,proj.note);
 return L1.join('\n');
}
const summary=()=>visLayers().map(l=>PARTS[l.part].title).join(' · ');

// ───────────── film frame ─────────────
function stageFrame(P,t){
 const bg=P.ground,dark=lum(bg)<.55,fg=dark?'#efe6d2':'#1a1410',gold=dark?GOLD:'#8a5a10';
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 let label='',sub='',l1='',l2='',l3='',l2col=CORAL;
 const pace=proj.pace,q=Math.min(.46*proj.cell/TL.hw,.46*proj.cell*1.25/TL.hh,1.2);
 if(t<TL.a){const a=smooth(t/1.2)*(1-smooth((t-(TL.a-.5))/.5));text('NAKIŞ',CX,CY-40,150,GOLD,{align:'center',alpha:a,style:'normal',weight:'500'});text(proj.title,CX,CY+36,52,fg,{align:'center',alpha:a,fit:900});text(`composed from ${TL.n} part${TL.n>1?'s':''}`,CX,CY+92,26,fg,{align:'center',alpha:a*.6,font:SANS,style:'normal'});}
 else{
  const useTiles=rep&&t>=TL.m,hu=useTiles?inOut((t-TL.m)/3):0;
  if(!useTiles){
   TL.vis.forEach((l,i)=>{const u=(t-(TL.a+i*pace))/(pace*.85);if(u<=0)return;const shs=placed(l).shapes;shs.forEach((sh,j)=>{const p=smooth((u-(j/shs.length)*.55)/.45);drawSh(sh,P,CX,CY,1,Math.min(1,p*2)*(l.opacity??1),p*(l.reveal??1));});});
  }else{
   const w=proj.cell,h=proj.cell*1.25,S=1+(q-1)*hu,hy=CY+(675-CY)*hu,mM=Math.ceil(560/w)+1,nM=Math.ceil(760/h)+1;
   for(let m=-mM;m<=mM;m++)for(let n=-nM;n<=nM;n++){if(!m&&!n)continue;const d=Math.hypot(m,n),u=(t-TL.m-1.2-d*.45)/1.2;if(u<=0)continue;
    const x=CX+m*w,y=675+n*h+(proj.repeat==='halfdrop'&&Math.abs(m%2)===1?h/2:0);drawAll(P,x,y,q*outBack(u),smooth(u*2));}
   drawAll(P,CX,hy,S,1);
  }
  // captions
  if(t<TL.bEnd){const ci=clamp(Math.floor((t-TL.a)/pace),0,TL.n-1),l=TL.vis[ci],p=PARTS[l.part],f=p.f(l.n);label=p.title.toUpperCase();sub=p.blurb;l1=f[0];l2=f[1];l3=f[2];text(`PART ${ci+1} / ${TL.n}`,W-70,1190,22,fg,{align:'right',alpha:.6,font:SANS,style:'normal'});}
  else if(t<TL.m||(!rep&&t<TL.g)){label=proj.title.toUpperCase();sub=proj.subtitle;l1=summary();l2=`${TL.n} part${TL.n>1?'s':''}`;}
  else if(t<TL.g){label='REPEAT';sub=proj.repeat==='halfdrop'?'Half-drop repeat: every other column shifts down by half a height':'Square grid repeat';l1='pₘₙ = q + (m·w, n·h)';l2='m, n ∈ ℤ';}
  else if(t<TL.c){label='WOVEN INTO THE CLOTH';sub='The figure is woven, not printed: one structure for the figure, another for the ground';l1=proj.title;l2='';}
  P._cap={label,sub,l1,l2,l3,l2col,cloth:t>=TL.c};
 }
 if(t>=TL.a)brocadeOver(ctx,W,H,P);
 if(t>=TL.a){
  const c=P._cap||{},fa=1-smooth((t-(TL.total-OUTRO))/1);
  if(rep&&t>=TL.m){ctx.save();ctx.fillStyle=bg;ctx.globalAlpha=.86;ctx.fillRect(0,0,W,175);ctx.fillRect(0,1050,W,300);ctx.restore();weaveOver(P,0,175);weaveOver(P,1050,H);}
  if(!c.cloth){
   text(c.label,70,100,34,GOLD,{font:SANS,style:'normal',weight:'500',fit:940});text(c.sub,70,148,27,fg,{alpha:.8,fit:940});
   text(c.l1,70,1135,40,fg,{alpha:fa,fit:940});text(c.l2,70,1235,84,c.l2col,{style:'normal',alpha:fa,fit:560});text(c.l3,W-70,1235,34,gold,{align:'right',alpha:fa,fit:420});
  }else{
   const wv=WEAVES[P.wk||'plain'];
   text('WOVEN INTO THE CLOTH',70,100,34,GOLD,{font:SANS,style:'normal',weight:'500'});text(proj.title,70,148,27,fg,{alpha:.8,fit:940});
   text(P.dye,70,1112,27,fg,{alpha:.85*fa,fit:940});text(P.n,70,1200,76,gold,{style:'normal',alpha:fa,fit:700});text(wv.name,70,1258,40,fg,{alpha:fa,fit:600});
   text(`damask structure · figure in ${WEAVES[MOTIF_WEAVE[P.wk||'plain']].name}`,70,1298,23,fg,{alpha:.6*fa,font:SANS,style:'normal',fit:700});
   draft(wv,W-70,1068,fg,fa);
  }
  if(t>TL.total-OUTRO){const o=smooth((t-(TL.total-OUTRO))/1);text('NAKIŞ — '+proj.title,CX,1150,44,fg,{align:'center',alpha:o,fit:960});wrap(proj.subtitle,CX,1196,26,fg,900,34,{align:'center',alpha:o*.8});if(proj.note)wrap(proj.note,CX,1262,22,fg,900,30,{align:'center',alpha:o*.6});}
 }
 text(proj.mark,W-40,1328,22,fg,{align:'right',alpha:.55,style:'normal',font:SANS});
}
function frame(t){
 const st=pal(t);
 if(!st.B){ctx=mctx;stageFrame(st.A,t);return;}
 ctx=caX;stageFrame(st.A,t);ctx=cbX;stageFrame(st.B,t);ctx=mctx;
 mctx.setTransform(1,0,0,1,0,0);mctx.globalAlpha=1;mctx.drawImage(ca,0,0);mctx.globalAlpha=st.w;mctx.drawImage(cb,0,0);mctx.globalAlpha=1;
}

// ───────────── edit view ─────────────
let texTimer=0,needTex=false;
function drawEdit(tex){
 ctx=mctx;const P=ST[1];ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=P.ground;ctx.fillRect(0,0,W,H);
 drawAll(P,CX,CY,1,1);
 if(tex&&proj.tex)brocadeOver(ctx,W,H,P);
 ctx.save();ctx.setLineDash([8,8]);ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.28)';ctx.strokeRect(60,190,W-120,870);ctx.beginPath();ctx.moveTo(CX,190);ctx.lineTo(CX,1060);ctx.moveTo(60,CY);ctx.lineTo(W-60,CY);ctx.stroke();
 const l=proj.layers[sel];if(l&&l.visible){const b=placed(l).box;ctx.strokeStyle='#ffb347';ctx.lineWidth=2.5;ctx.setLineDash([]);ctx.strokeRect(CX+b.x0,CY+b.y0,b.x1-b.x0,b.y1-b.y0);}
 ctx.restore();
 if(!proj.layers.length){text(t2('Sağdan bir parça ekleyin ya da hazır örnek yükleyin','Add a part on the right or load an example'),CX,CY,34,'#fff',{align:'center',alpha:.6,style:'normal',font:SANS});}
}
function redraw(){if(mode==='motion'){drawMotion(now);return;}if(mode==='film'){frame(now);return;}drawEdit(false);clearTimeout(texTimer);needTex=true;texTimer=setTimeout(()=>{if(mode==='edit'){drawEdit(true);needTex=false;}},450);}
let raf=0;const redrawSoon=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;redraw();});};

// ───────────── persistence ─────────────
const KEY='nakis-studio-v1';let saveT=0;
function save(){if(!restoring)history.schedule(proj);clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(proj));}catch{}},400);}
function loadProj(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||!Array.isArray(p.layers)||p.layers.length>64)throw Error('Invalid project');
 const d=defaultProject(),o={...d,...p,custom:{...d.custom,...(p.custom||{})},motion:motionSettings(p.motion)};
 for(const k of ['ground','ink','accent','soft'])if(!/^#[0-9a-f]{6}$/i.test(o.custom[k]))o.custom[k]=d.custom[k];
 for(const k of ['title','subtitle','note','mark'])o[k]=String(o[k]??'').slice(0,1000);
 o.layers=p.layers.filter(l=>l&&PARTS[l.part]).map(l=>{
  const r={...newLayer(l.part),...l,...poseOf(l),id:uid++};
  if(!PARTS[r.part].counts.includes(r.n))r.n=PARTS[r.part].counts.at(-1);
  r.sym=['none','mirror','mirror4','radial','dihedral'].includes(r.sym)?r.sym:'none';
  r.k=clamp(Math.round(+r.k||6),2,24);r.shift=clamp(Math.round(+r.shift||0),0,2);r.visible=l.visible!==false;r.flip=l.flip===true;
  r.keys=normaliseKeys(l.keys,o.motion.duration,r);r.experimental=l.experimental===true;r.geo=geometrySettings(l.geo);return r;
 });
 if(!HISTORIC[o.palette]&&o.palette!=='custom')o.palette='turkeyred';if(!WEAVES[o.weave])o.weave='twill22';if(!['single','halfdrop','grid'].includes(o.repeat))o.repeat='single';
 o.showcase=(Array.isArray(o.showcase)?o.showcase:[]).filter(k=>HISTORIC[k]).slice(0,20);o.pace=clamp(+o.pace||2.6,1,8);o.cell=clamp(+o.cell||300,160,520);
 proj=o;draftPose=null;sel=Math.min(sel,Math.max(0,o.layers.length-1));
}
function changed(structure){mode='edit';playing=false;rebuild();updateDerived();if(structure)renderPanel();redrawSoon();save();}

// ───────────── panel ─────────────
const GRP={brand:['Brand symbols','Marka sembolleri'],motif:['Motifs','Motifler'],fractal:['Fractal curves','Fraktal eğriler']};
const draftSVG=wk=>{const wv=WEAVES[wk],n=Math.min(wv.P,8),c=6;let s=`<svg width="${n*c}" height="${n*c}" viewBox="0 0 ${n*c} ${n*c}" style="float:right;margin-left:6px">`;for(let j=0;j<n;j++)for(let i=0;i<n;i++)s+=`<rect x="${i*c}" y="${j*c}" width="${c-1}" height="${c-1}" fill="${wv.top(i,j)?'currentColor':'none'}" stroke="currentColor" stroke-opacity=".35"/>`;return s+'</svg>';};
const rng=(lab,k,min,max,step,v)=>`<div class="ctl"><label>${lab}</label><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${v}</output></div>`;
const sw=c=>`<div class="sw"><i style="background:${c.ground}"></i><i style="background:${c.ink}"></i><i style="background:${c.accent}"></i><i style="background:${c.soft}"></i></div>`;
function tabParts(){
 const l=proj.layers[sel],opts=Object.keys(PRESETS).map(k=>`<option value="${k}">${PRESETS[k]().title}</option>`).join('');
 let h=`<h3>${t2('Hazır örnek','Examples')}</h3><select data-act="preset"><option value="">${t2('Örnek yükle…','Load an example…')}</option>${opts}</select>`;
 h+=`<h3>${t2('Katmanlar (çizim sırası)','Layers (build order)')}</h3><ul id="layers">${proj.layers.map((x,i)=>`<li class="${i===sel?'on':''}"><input type="checkbox" data-act="vis" data-i="${i}" ${x.visible?'checked':''}><span class="nm" data-act="sel" data-i="${i}">${i+1}. ${PARTS[x.part].title} · n=${x.n}${x.sym!=='none'?' · '+x.sym:''}</span><button data-act="up" data-i="${i}">↑</button><button data-act="dn" data-i="${i}">↓</button><button data-act="dup" data-i="${i}">⧉</button><button data-act="del" data-i="${i}">✕</button></li>`).join('')||`<li class="hint">${t2('Henüz parça yok.','No parts yet.')}</li>`}</ul>`;
 h+=`<h3>${t2('Parça ekle','Add a part')}</h3>`;
 for(const g of ['brand','motif','fractal'])h+=`<div class="hint">${GRP[g][lang==='tr'?1:0]}</div><div class="grid">${PART_KEYS.filter(k=>PARTS[k].group===g).map(k=>`<button data-act="add" data-part="${k}">${PARTS[k].title}<small>${PARTS[k].tag}</small></button>`).join('')}</div>`;
 if(l){const p=PARTS[l.part];
  h+=`<h3>${t2('Geometrik işlemler','Geometry tools')}</h3><div class="btns"><button data-act="geo-triangle">${t2('Üçgenden üret','Build from triangle')}</button><button data-act="geo-chain">${t2('Fraktal zincir','Fractal chain')}</button><button data-act="geo-fold">${t2('Katla / aç','Fold / unfold')}</button></div>`;
  h+=`<h3>${t2('Seçili parça','Selected part')}: ${p.title}</h3><div class="hint">${p.blurb}</div>`;
  h+=`<div class="ctl2"><label>${t2('Sayı (n)','Count (n)')}</label><select data-k="n">${p.counts.map(c=>`<option ${c===l.n?'selected':''}>${c}</option>`).join('')}</select></div>`;
  h+=rng(t2('Görünürlük','Opacity'),'opacity',0,1,.01,l.opacity)+rng(t2('Boyut','Size'),'size',30,900,1,l.size)+rng('X','x',-540,540,1,l.x)+rng('Y','y',-600,600,1,l.y)+rng(t2('Dönüş °','Rotate °'),'rot',-180,180,.5,l.rot);
  h+=`<div class="ctl2"><label>${t2('Aynalı','Flip')}</label><label><input type="checkbox" data-k="flip" ${l.flip?'checked':''}> ${t2('yatay çevir','flip horizontally')}</label></div>`;
  h+=`<div class="ctl2"><label>${t2('Simetri','Symmetry')}</label><select data-k="sym">${[['none',t2('Yok','None')],['mirror',t2('Ayna (sol–sağ)','Mirror (left–right)')],['mirror4',t2('Dörtlü ayna','Fourfold mirror')],['radial',t2('Dairesel dönüş','Radial rotation')],['dihedral',t2('Dönüş + ayna','Rotation + mirror')]].map(([v,n])=>`<option value="${v}" ${l.sym===v?'selected':''}>${n}</option>`).join('')}</select></div>`;
  if(l.sym==='radial'||l.sym==='dihedral')h+=rng(t2('Kopya sayısı','Copies'),'k',2,24,1,l.k);
  h+=`<div class="ctl2"><label>${t2('Renk rolü','Colour role')}</label><select data-k="shift">${[t2('Normal','Normal'),t2('Altın öne','Accent leads'),t2('Yumuşak öne','Soft leads')].map((n,i)=>`<option value="${i}" ${l.shift===i?'selected':''}>${n}</option>`).join('')}</select></div>`;
  h+=`<div class="hint">${t2('İpucu: tuvalde sürükleyerek taşıyın, fare tekerleğiyle büyütün. Dairesel dönüşte parçayı merkezden uzağa koyarsanız halka oluşur.','Tip: drag on the canvas to move, mouse wheel to resize. With radial rotation, place the part away from the centre to make a ring.')}</div>`;
 }
 return h;
}
function tabColour(){
 let h=`<h3>${t2('Tarihî renk takımı','Historic colourway')}</h3><div class="hint">${t2('Karta tıklayın = ana renk. Kutu = filmin sonunda da gösterilsin.','Click a card = main colour. Tick = also show it at the end of the film.')}</div><div class="cards">`;
 for(const k of HISTORIC_ORDER){const c=HISTORIC[k];h+=`<div class="card ${proj.palette===k?'on':''}" data-act="pal" data-key="${k}">${sw(c)}<b>${c.n}</b><small>${c.dye}</small><label><input type="checkbox" data-act="show" data-key="${k}" ${proj.showcase.includes(k)?'checked':''}> ${t2('filmde göster','show in film')}</label></div>`;}
 const cc=proj.custom;
 h+=`<div class="card ${proj.palette==='custom'?'on':''}" data-act="pal" data-key="custom">${sw(cc)}<b>${t2('Özel renk takımı','Custom colourway')}</b><small>${t2('Zemin · desen · altın · yumuşak','Ground · ink · accent · soft')}</small><div style="display:flex;gap:4px;margin-top:6px">${['ground','ink','accent','soft'].map(n=>`<input type="color" data-c="${n}" value="${cc[n]}" style="width:100%;height:30px;padding:0;border:0;background:none">`).join('')}</div><small>${t2('Zemin/desen kontrastı','Ground/ink contrast')}: ${contrast(cc.ground,cc.ink).toFixed(1)}</small></div></div>`;
 return h;
}
function tabWeave(){
 let h=`<h3>${t2('Dokuma yapısı','Weave structure')}</h3><div class="hint">${t2('Zemin seçilen dokumayla, desen ise ona zıt bir dokumayla (damask ilkesi) dokunur.','The ground is woven in the chosen structure, the figure in a contrasting one (damask principle).')}</div><div class="cards">`;
 for(const k of WEAVE_ORDER){const w=WEAVES[k];h+=`<div class="card ${proj.weave===k?'on':''}" data-act="weave" data-key="${k}">${draftSVG(k)}<b>${w.name}</b><small>${w.spec}</small><small>${t2('Desen','Figure')}: ${WEAVES[MOTIF_WEAVE[k]].name}</small></div>`;}
 h+=`</div><label class="hint"><input type="checkbox" data-p="cycle" ${proj.cycle?'checked':''}> ${t2('Filmde renk takımı değişirken dokuma da değişsin','Change the weave along with the colourway in the film')}</label>`;
 h+=`<label class="hint"><input type="checkbox" data-p="tex" ${proj.tex?'checked':''}> ${t2('Düzenleme ekranında kumaş dokusunu göster','Show cloth texture in the edit view')}</label>`;
 h+=`<h3>${t2('Tekrar (kumaşa yayılma)','Repeat (spreading across the cloth)')}</h3><div class="ctl2"><label>${t2('Düzen','Layout')}</label><select data-p="repeat">${[['single',t2('Tek kompozisyon','Single composition')],['halfdrop',t2('Yarım kaydırmalı tekrar','Half-drop repeat')],['grid',t2('Kare ızgara tekrarı','Square grid repeat')]].map(([v,n])=>`<option value="${v}" ${proj.repeat===v?'selected':''}>${n}</option>`).join('')}</select></div>`;
 h+=`<div class="ctl"><label>${t2('Hücre genişliği','Cell width')}</label><input type="range" data-p="cell" min="160" max="520" step="5" value="${proj.cell}"><output>${proj.cell}</output></div>`;
 return h;
}
function tabText(){
 return `<h3>${t2('Film metinleri (İngilizce)','Film text (English)')}</h3><div class="hint">${t2('Filmde görünen yazılar İngilizce kalmalı.','On-screen text stays in English.')}</div>
 <div class="ctl2"><label>${t2('Başlık','Title')}</label><input type="text" data-p="title" value="${esc(proj.title)}"></div>
 <div class="ctl2"><label>${t2('Alt başlık','Subtitle')}</label><input type="text" data-p="subtitle" value="${esc(proj.subtitle)}"></div>
 <div class="ctl2"><label>${t2('Not','Note')}</label><textarea data-p="note">${esc(proj.note)}</textarea></div>
 <div class="ctl2"><label>${t2('Filigran','Watermark')}</label><input type="text" data-p="mark" value="${esc(proj.mark)}"></div>
 <h3>${t2('Otomatik açıklama','Automatic description')}</h3><div class="desc" id="desc">${esc(describe())}</div><div class="btns"><button data-act="descdl">${t2('Açıklamayı indir (.md)','Download description (.md)')}</button><button data-act="desccopy">${t2('Kopyala','Copy')}</button></div>`;
}
function tabOut(){
 return `<h3>${t2('Film','Film')}</h3>
 <div class="ctl"><label>${t2('Parça başına sn','Seconds per part')}</label><input type="range" data-p="pace" min="1" max="8" step=".1" value="${proj.pace}"><output>${proj.pace}</output></div>
 <div class="hint">${t2('Toplam süre','Total length')}: <b id="dur"></b></div>
 <div class="btns"><button class="pri" data-act="play">${t2('Filmi oynat','Play film')}</button><button data-act="cloth">${t2('Bitmiş kumaşı göster','Show finished cloth')}</button><button data-act="rec">${t2('● WebM kaydet','● Record WebM')}</button><button data-act="png">PNG</button><button data-act="svg">SVG</button></div>
 <label class="hint"><input id="svg-opt" type="checkbox"> ${t2('SVG açık çizgilerini hafiflet (isteğe bağlı)','Simplify open SVG strokes (optional)')}</label><div class="hint">${t2('SVG, tek kompozisyonun vektör geometrisini içerir; kumaş dokusu ve film yazıları PNG / videoda kalır.','SVG contains one composition’s vector geometry; cloth texture and film captions remain in PNG / video.')}</div>
 <div class="hint">${t2('WebM kaydı gerçek zamanlıdır; bilgisayar yavaşsa kare atlayabilir. Sergi kalitesinde mp4 için proje dosyasını kaydedip bana gönderin.','WebM recording runs in real time and may drop frames on a slow computer. For exhibition-grade mp4, save the project file and send it to me.')}</div>
 <h3>${t2('Proje','Project')}</h3><div class="btns"><button data-act="savep">${t2('Projeyi kaydet (.json)','Save project (.json)')}</button><button data-act="loadp">${t2('Proje aç','Open project')}</button><button data-act="newp">${t2('Yeni','New')}</button></div><input type="file" id="file" accept=".json,application/json" hidden>`;
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const TABS=[['parts','Parçalar','Parts'],['geometry','Geometri','Geometry'],['colour','Renk','Colour'],['weave','Dokuma','Weave'],['text','Metin','Text'],['motion','Hareket','Motion'],['out','Çıktı','Output']];
function renderPanel(){
 $('tabs').innerHTML=TABS.map(([k,a,b])=>`<button data-act="tab" data-key="${k}" class="${tab===k?'on':''}">${t2(a,b)}</button>`).join('');
 $('panel').innerHTML={parts:tabParts,geometry:()=>geometryPanel(proj.layers[sel],proj.layers[sel]?shapesOf(proj.layers[sel].part,proj.layers[sel].n):[],PARTS,t2),colour:tabColour,weave:tabWeave,text:tabText,motion:()=>motionPanel(proj,sel,Math.min(now,proj.motion.duration),draftPose,selectedEase,onion,PARTS,t2),out:tabOut}[tab]();
 $('pp').textContent=playing?'⏸':t2('▶ Film','▶ Film');$('sub').textContent=t2('— parçalardan motif, motiften kumaş','— parts into motif, motif into cloth');
 updateDerived();
}
function updateDerived(){const d=$('dur'),total=sceneTotal();if(d)d.textContent=`${Math.floor(total/60)}:${String(Math.round(total%60)).padStart(2,'0')}`;const e=$('desc');if(e)e.textContent=describe();}
function toast(s){const e=$('toast');e.textContent=s;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2200);}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
const slug=()=>proj.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'composition';

// ───────────── motion and transport ─────────────
const sceneTotal=()=>proj.motion.enabled?proj.motion.duration:TL.total;
function effectiveLayer(l,t=now){return {...l,...(mode==='motion'&&l===proj.layers[sel]&&draftPose?draftPose:samplePose(l,t,proj.motion.duration))};}
function motionLayers(t=now){return visLayers().map(l=>effectiveLayer(l,t));}
function drawMotion(t,ghosts=true){
 ctx=mctx;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=ST[1].ground;ctx.fillRect(0,0,W,H);
 const P={...ST[1],wk:proj.tex?ST[1].wk:null};
 if(onion&&ghosts&&!playing){const l=proj.layers[sel];if(l){const keys=l.keys||[],prev=keys.filter(k=>k.t<t).at(-1),next=keys.find(k=>k.t>t);for(const k of [prev,next])if(k)drawAll(P,CX,CY,1,.12,[{...l,...k.pose}]);}}
 drawAll(P,CX,CY,1,1,motionLayers(t));if(proj.tex)brocadeOver(ctx,W,H,P);
}
function timeUI(total){
 $('seek').value=Math.round(now/total*1000);$('seek').setAttribute?.('aria-label',t2('Zaman çizelgesi','Timeline'));
 $('tm').textContent=now.toFixed(1)+' s';
 const input=$('motion-time');if(input&&document.activeElement!==input)input.value=now.toFixed(2);
 document.querySelectorAll('.playhead').forEach(e=>e.style.left=Math.min(100,now/proj.motion.duration*100)+'%');
}
function showFilm(t){mode='film';now=clamp(t,0,TL.total);frame(now);timeUI(TL.total);}
function showMotion(t){mode='motion';now=clamp(t,0,proj.motion.duration);drawMotion(now);timeUI(proj.motion.duration);}
function showScene(t){proj.motion.enabled?showMotion(t):showFilm(t);}
function cleanFrame(){
 if(mode==='motion'){drawMotion(now,false);return;}
 if(mode==='film'){frame(now);return;}
 ctx=mctx;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=ST[1].ground;ctx.fillRect(0,0,W,H);drawAll(ST[1],CX,CY,1,1);if(proj.tex)brocadeOver(ctx,W,H,ST[1]);
}
function editMotion(){draftPose=null;playing=false;mode='motion';now=clamp(now,0,proj.motion.duration);tab='motion';renderPanel();showMotion(now);}
function motionChanged(){playing=false;mode='motion';rebuild();save();renderPanel();showMotion(now);}
function restoreHistory(direction){
 const p=history[direction]();if(!p)return;
 restoring=true;loadProj(p);changed(true);restoring=false;
 if(proj.motion.enabled)editMotion();
}
function captureKey(){
 history.flush();
 const l=proj.layers[sel];if(!l)return;
 try{l.keys=putKey(l,now,draftPose||samplePose(l,now,proj.motion.duration),selectedEase,proj.motion.duration);}catch{toast(t2('Katman başına en fazla 128 anahtar kare','Maximum 128 keyframes per layer'));return;}draftPose=null;motionChanged();
}
function geometryCopy(){
 let l=proj.layers[sel];if(!l)return null;
 if(!l.experimental){
  const copy={...JSON.parse(JSON.stringify(l)),id:uid++,experimental:true,visible:true,geo:geometrySettings(),keys:[]};
  l.visible=false;proj.layers.splice(sel+1,0,copy);sel++;l=copy;
 }
 draftPose=null;playing=false;mode='edit';tab='geometry';return l;
}
function geometryAction(action){
 const source=proj.layers[sel];
 if(action!=='chain'&&source&&!shapesOf(source.part,source.n).some(s=>s.fill&&s.closed&&triangulate(s.pts).length)){toast(t2('Bu işlem için kapalı yüzeyli bir parça seçin','Choose a filled part for this operation'));return;}
 const l=geometryCopy();if(!l)return;
 if(action==='triangle'){l.geo.kind='triangle';l.formation=0;}
 if(action==='fold'){l.geo.kind='fold';l.fold=.7;}
 if(action==='chain'){l.geo.chain=true;l.growth=1;l.size=Math.min(l.size,160);l.y=180;}
 l.geo=geometrySettings(l.geo);changed(true);
}
function animateGeometry(action){
 const l=geometryCopy();if(!l)return;
 if(action==='triangle')l.geo.kind='triangle';if(action==='fold')l.geo.kind='fold';if(action==='chain')l.geo.chain=true;
 const d=proj.motion.duration,b=poseOf(l),keys=[];
 if(action==='fold'){
  b.fold=0;keys.push({t:0,pose:b,ease:'easeInOut'},{t:d/2,pose:poseOf({...b,fold:1}),ease:'easeInOut'},{t:d,pose:b,ease:'easeInOut'});
 }else{const channel=action==='triangle'?'formation':'growth';b[channel]=0;keys.push({t:0,pose:b,ease:'easeInOut'},{t:d*.85,pose:poseOf({...b,[channel]:1}),ease:'easeInOut'},{t:d,pose:poseOf({...b,[channel]:1}),ease:'hold'});}
 l.keys=keys;proj.motion.enabled=true;now=0;draftPose=null;changed(true);tab='geometry';mode='motion';showMotion(0);renderPanel();play();
}
let last=performance.now();
function loop(ts){
 const dt=Math.max(0,(ts-last)/1000);last=ts;
 if(playing&&(mode==='film'||mode==='motion')){
  const total=mode==='motion'?proj.motion.duration:TL.total,t=now+dt;
  if(t>=total){
   if(mode==='motion'&&proj.motion.loop&&!rec)showMotion(t%total);
   else{mode==='motion'?showMotion(total):showFilm(total);playing=false;$('pp').textContent=t2('▶ Film','▶ Film');if(rec)stopRecording();}
  }else mode==='motion'?showMotion(t):showFilm(t);
 }
 requestAnimationFrame(loop);
}
function play(){
 if(rec)return;
 if(!proj.layers.length){toast(t2('Önce parça ekleyin','Add a part first'));return;}
 const target=proj.motion.enabled?'motion':'film',total=sceneTotal();
 if(mode!==target||now>=total)now=0;
 draftPose=null;playing=!playing;last=performance.now();showScene(now);$('pp').textContent=playing?'⏸':t2('▶ Film','▶ Film');
}
function lockRecording(lock){
 document.querySelectorAll('#panel button,#panel input,#panel select,#panel textarea,#tabs button,#lang,#undo,#redo,#seek,#pp').forEach(e=>e.disabled=lock);
 $('rec-stop').hidden=!lock;
}
function stopRecording(){if(rec&&rec.state!=='inactive')rec.stop();playing=false;}
function record(){
 if(rec)return;
 if(!window.MediaRecorder||!cv.captureStream){toast(t2('Bu tarayıcı kayıt desteklemiyor','Recording is not supported in this browser'));return;}
 if(!proj.layers.length){toast(t2('Önce parça ekleyin','Add a part first'));return;}
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
 if(!mime){toast(t2('Uyumlu video biçimi bulunamadı','No supported video format'));return;}
 let stream;
 try{
  draftPose=null;onion=false;showScene(0);stream=cv.captureStream(30);const ch=[],name=slug();
  const r=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:12e6});
  r.ondataavailable=e=>e.data.size&&ch.push(e.data);
  r.onstop=()=>{stream.getTracks().forEach(t=>t.stop());rec=null;playing=false;lockRecording(false);renderPanel();$('pp').textContent=t2('▶ Film','▶ Film');if(ch.length)download(new Blob(ch,{type:r.mimeType||mime}),`nakis-${name}.${mime.startsWith('video/mp4')?'mp4':'webm'}`);};
  r.onerror=()=>{stopRecording();toast(t2('Kayıt hatası; mevcut bölüm kaydediliyor','Recording error; saving captured section'));};
  rec=r;r.start(250);playing=true;last=performance.now();lockRecording(true);$('pp').textContent='⏸';toast(t2('Kayıt başladı — sekmeyi açık tutun','Recording — keep this tab open'));
 }catch{if(stream)stream.getTracks().forEach(t=>t.stop());rec=null;playing=false;lockRecording(false);toast(t2('Kayıt başlatılamadı','Could not start recording'));}
}

// ───────────── events ─────────────
const move=(i,d)=>{const j=i+d;if(j<0||j>=proj.layers.length)return;[proj.layers[i],proj.layers[j]]=[proj.layers[j],proj.layers[i]];sel=j;};
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-act]');if(!el||el.tagName==='SELECT'||el.type==='checkbox')return;const a=el.dataset.act,i=+el.dataset.i,key=el.dataset.key;
 if(rec){if(a==='rec-stop')stopRecording();return;}
 if(a==='undo'){restoreHistory('undo');return;}if(a==='redo'){restoreHistory('redo');return;}
 history.flush();
 if(a==='tab'){tab=key;if(tab==='motion'){editMotion();return;}if(tab==='geometry'){mode='edit';playing=false;redraw();}draftPose=null;renderPanel();return;}
 if(a==='geo-triangle'){geometryAction('triangle');return;}if(a==='geo-chain'){geometryAction('chain');return;}if(a==='geo-fold'){geometryAction('fold');return;}
 if(a.startsWith('geo-play-')){animateGeometry(a.slice(9));return;}
 if(a==='motion-edit'){draftPose=null;mode='edit';playing=false;tab='parts';renderPanel();redraw();return;}
 if(a==='motion-start'){draftPose=null;playing=false;showMotion(0);renderPanel();return;}
 if(a==='motion-play'){if(!proj.motion.enabled){proj.motion.enabled=true;save();}play();return;}
 if(a==='motion-layer'){sel=i;draftPose=null;editMotion();return;}
 if(a==='motion-key'){sel=i;draftPose=null;const k=proj.layers[i].keys[+el.dataset.keyIndex];if(k){selectedEase=k.ease;showMotion(k.t);renderPanel();}return;}
 if(a==='motion-capture'){captureKey();return;}
 if(a==='motion-delete'){const l=proj.layers[sel];if(l){l.keys=l.keys.filter(k=>Math.abs(k.t-now)>.001);draftPose=null;motionChanged();}return;}
 if(a==='motion-discard'){draftPose=null;editMotion();return;}
 if(a==='motion-example'){const l=proj.layers[sel];if(!l)return;const b=poseOf(l),d=proj.motion.duration;l.keys=[{t:0,pose:b,ease:'easeInOut'},{t:d/2,pose:poseOf({...b,y:b.y-55,rot:b.rot+5,size:b.size*1.04}),ease:'easeInOut'},{t:d,pose:b,ease:'easeInOut'}];proj.motion.enabled=true;draftPose=null;now=0;motionChanged();return;}
 if(a==='add'){const l=newLayer(el.dataset.part,{size:proj.layers.length?220:320});proj.layers.push(l);sel=proj.layers.length-1;changed(true);return;}
 if(a==='sel'){sel=i;mode='edit';renderPanel();redrawSoon();return;}
 if(a==='up'){move(i,-1);changed(true);return;}if(a==='dn'){move(i,1);changed(true);return;}
 if(a==='dup'){const c={...JSON.parse(JSON.stringify(proj.layers[i])),id:uid++,x:proj.layers[i].x+30,y:proj.layers[i].y+30};proj.layers.splice(i+1,0,c);sel=i+1;changed(true);return;}
 if(a==='del'){proj.layers.splice(i,1);sel=Math.max(0,Math.min(sel,proj.layers.length-1));changed(true);return;}
 if(a==='pal'){if(e.target.closest('label,input'))return;proj.palette=key;changed(true);return;}
 if(a==='weave'){proj.weave=key;changed(true);return;}
 if(a==='play'){play();return;}
 if(a==='cloth'){if(!proj.layers.length)return;playing=false;showFilm(TL.c+.5);$('pp').textContent=t2('▶ Film','▶ Film');return;}
 if(a==='rec'){record();return;}
 if(a==='png'){cleanFrame();cv.toBlob(b=>{if(b)download(b,`nakis-${slug()}.png`);redraw();});return;}
 if(a==='svg'){const layers=mode==='motion'?motionLayers():visLayers(),result=sceneSVG(layers,ST[1],placed,{optimise:$('svg-opt')?.checked});download(new Blob([result.svg],{type:'image/svg+xml'}),`nakis-${slug()}.svg`);toast(`${result.after} / ${result.before} ${t2('nokta','points')}`);return;}
 if(a==='savep'){download(new Blob([JSON.stringify(proj,null,1)],{type:'application/json'}),`nakis-${slug()}.json`);return;}
 if(a==='loadp'){$('file').click();return;}
 if(a==='newp'){proj=defaultProject();sel=0;changed(true);return;}
 if(a==='descdl'){download(new Blob([describe()],{type:'text/markdown'}),`nakis-${slug()}.md`);return;}
 if(a==='desccopy'){try{navigator.clipboard.writeText(describe());toast(t2('Kopyalandı','Copied'));}catch{}return;}
});
document.addEventListener('input',e=>{
 const el=e.target,k=el.dataset.k,p=el.dataset.p,a=el.dataset.act,c=el.dataset.c;
 if(rec)return;
 if(el.dataset.geo){const l=geometryCopy();if(!l)return;const k=el.dataset.geo;
  if(['formation','fold','growth'].includes(k))l[k]=poseOf({...l,[k]:+el.value})[k];
  else l.geo=geometrySettings({...l.geo,[k]:el.type==='checkbox'?el.checked:(k==='kind'?el.value:+el.value)});
  changed(false);const out=el.parentNode.querySelector('output');if(out)out.textContent=el.value;
  if(['kind','chain','mesh'].includes(k))renderPanel();return;
 }
 if(el.dataset.pose){const l=proj.layers[sel];if(!l)return;draftPose=poseOf({...draftPose||samplePose(l,now,proj.motion.duration),[el.dataset.pose]:+el.value});el.parentNode.querySelector('output').textContent=el.value;mode='motion';playing=false;drawMotion(now);const msg=$('motion-draft');if(msg)msg.textContent=t2('Poz henüz kaydedilmedi. Anahtar kare ekle düğmesine basın.','Pose not saved yet. Press Add keyframe.');return;}
 if(el.dataset.motion){const k=el.dataset.motion;
  if(k==='duration')return;
  if(k==='time'){draftPose=null;playing=false;showMotion(+el.value);return;}
  if(k==='ease'){selectedEase=Object.hasOwn(EASINGS,el.value)?el.value:'easeInOut';renderPanel();return;}
  if(k==='onion'){onion=el.checked;drawMotion(now);return;}
  proj.motion=motionSettings({...proj.motion,[k]:el.type==='checkbox'?el.checked:+el.value});now=Math.min(now,proj.motion.duration);for(const l of proj.layers)l.keys=normaliseKeys(l.keys,proj.motion.duration,poseOf(l));draftPose=null;motionChanged();return;
 }
 if(k){const l=proj.layers[sel];if(!l)return;l[k]=el.type==='checkbox'?el.checked:(k==='sym'?el.value:+el.value);const o=el.parentNode.querySelector('output');if(o)o.textContent=el.value;
  changed(k==='sym');if(k==='n'||k==='shift'){/* list label */ const nm=document.querySelector('#layers li.on .nm');if(nm)nm.textContent=`${sel+1}. ${PARTS[l.part].title} · n=${l.n}${l.sym!=='none'?' · '+l.sym:''}`;}return;}
 if(p){proj[p]=el.type==='checkbox'?el.checked:(el.type==='range'?+el.value:el.value);const o=el.parentNode.querySelector('output');if(o)o.textContent=el.value;changed(p==='repeat');return;}
 if(c){proj.custom[c]=el.value;proj.palette='custom';changed(false);return;}
 if(a==='vis'){proj.layers[+el.dataset.i].visible=el.checked;changed(false);return;}
 if(a==='show'){const key=el.dataset.key;proj.showcase=el.checked?[...proj.showcase,key]:proj.showcase.filter(x=>x!==key);changed(false);return;}
 if(a==='preset'){const f=PRESETS[el.value];if(f){proj=loadFrom(f());sel=0;changed(true);}return;}
});
function loadFrom(p){const keep=proj;loadProj(p);const r=proj;proj=keep;return r;}
$('lang').onclick=()=>{lang=lang==='tr'?'en':'tr';try{localStorage.setItem('nakis-lang',lang);}catch{}$('lang').textContent=lang==='tr'?'EN':'TR';renderPanel();redrawSoon();};
$('pp').onclick=play;
$('seek').oninput=e=>{if(rec)return;draftPose=null;playing=false;const motion=mode==='motion'||proj.motion.enabled;(motion?showMotion:showFilm)(e.target.value/1000*(motion?proj.motion.duration:TL.total));if(tab==='motion')renderPanel();};
document.addEventListener('change',e=>{
 if(rec)return;
 if(e.target.dataset.motion==='duration'){
  const old=proj.motion.duration;proj.motion=motionSettings({...proj.motion,duration:+e.target.value});
  for(const l of proj.layers)l.keys=normaliseKeys(l.keys.map(k=>({...k,t:k.t*proj.motion.duration/old})),proj.motion.duration,poseOf(l));
  now=Math.min(now*proj.motion.duration/old,proj.motion.duration);draftPose=null;motionChanged();return;
 }
 if(e.target.id==='file'){const f=e.target.files[0];if(!f)return;if(f.size>2e6){toast(t2('Proje dosyası fazla büyük','Project file too large'));e.target.value='';return;}f.text().then(s=>{try{loadProj(JSON.parse(s));sel=0;changed(true);if(proj.motion.enabled)editMotion();toast(t2('Proje yüklendi','Project loaded'));}catch{toast(t2('Dosya okunamadı','Could not read file'));}});e.target.value='';}
});
// canvas: select, drag, wheel
let drag=null;
const pos=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*W-CX,(e.clientY-r.top)/r.height*H-CY];};
cv.addEventListener('pointerdown',e=>{if(rec||playing||!['edit','motion'].includes(mode))return;const [x,y]=pos(e),hit=i=>{const l=proj.layers[i];if(!l||!l.visible)return false;const b=placed(mode==='motion'?effectiveLayer(l):l).box;return x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1;};
 let h=hit(sel)?sel:-1;if(h<0)for(let i=proj.layers.length-1;i>=0;i--)if(hit(i)){h=i;break;}
 if(h<0)return;if(h!==sel){sel=h;renderPanel();}const pose=mode==='motion'?effectiveLayer(proj.layers[sel]):proj.layers[sel];if(mode==='motion')draftPose=poseOf(pose);drag={x,y,lx:pose.x,ly:pose.y,motion:mode==='motion'};cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing';});
cv.addEventListener('pointermove',e=>{if(!drag)return;const [x,y]=pos(e),l=proj.layers[sel];if(drag.motion){draftPose=poseOf({...draftPose,x:drag.lx+x-drag.x,y:drag.ly+y-drag.y});drawMotion(now);for(const k of ['x','y']){const input=document.querySelector(`[data-pose=${k}]`);if(input){input.value=draftPose[k];input.parentNode.querySelector('output').textContent=Math.round(draftPose[k]);}}}else{l.x=Math.round(drag.lx+x-drag.x);l.y=Math.round(drag.ly+y-drag.y);syncXY(l);rebuild();redrawSoon();}});
const endDrag=()=>{if(drag){const motion=drag.motion;drag=null;cv.style.cursor='grab';if(!motion)save();else renderPanel();}};cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
cv.addEventListener('wheel',e=>{if(mode!=='edit'||!proj.layers[sel])return;e.preventDefault();const l=proj.layers[sel];l.size=clamp(Math.round(l.size*Math.pow(1.0015,-e.deltaY)),30,900);const s=document.querySelector('[data-k=size]');if(s){s.value=l.size;s.parentNode.querySelector('output').textContent=l.size;}rebuild();redrawSoon();save();},{passive:false});
function syncXY(l){for(const k of ['x','y']){const s=document.querySelector(`[data-k=${k}]`);if(s){s.value=l[k];s.parentNode.querySelector('output').textContent=l[k];}}}


document.addEventListener('keydown',e=>{
 if(rec||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restoreHistory(e.shiftKey?'redo':'undo');}
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();restoreHistory('redo');}
 else if(e.code==='Space'){e.preventDefault();play();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(rec){stopRecording();toast(t2('Sekme gizlendi; mevcut kayıt sonlandırıldı','Tab hidden; captured section saved'));}playing=false;$('pp').textContent=t2('▶ Film','▶ Film');}});
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');reducedMotion?.addEventListener?.('change',e=>{if(e.matches&&!rec){playing=false;$('pp').textContent=t2('▶ Film','▶ Film');}});

// ───────────── boot ─────────────
window.renderAt=t=>{draftPose=null;playing=false;showScene(t);return sceneTotal();};
window.filmTotal=sceneTotal;
window.loadProject=p=>{history.flush();loadProj(p);sel=0;changed(true);if(proj.motion.enabled)editMotion();return sceneTotal();};
window.studio={get project(){return proj;},presets:PRESETS,parts:PARTS,motion:()=>editMotion(),captureKey,undo:()=>restoreHistory('undo'),redo:()=>restoreHistory('redo'),load:name=>{loadProj(PRESETS[name]());sel=0;changed(true);},edit:()=>{mode='edit';playing=false;drawEdit(true);}};
(async()=>{
 $('lang').textContent=lang==='tr'?'EN':'TR';
 const q=new URLSearchParams(location.search);let ok=false;
 try{const s=localStorage.getItem(KEY);if(s&&!q.get('preset')&&!q.get('p')){loadProj(JSON.parse(s));ok=true;}}catch{}
 if(q.get('preset')&&PRESETS[q.get('preset')]){loadProj(PRESETS[q.get('preset')]());ok=true;}
 if(q.get('p')){try{loadProj(await (await fetch(q.get('p'))).json());ok=true;}catch{}}
 if(!ok)loadProj(PRESETS.medallion());
 rebuild();history.reset(proj);renderPanel();
 if(q.get('t')!==null&&q.get('t')!==''&&q.get('t')!==undefined&&q.has('t'))showScene(+q.get('t'));else if(proj.motion.enabled)editMotion();else drawEdit(false),redraw();
 requestAnimationFrame(ts=>{last=ts;loop(ts);});
})();
