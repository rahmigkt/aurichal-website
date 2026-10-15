// NAKIŞ Studio — compose a motif from parts, dye it, weave it, film it.
import {MOTIFS} from './motifs.js';
import {RULES,build as buildCurve} from './iter-core.js';
import {L,S} from './prim.js';
import * as IMG from './imgpart.js';
import {clamp,smooth,inOut,outBack,mix,lum} from './film-core.js';
import {WEAVES,WEAVE_ORDER,MOTIF_WEAVE,weaveFor,weaveTile} from './weave.js';
import {HISTORIC,HISTORIC_ORDER,contrast} from './palettes.js';
import {brocadeOver} from './cloth.js';
import * as LAT from './lattice.js';
import * as SPI from './spiral.js';
import {expand as genExpand} from './iter-core.js';

const W=1080,H=1350,CX=540,CY=625,ROLES=['ink','accent','soft'];
const SERIF='"Cormorant Garamond","Times New Roman",Georgia,serif',SANS='Poppins,system-ui,-apple-system,"Segoe UI",sans-serif',GOLD='#f2c14e',CORAL='#ff6b5e';
const INTRO=2.4,HOLD=1.6,REP=8,GROUND=4.5,SW=4.4,FADE=1,TAIL=2.5,OUTRO=3.5;
const $=id=>document.getElementById(id);
const cv=$('c'),mctx=cv.getContext('2d',{willReadFrequently:true});let ctx=mctx,TARGET=null,SCL=1,OV={};
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
const genM=()=>proj.gen.pts.length+1,genMax=()=>{const m=genM(),a=proj.gen.arms;let n=1;while(n<12&&a*Math.pow(m,n+1)<=60000)n++;return n;};
const genRule=()=>({g:proj.gen.pts,alt:proj.gen.alt});
function genDim(){const P=[[0,0],...proj.gen.pts,[1,0]],r=[];for(let i=1;i<P.length;i++)r.push(Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));if(r.some(x=>x<1e-3||x>=.999))return null;let lo=0,hi=8;for(let k=0;k<60;k++){const D=(lo+hi)/2;if(r.reduce((a,x)=>a+Math.pow(x,D),0)>1)lo=D;else hi=D;}return (lo+hi)/2;}
PARTS.c_custom={title:'Your Shape',tag:'FRACTAL',group:'fractal',get counts(){return Array.from({length:genMax()},(_,i)=>i+1);},blurb:'Your drawn shape replaces every segment, again and again',
 build:n=>{const out=[];let pts;for(let a=0;a<proj.gen.arms;a++){const th=a*2*Math.PI/proj.gen.arms;pts=[[0,0],[Math.cos(th),Math.sin(th)]];for(let i=0;i<n;i++)pts=genExpand(pts,genRule()).full;out.push(L('c'+a,pts,ROLES[a%3],{thin:true}));}return out;},
 f:n=>['each segment → '+genM()+' segments (your shape)',`n = ${n}`,`segments: ${proj.gen.arms*Math.pow(genM(),n)}`]};
function genChanged(){shapeCache.clear();normCache.clear();pcache.clear();}
const PART_KEYS=Object.keys(PARTS);
const shapeCache=new Map(),normCache=new Map();
const shapesOf=(p,n)=>{const k=p+':'+n;if(!shapeCache.has(k))shapeCache.set(k,PARTS[p].build(n));return shapeCache.get(k);};
function norm(p){if(!normCache.has(p)){const sh=shapesOf(p,PARTS[p].counts.at(-1));let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const s of sh)for(const q of s.pts){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}normCache.set(p,{cx:(x0+x1)/2,cy:(y0+y1)/2,m:Math.max(x1-x0,y1-y0)/2||1});}return normCache.get(p);}

// ───────────── project model ─────────────
let lang=(()=>{try{return localStorage.getItem('nakis-lang')||'tr';}catch{return 'tr';}})();
const t2=(tr,en)=>lang==='tr'?tr:en;
let uid=1;
const newLayer=(part,o={})=>({id:uid++,part,n:PARTS[part].counts.at(-1),x:0,y:0,size:300,rot:0,flip:false,sym:'none',k:6,shift:0,visible:true,...o});
const defaultProject=()=>({v:1,title:'Untitled Composition',subtitle:'A study in woven geometry',note:'',mark:'Hüseyin Rahmi Göktaş · Global Science Advancement',palette:'turkeyred',custom:{ground:'#7a1230',ink:'#f6e8d2',accent:'#f2c25a',soft:'#eba3b6'},weave:'twill22',cycle:false,repeat:'single',cell:300,pace:2.6,showcase:[],tex:true,gen:{pts:[[.5,.5]],alt:false,arms:4},img:null,layers:[]});
let proj=defaultProject(),sel=0,tab='parts',mode='edit',now=0,playing=false,rec=null;

const polar=(r,deg)=>({x:Math.round(r*Math.sin(deg*Math.PI/180)),y:-Math.round(r*Math.cos(deg*Math.PI/180))});
const PRESETS={
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
function placed(l){
 const key=JSON.stringify([l.part,l.n,l.size,l.rot,l.flip,l.sym,l.k,l.shift,l.x,l.y]);
 if(pcache.has(key))return pcache.get(key);
 const base=shapesOf(l.part,l.n),N=norm(l.part),k=l.size/N.m,r=l.rot*Math.PI/180,cr=Math.cos(r),sr=Math.sin(r),sh=((l.shift%3)+3)%3,mp=t=>{const i=ROLES.indexOf(t);return i<0?t:ROLES[(i+sh)%3];};
 const out=[],syms=symList(l);
 for(const sy of syms)for(const s of base){
  const pts=s.pts.map(p=>{let sx=(p[0]-N.cx)*k,syy=-(p[1]-N.cy)*k;if(l.flip)sx=-sx;return sy([sx*cr-syy*sr+l.x,sx*sr+syy*cr+l.y]);});
  let y0=1e9,y1=-1e9;for(const q of pts){if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}
  out.push({...s,pts,tone:mp(s.tone),tone2:s.tone2&&mp(s.tone2),edge:s.edge&&mp(s.edge),lw:Math.max(1.1,l.size*.0075*(s.thin?.9:s.edge?.55:.95)),y0,y1});
 }
 let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const s of out)for(const q of s.pts){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
 const res={shapes:out,box:{x0,x1,y0,y1}};if(pcache.size>400)pcache.clear();pcache.set(key,res);return res;
}
const visLayers=()=>proj.layers.filter(l=>l.visible);

// ───────────── drawing ─────────────
function drawSh(sh,P,ox,oy,sc,alpha,prog){
 const col=P[sh.tone];if(!col||alpha<=0||prog<=0)return;
 ctx.save();ctx.translate(ox,oy);ctx.scale(sc,sc);ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=Math.max(1.1/sc,sh.lw);
 const pts=sh.pts,n=pts.length,upto=sh.fill?n-1:Math.max(1,Math.floor((n-1)*prog));
 ctx.beginPath();for(let i=0;i<=upto;i++){const p=pts[i];i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}
 if(sh.closed&&prog>=.999)ctx.closePath();
 if(sh.fill){let f=col;if(sh.tone2){const g=ctx.createLinearGradient(0,sh.y0,0,sh.y1);g.addColorStop(0,col);g.addColorStop(1,P[sh.tone2]||col);f=g;}ctx.fillStyle=f;ctx.globalAlpha=alpha*smooth(prog*1.4-.2);ctx.fill();ctx.globalAlpha=alpha;}
 ctx.strokeStyle=sh.tone2?(P[sh.tone2]||col):(P[sh.edge||sh.tone]||col);ctx.stroke();ctx.restore();
}
const drawAll=(P,ox,oy,sc,alpha)=>{for(const l of visLayers())for(const s of placed(l).shapes)drawSh(s,P,ox,oy,sc,alpha,1);};
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
   TL.vis.forEach((l,i)=>{const u=(t-(TL.a+i*pace))/(pace*.85);if(u<=0)return;const shs=placed(l).shapes;shs.forEach((sh,j)=>{const p=smooth((u-(j/shs.length)*.55)/.45);drawSh(sh,P,CX,CY,1,Math.min(1,p*2),p);});});
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
function redraw(){if(mode==='img'){drawImgPreview();return;}if(mode==='spi'){drawSpiral();return;}if(mode==='shp'){drawShape();return;}if(mode==='lat'){drawLat();return;}if(mode==='film'){frame(now);return;}drawEdit(false);clearTimeout(texTimer);needTex=true;texTimer=setTimeout(()=>{if(mode==='edit'){drawEdit(true);needTex=false;}},450);}
let raf=0;const redrawSoon=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;redraw();});};

// ───────────── persistence ─────────────
const KEY='nakis-studio-v1';let saveT=0;
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(proj));}catch{}},400);}
function loadProj(p){
 const d=defaultProject(),o={...d,...p,custom:{...d.custom,...(p.custom||{})}};
 o.layers=(p.layers||[]).filter(l=>PARTS[l.part]).map(l=>{const b=newLayer(l.part);const r={...b,...l,id:uid++};if(!PARTS[r.part].counts.includes(r.n))r.n=PARTS[r.part].counts.at(-1);return r;});
 if(!HISTORIC[o.palette]&&o.palette!=='custom')o.palette='turkeyred';if(!WEAVES[o.weave])o.weave='twill22';if(!['single','halfdrop','grid'].includes(o.repeat))o.repeat='single';
 o.gen=(p.gen&&Array.isArray(p.gen.pts)&&p.gen.pts.length<=12)?{pts:p.gen.pts.map(q=>[+q[0]||0,+q[1]||0]),alt:!!p.gen.alt,arms:clamp(+p.gen.arms||4,1,8)}:d.gen;
 o.img=(p.img&&p.img.data&&p.img.w&&p.img.h)?{data:p.img.data,w:+p.img.w,h:+p.img.h,levels:clamp(+p.img.levels||2,1,3),thr:(p.img.thr||[]).map(Number).slice(0,3),blur:clamp(+p.img.blur||0,0,8),minA:clamp(+p.img.minA||40,4,2000),eps:clamp(+p.img.eps||1.1,.3,4),invert:!!p.img.invert}:null;
 o.showcase=(o.showcase||[]).filter(k=>HISTORIC[k]);o.pace=clamp(+o.pace||2.6,1,8);o.cell=clamp(+o.cell||300,160,520);
 proj=o;sel=Math.min(sel,Math.max(0,o.layers.length-1));imgGray=null;if(o.img)restoreImg();
}
function changed(structure){mode='edit';playing=false;rebuild();updateDerived();if(structure)renderPanel();redrawSoon();save();}

// ───────────── panel ─────────────
const GRP={motif:['Motifs','Motifler'],fractal:['Fractal curves','Fraktal eğriler']};
const draftSVG=wk=>{const wv=WEAVES[wk],n=Math.min(wv.P,8),c=6;let s=`<svg width="${n*c}" height="${n*c}" viewBox="0 0 ${n*c} ${n*c}" style="float:right;margin-left:6px">`;for(let j=0;j<n;j++)for(let i=0;i<n;i++)s+=`<rect x="${i*c}" y="${j*c}" width="${c-1}" height="${c-1}" fill="${wv.top(i,j)?'currentColor':'none'}" stroke="currentColor" stroke-opacity=".35"/>`;return s+'</svg>';};
const rng=(lab,k,min,max,step,v)=>`<div class="ctl"><label>${lab}</label><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${v}</output></div>`;
const sw=c=>`<div class="sw"><i style="background:${c.ground}"></i><i style="background:${c.ink}"></i><i style="background:${c.accent}"></i><i style="background:${c.soft}"></i></div>`;
function tabParts(){
 const l=proj.layers[sel],opts=Object.keys(PRESETS).map(k=>`<option value="${k}">${PRESETS[k]().title}</option>`).join('');
 let h=`<h3>${t2('Hazır örnek','Examples')}</h3><select data-act="preset"><option value="">${t2('Örnek yükle…','Load an example…')}</option>${opts}</select>`;
 h+=`<h3>${t2('Katmanlar (çizim sırası)','Layers (build order)')}</h3><ul id="layers">${proj.layers.map((x,i)=>`<li class="${i===sel?'on':''}"><input type="checkbox" data-act="vis" data-i="${i}" ${x.visible?'checked':''}><span class="nm" data-act="sel" data-i="${i}">${i+1}. ${PARTS[x.part].title} · n=${x.n}${x.sym!=='none'?' · '+x.sym:''}</span><button data-act="up" data-i="${i}">↑</button><button data-act="dn" data-i="${i}">↓</button><button data-act="dup" data-i="${i}">⧉</button><button data-act="del" data-i="${i}">✕</button></li>`).join('')||`<li class="hint">${t2('Henüz parça yok.','No parts yet.')}</li>`}</ul>`;
 h+=`<h3>${t2('Parça ekle','Add a part')}</h3>`;
 for(const g of ['motif','fractal'])h+=`<div class="hint">${GRP[g][lang==='tr'?1:0]}</div><div class="grid">${PART_KEYS.filter(k=>PARTS[k].group===g).map(k=>`<button data-act="add" data-part="${k}">${PARTS[k].title}<small>${PARTS[k].tag}</small></button>`).join('')}</div>`;
 if(l){const p=PARTS[l.part];
  h+=`<h3>${t2('Seçili parça','Selected part')}: ${p.title}</h3><div class="hint">${p.blurb}</div>`;
  h+=`<div class="ctl2"><label>${t2('Sayı (n)','Count (n)')}</label><select data-k="n">${p.counts.map(c=>`<option ${c===l.n?'selected':''}>${c}</option>`).join('')}</select></div>`;
  h+=rng(t2('Boyut','Size'),'size',30,900,1,l.size)+rng('X','x',-540,540,1,l.x)+rng('Y','y',-600,600,1,l.y)+rng(t2('Dönüş °','Rotate °'),'rot',-180,180,.5,l.rot);
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
 <div class="btns"><button class="pri" data-act="play">${t2('Filmi oynat','Play film')}</button><button data-act="cloth">${t2('Bitmiş kumaşı göster','Show finished cloth')}</button><button data-act="rec">${t2('● WebM kaydet','● Record WebM')}</button><button data-act="png">PNG</button></div>
 <div class="hint">${t2('WebM kaydı gerçek zamanlıdır; bilgisayar yavaşsa kare atlayabilir. Sergi kalitesinde mp4 için proje dosyasını kaydedip bana gönderin.','WebM recording runs in real time and may drop frames on a slow computer. For exhibition-grade mp4, save the project file and send it to me.')}</div>
 <h3>${t2('Proje','Project')}</h3><div class="btns"><button data-act="savep">${t2('Projeyi kaydet (.json)','Save project (.json)')}</button><button data-act="loadp">${t2('Proje aç','Open project')}</button><button data-act="newp">${t2('Yeni','New')}</button></div><input type="file" id="file" accept=".json,application/json" hidden>`;
}

// ───────────── lattice tab (rotating hexagons) ─────────────
const lat={size:3,shape:'triangle',type:'asanoha',theta:0,anim:true,dots:true,t:0,cycle:['ring','spokes','star','asanoha','web','custom'],depth:1};
function drawLat(){
 ctx=TARGET||mctx;ctx.setTransform(SCL,0,0,SCL,0,0);ctx.globalAlpha=1;ctx.fillStyle='#f4f0e6';ctx.fillRect(0,0,W,H);
 let th=lat.theta*Math.PI/180,type=OV.type||lat.type;
 if(OV.theta!==undefined)th=OV.theta;else if(lat.anim&&!OV.type){const tl=LAT.timeline(lat.t,lat.cycle);th=tl.theta;type=tl.type;}
 const g=LAT.build({size:OV.size||lat.size,shape:lat.shape,type,theta:th,gen:proj.gen,depth:lat.depth}),sc=Math.min(900/((OV.size||lat.size)*3.4+2.4),120);
 ctx.save();ctx.translate(CX,CY+(lat.shape==='triangle'?0:0));ctx.scale(sc,-sc);
 ctx.strokeStyle='#141210';ctx.lineWidth=2.4/sc;ctx.lineCap='round';ctx.beginPath();for(const e of g.edges){ctx.moveTo(e[0],e[1]);ctx.lineTo(e[2],e[3]);}ctx.stroke();
 if(lat.dots){ctx.fillStyle='#141210';for(const d of g.dots){ctx.beginPath();ctx.arc(d[0],d[1],7/sc,0,7);ctx.fill();}}
 ctx.restore();
 const st=LAT.stats(g);ctx.fillStyle='#6d644f';ctx.font='26px Poppins,system-ui,sans-serif';ctx.textAlign='left';
 ctx.fillText(`${LAT.TYPES[type].en} · θ = ${(th/Math.PI*180%360).toFixed(1)}°`,70,100);ctx.fillText(`${st.dots} dots · ${st.edges} edges`,70,140);
 const o=$('latinfo');if(o)o.textContent=`${st.dots} ${t2('nokta','dots')} · ${st.edges} ${t2('çizgi','lines')} · ${t2('uzunluklar (L)','lengths (L)')}: ${st.lens.map(l=>l[0]).join(', ')}`;
}
function tabLat(){
 const o=(obj,cur)=>Object.entries(obj).map(([k,v])=>`<option value="${k}" ${k===cur?'selected':''}>${lang==='tr'?v.tr:v.en}</option>`).join('');
 return `<h3>${t2('Dönen altıgen kafes','Rotating hexagon lattice')}</h3><div class="hint">${t2('Fazlıoğlu animasyonundan: üçgen kafes üzerinde noktalar ve çizgiler. Altıgenler kendi merkezleri etrafında döner; her 30° dönüşte desen kafesle yeniden hizalanır.','From the Fazlıoğlu animation: dots and lines on a triangular lattice. Hexagons turn about their own centres; every 30° the pattern realigns with the lattice.')}</div>
 <div class="ctl2"><label>${t2('Kalıp','Tile')}</label><select data-l="type">${o(LAT.TYPES,lat.type)}</select></div>
 <div class="ctl2"><label>${t2('Biçim','Shape')}</label><select data-l="shape">${o(LAT.SHAPES,lat.shape)}</select></div>
 <div class="ctl"><label>${t2('Boyut','Size')}</label><input type="range" data-l="size" min="1" max="6" step="1" value="${lat.size}"><output>${lat.size}</output></div>
 <div class="ctl"><label>${t2('Derinlik','Depth')}</label><input type="range" data-l="depth" min="1" max="3" step="1" value="${lat.depth}"><output>${lat.depth}</output></div>
 <div class="ctl"><label>θ (°)</label><input type="range" data-l="theta" min="0" max="60" step=".5" value="${lat.theta}"><output>${lat.theta}</output></div>
 <div class="hint"><label><input type="checkbox" data-l="anim" ${lat.anim?'checked':''}> ${t2('Canlandır (tüm kalıplar sırayla, 1 sn duruş)','Animate (all tiles in turn, 1 s holds)')}</label> &nbsp; <label><input type="checkbox" data-l="dots" ${lat.dots?'checked':''}> ${t2('Noktalar','Dots')}</label></div>
 <div class="hint" id="latinfo"></div>
 <h3>${t2('Matematik','Mathematics')}</h3><div class="desc">${t2(
`Birim L = kafesteki en yakın iki nokta arası (videoda 92,9 px, hep sabit).
Merkezler: c(i,j) = √3·(i·e30° + j·e90°)
Köşeler: vₘ = c + R(θ)·(cos 60°m, sin 60°m), m = 0…5
Çizgi uzunlukları: kenar/ışın = 1, kısa köşegen = √3, çap = 2.
θ = 0° ve 30°'de köşeler 0°/60° ya da 30° döndürülmüş kafese oturur.
θ(t): 1 sn duruş, 1,4 sn yumuşak dönüş (3x²−2x³), her duruşta kalıp değişir.
Kesin: duruş desenlerinin kafes yapısı. Yaklaşık: geçişler (orijinalde noktalar ikiye bölünüp birleşiyor).`,
`Unit L = nearest-neighbour distance of the lattice (92.9 px in the video, constant).
Centres: c(i,j) = √3·(i·e30° + j·e90°)
Vertices: vₘ = c + R(θ)·(cos 60°m, sin 60°m), m = 0…5
Line lengths: side/spoke = 1, short diagonal = √3, diameter = 2.
At θ = 0° and 30° the vertices sit on the 0°/60° lattice or the lattice turned 30°.
θ(t): 1 s hold, 1.4 s smooth turn (3x²−2x³), tile changes at each hold.
Exact: the lattice structure of the hold patterns. Approximate: the transitions (in the original, dots split and merge).`)}</div>
 ${actBtns()}`;
}

// ───────────── shape tab (your shape as the generator) ─────────────
const shp={n:4,preset:''};
const GPRE={levy:{tr:'Lévy C',pts:[[.5,.5]],alt:false,arms:4},dragon:{tr:'Ejderha',pts:[[.5,.5]],alt:true,arms:4},terdragon:{tr:'Terdragon',pts:[[.5,-Math.sqrt(3)/6],[.5,Math.sqrt(3)/6]],alt:false,arms:4},
 koch:{tr:'Koch',pts:[[1/3,0],[.5,-Math.sqrt(3)/6],[2/3,0]],alt:false,arms:3},square:{tr:'Kare tepe',pts:[[1/3,0],[1/3,-1/3],[2/3,-1/3],[2/3,0]],alt:false,arms:4},zig:{tr:'Zikzak',pts:[[.25,.25],[.5,-.25],[.75,.25]],alt:false,arms:4}};
const PADW=380,PADH=260,pu=u=>(u+.25)/1.5*PADW,pv=v=>PADH/2+v*PADW/1.5,iu=x=>x/PADW*1.5-.25,iv=y=>(y-PADH/2)*1.5/PADW;
function drawPad(){const c=$('pad');if(!c)return;const x=c.getContext('2d');x.clearRect(0,0,PADW,PADH);x.fillStyle='#f4f0e6';x.fillRect(0,0,PADW,PADH);
 const P=[[0,0],...proj.gen.pts,[1,0]];x.strokeStyle='#c9bfa8';x.lineWidth=1;x.setLineDash([4,4]);x.beginPath();x.moveTo(pu(0),pv(0));x.lineTo(pu(1),pv(0));x.stroke();x.setLineDash([]);
 x.strokeStyle='#141210';x.lineWidth=2.5;x.beginPath();P.forEach((q,i)=>i?x.lineTo(pu(q[0]),pv(q[1])):x.moveTo(pu(q[0]),pv(q[1])));x.stroke();
 P.forEach((q,i)=>{x.fillStyle=(i===0||i===P.length-1)?'#8a5a1f':'#141210';x.beginPath();x.arc(pu(q[0]),pv(q[1]),(i===0||i===P.length-1)?6:7,0,7);x.fill();});}
function drawShape(){
 ctx=TARGET||mctx;ctx.setTransform(SCL,0,0,SCL,0,0);ctx.globalAlpha=1;ctx.fillStyle='#f4f0e6';ctx.fillRect(0,0,W,H);
 const n=OV.n!==undefined?OV.n:Math.min(shp.n,genMax()),cur=PARTS.c_custom.build(n);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
 for(const c of cur)for(const q of c.pts){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
 const sc=Math.min(900/(x1-x0||1),900/(y1-y0||1)),mx=(x0+x1)/2,my=(y0+y1)/2;
 ctx.save();ctx.translate(CX,CY);ctx.scale(sc,sc);ctx.translate(-mx,-my);ctx.lineWidth=Math.max(.6,Math.min(2.6,1.2*n/3))/sc;ctx.lineJoin='round';ctx.strokeStyle='#141210';
 for(const c of cur){ctx.beginPath();c.pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();}ctx.restore();
 const D=genDim();ctx.fillStyle='#6d644f';ctx.font='26px Poppins,system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(`n = ${n} · ${proj.gen.arms*Math.pow(genM(),n)} segments`,70,100);ctx.fillText(D?`similarity dimension ≈ ${D.toFixed(4)}`:'no similarity dimension (a piece is not shorter)',70,140);
}
function tabShape(){
 const pre=Object.entries(GPRE).map(([k,v])=>`<option value="${k}">${v.tr}</option>`).join('');
 return `<h3>${t2('Şekil üreteci','Shape generator')}</h3><div class="hint">${t2('Sol uç (0,0) ile sağ uç (1,0) sabit. Aralarına tıklayarak nokta ekleyin, sürükleyerek taşıyın, Alt+tık ile silin. Bu şekil her parçanın yerine konur; a–d filmlerindeki Lévy, Ejderha, Terdragon aynı kuraldır.','Left end (0,0) and right end (1,0) are fixed. Click to add points, drag to move, Alt+click to delete. This shape replaces every segment; the Lévy, Dragon and Terdragon films use the same rule.')}</div>
 <canvas id="pad" width="${PADW}" height="${PADH}" style="width:100%;max-width:${PADW}px;border:1px solid var(--line);border-radius:8px;touch-action:none;cursor:crosshair"></canvas>
 <div class="ctl2"><label>${t2('Hazır','Preset')}</label><select data-g="preset"><option value="">${t2('Yükle…','Load…')}</option>${pre}</select></div>
 <div class="hint"><label><input type="checkbox" data-g="alt" ${proj.gen.alt?'checked':''}> ${t2('Her ikinci parçada aynala (Ejderha gibi)','Mirror every second piece (as in the Dragon)')}</label></div>
 <div class="ctl"><label>${t2('Kol sayısı','Arms')}</label><input type="range" data-g="arms" min="1" max="8" step="1" value="${proj.gen.arms}"><output>${proj.gen.arms}</output></div>
 <div class="ctl"><label>${t2('Adım (n)','Step (n)')}</label><input type="range" data-g="n" min="1" max="${genMax()}" step="1" value="${Math.min(shp.n,genMax())}"><output>${Math.min(shp.n,genMax())}</output></div>
 <div class="btns"><button data-act="gundo">${t2('Son noktayı sil','Remove last point')}</button><button data-act="gclear">${t2('Temizle','Clear')}</button><button class="pri" data-act="gadd">${t2('Kompozisyona parça olarak ekle','Add to composition as a part')}</button></div>
 ${actBtns()}
 <h3>${t2('Matematik','Mathematics')}</h3><div class="desc">${t2(
`Üreteç: P₀=(0,0), P₁…Pₖ (çizdikleriniz), Pₖ₊₁=(1,0).
Her parça AB için Pᵢ' = A + (B−A)·xᵢ + ⟂(B−A)·yᵢ  (⟂ = 90° döndürme).
Ejderha seçeneğinde her ikinci parçada y işareti ters.
Benzerlik boyutu D: Σ rᵢ^D = 1, rᵢ = üreteç parçalarının uzunluğu.
Lévy: rᵢ=1/√2 (2 parça) → D=2. Terdragon: 3 parça, 1/√3 → D=2. Koch: 4 parça, 1/3 → D≈1,2619.
Kol sayısı: tohum parçası 360°/kol ile döndürülmüş kopyalar.
Şu an: ${genM()} parça, D = ${genDim()?genDim().toFixed(4):'—'}`,
`Generator: P₀=(0,0), P₁…Pₖ (your points), Pₖ₊₁=(1,0).
For each piece AB: Pᵢ' = A + (B−A)·xᵢ + ⟂(B−A)·yᵢ  (⟂ = 90° turn).
With the Dragon option the sign of y flips on every second piece.
Similarity dimension D: Σ rᵢ^D = 1, rᵢ = lengths of the generator pieces.
Lévy: rᵢ=1/√2 (2 pieces) → D=2. Terdragon: 3 pieces, 1/√3 → D=2. Koch: 4 pieces, 1/3 → D≈1.2619.
Arms: copies of the seed segment turned by 360°/arms.
Now: ${genM()} pieces, D = ${genDim()?genDim().toFixed(4):'—'}`)}</div>`;
}
function bindPad(){
 const c=$('pad');if(!c)return;drawPad();let dr=-1;
 const xy=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)/r.width*PADW,(e.clientY-r.top)/r.height*PADH];};
 const hit=([x,y])=>proj.gen.pts.findIndex(q=>Math.hypot(pu(q[0])-x,pv(q[1])-y)<12);
 const upd=()=>{genChanged();drawPad();if(mode==='shp')drawShape();save();};
 c.onpointerdown=e=>{const p=xy(e),h=hit(p);if(h>=0){if(e.altKey){proj.gen.pts.splice(h,1);renderPanel();upd();return;}dr=h;c.setPointerCapture(e.pointerId);return;}
  if(proj.gen.pts.length>=10)return;const u=iu(p[0]),v=iv(p[1]);const P=[[0,0],...proj.gen.pts,[1,0]];let bi=0,bd=1e9;
  for(let i=0;i<P.length-1;i++){const ax=P[i][0],ay=P[i][1],bx=P[i+1][0],by=P[i+1][1],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((u-ax)*dx+(v-ay)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(u-(ax+dx*t),v-(ay+dy*t));if(d<bd){bd=d;bi=i;}}
  proj.gen.pts.splice(bi,0,[u,v]);dr=bi;c.setPointerCapture(e.pointerId);renderPanel();upd();};
 c.onpointermove=e=>{if(dr<0)return;const p=xy(e);proj.gen.pts[dr]=[Math.round(iu(p[0])*100)/100,Math.round(iv(p[1])*100)/100];upd();};
 c.onpointerup=()=>{if(dr>=0){dr=-1;renderPanel();upd();}};
}

// ───────────── spiral tab ─────────────
const spi={k:.38,phi:60,K:30,fill:.74,speed:.35,dashes:1,sides:6,custom:false,play:true,t:0,zoom:.12};
function tilePoly(){const n=spi.sides;let pts=Array.from({length:n},(_,m)=>[Math.cos(m*2*Math.PI/n),Math.sin(m*2*Math.PI/n)]);
 if(!spi.custom||!proj.gen.pts.length)return pts;const out=[];for(let m=0;m<n;m++){const seg=genExpand([pts[m],pts[(m+1)%n]],genRule()).full;seg.pop();out.push(...seg);}return out;}
function drawSpiral(){
 ctx=TARGET||mctx;ctx.setTransform(SCL,0,0,SCL,0,0);ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
 const t=OV.st!==undefined?OV.st:spi.t,sc=SPI.scene({k:spi.k,phi:spi.phi,K:spi.K,fill:spi.fill,speed:spi.speed,dashes:spi.dashes},(t*spi.zoom)%1);
 const poly=tilePoly(),cnt=OV.count!==undefined?OV.count:1e9;ctx.save();ctx.translate(CX,CY-30);
 if(spi.dashes&&cnt>=1e9)for(const d of sc.dashes){if(Math.abs(d.x)>800||Math.abs(d.y)>900)continue;ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.ang);ctx.fillStyle=sc.dashHue(d,t);ctx.beginPath();ctx.ellipse(0,0,Math.max(.4,d.l),Math.max(.3,d.w),0,0,7);ctx.fill();ctx.restore();}
 let k=0;for(const T of sc.tiles){if(k++>=cnt)break;if(Math.abs(T.x)>900||Math.abs(T.y)>1000)continue;ctx.save();ctx.translate(T.x,T.y);ctx.rotate(T.rot);ctx.scale(T.r,T.r);ctx.fillStyle=sc.hue(T.i,T.j,t);ctx.beginPath();poly.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill();ctx.restore();}
 ctx.restore();
 const o=$('spinfo');if(o)o.textContent=`${sc.tiles.length} ${t2('kalıp','tiles')} · ${sc.dashes.length} ${t2('çizgi','dashes')}`;
 spi._n=sc.tiles.filter(T=>Math.abs(T.x)<=900&&Math.abs(T.y)<=1000).length;
}
function tabSpiral(){
 const r=(k,a,b,st,tr,en)=>`<div class="ctl"><label>${t2(tr,en)}</label><input type="range" data-s="${k}" min="${a}" max="${b}" step="${st}" value="${spi[k]}"><output>${spi[k]}</output></div>`;
 return `<h3>${t2('Spiral kaplama','Spiral tiling')}</h3><div class="hint">${t2('Fazlıoğlu altıgen spiral animasyonundan: kalıplar bir kafes üzerinde durur, karmaşık üstel dönüşümle logaritmik spirale sarılır.','From the Fazlıoğlu hexagon-spiral animation: tiles sit on a lattice and are wound into a logarithmic spiral by the complex exponential.')}</div>
 ${r('k',.15,.7,.01,'Sıkılık |c|','Tightness |c|')}${r('phi',20,85,1,'Eğim φ (°)','Pitch φ (°)')}${r('K',12,60,1,'Ölçek','Scale')}${r('fill',.4,1,.01,'Doluluk','Fill')}${r('sides',3,8,1,'Kenar sayısı','Sides')}${r('speed',0,1,.01,'Renk hızı','Colour speed')}${r('zoom',0,.4,.01,'Yakınlaşma','Zoom rate')}
 <div class="hint"><label><input type="checkbox" data-s="custom" ${spi.custom?'checked':''}> ${t2('Kalıp kenarları benim şeklim','Tile edges use my shape')}</label> &nbsp; <label><input type="checkbox" data-s="dashes" ${spi.dashes?'checked':''}> ${t2('Çizgi tozu','Dash dust')}</label> &nbsp; <label><input type="checkbox" data-s="play" ${spi.play?'checked':''}> ${t2('Canlandır','Animate')}</label></div>
 <div class="hint" id="spinfo"></div>
 ${actBtns()}
 <h3>${t2('Renkler (videodan ölçüldü)','Colours (measured from the video)')}</h3><div class="sw" style="height:34px">${SPI.PAL_FZ.map(c=>`<i style="background:${c}"></i>`).join('')}</div><div class="hint">${SPI.PAL_FZ.join(' · ')}<br>${t2('Zemin siyah. Doygunluk ≈ 0,82, parlaklık ≈ 0,85. Renk her kalıpta bir sonraki tona kayar ve zamanla döner.','Ground black. Saturation ≈ 0.82, brightness ≈ 0.85. Colour steps to the next tone from tile to tile and cycles with time.')}</div>
 <h3>${t2('Matematik','Mathematics')}</h3><div class="desc">${t2(
`Merkezler: z = i + j·ω, ω = e^{iπ/3} (altıgen kafes).
Dönüşüm: w = exp(c·z), c = k·e^{iφ}.
Kalıp: w'ya konur, |c·w|/√3 ile ölçeklenir, arg(c·w) kadar döner; komşular birbirine değer.
Halka adımı (i+1): ölçek ×e^{k cos φ}, açı +k sin φ. Kol adımı (j+1): ×e^{k cos(φ+60°)}.
Yakınlaşma: tüm w'lar exp(−c·s) ile çarpılır; s=1'de kafes bir adım kaymış olur, desen kendini tekrarlar (kusursuz döngü).
Renk: kalıp rengi paletten (⌊0,6i + 1,7j + 8·hız·t⌋ mod 8).
Kesin: spiral yapı ve palet. Yaklaşık: k, φ değerleri videoya göz kararı uyduruldu.`,
`Centres: z = i + j·ω, ω = e^{iπ/3} (hexagonal lattice).
Map: w = exp(c·z), c = k·e^{iφ}.
Tile: placed at w, scaled by |c·w|/√3, turned by arg(c·w); neighbours touch.
Ring step (i+1): scale ×e^{k cos φ}, angle +k sin φ. Arm step (j+1): ×e^{k cos(φ+60°)}.
Zoom: every w is multiplied by exp(−c·s); at s=1 the lattice has moved one step and the picture repeats (seamless loop).
Colour: tile colour from the palette (⌊0.6i + 1.7j + 8·speed·t⌋ mod 8).
Exact: the spiral structure and palette. Approximate: k, φ were fitted to the video by eye.`)}</div>`;
}
// ───────────── steps film + snapshots ─────────────
const STEP_DUR=1.6;
const actBtns=()=>`<div class="btns"><button class="pri" data-act="steps">${t2('Adımları oynat','Play the steps')}</button><button data-act="recsteps">${t2('● Adımları WebM kaydet','● Record steps (WebM)')}</button><button data-act="snap">${t2('Enstantane (3K PNG, etiketli)','Snapshot (3K PNG, labelled)')}</button></div>`;
function stepList(){
 if(tab==='shape'){const m=Math.min(shp.n,genMax()),a=[];for(let n=0;n<=m;n++)a.push({ov:{n},cap:`n = ${n}`,sub:`${proj.gen.arms*Math.pow(genM(),n)} segments`,k:'shp'});return a;}
 if(tab==='lat'){const a=[];for(let z=1;z<=lat.size;z++)a.push({ov:{size:z,type:lat.type,theta:lat.theta*Math.PI/180},cap:`rings ${z} / ${lat.size}`,sub:LAT.TYPES[lat.type].en,k:'lat'});
  for(const ty of lat.cycle)if(ty!==lat.type)a.push({ov:{size:lat.size,type:ty,theta:lat.theta*Math.PI/180},cap:LAT.TYPES[ty].en,sub:'same lattice, new tile',k:'lat'});
  for(let q=1;q<=4;q++)a.push({ov:{size:lat.size,type:lat.type,theta:q*Math.PI/12},cap:`turn ${q*15}°`,sub:'hexagons rotate about their centres',k:'lat'});return a;}
 const N=8,tot=spi._n||200,a=[];for(let q=1;q<=N;q++)a.push({ov:{count:Math.round(tot*q/N),st:0},cap:`ring ${q} / ${N}`,sub:'tiles wound onto the spiral, centre outward',k:'spi'});
 a.push({ov:{st:0},cap:'dust added',sub:'',k:'spi'});return a;
}
let stepsArr=[],stepsPlayT=0;
const stepsTotal=()=>stepsArr.length*STEP_DUR+1.2;
function capBar(c,sub,dark){ctx.save();ctx.setTransform(SCL,0,0,SCL,0,0);ctx.fillStyle=dark?'rgba(0,0,0,.55)':'rgba(244,240,230,.8)';ctx.fillRect(0,1190,W,160);ctx.fillStyle=dark?'#f2c14e':'#8a5a1f';ctx.font='500 40px Poppins,system-ui,sans-serif';ctx.textAlign='left';ctx.fillText('STEP '+c,70,1250);ctx.fillStyle=dark?'#efe6d2':'#241f17';ctx.font='28px Poppins,system-ui,sans-serif';ctx.fillText(sub,70,1298);ctx.restore();}
function showSteps(t){mode='steps';now=t;const k=Math.min(stepsArr.length-1,Math.floor(t/STEP_DUR)),e=stepsArr[k];OV={...e.ov};
 if(e.k==='shp')drawShape();else if(e.k==='lat')drawLat();else{if(OV.st===undefined)OV.st=0;if(k===stepsArr.length-1)OV={st:t*.5};drawSpiral();}
 OV={};capBar(`${k+1} / ${stepsArr.length} · ${e.cap}`,e.sub,e.k==='spi');const q=Math.min(1,t/stepsTotal());$('seek').value=Math.round(q*1000);$('tm').textContent=`0:${String(Math.floor(t)).padStart(2,'0')}`;}
function playSteps(withRec){stepsArr=stepList();now=0;mode='steps';playing=true;$('pp').textContent='⏸';
 if(withRec){if(!window.MediaRecorder){toast(t2('Bu tarayıcı kayıt desteklemiyor','Recording is not supported in this browser'));return;}
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m)),ch=[];const r=new MediaRecorder(cv.captureStream(30),{mimeType:mime,videoBitsPerSecond:10e6});r.ondataavailable=e=>e.data.size&&ch.push(e.data);r.onstop=()=>download(new Blob(ch,{type:'video/webm'}),`nakis-steps-${tab}.webm`);rec=r;r.start(250);toast(t2('Kayıt başladı — sekmeyi açık tutun','Recording — keep this tab open'));}
 showSteps(0);}
function snapshot(){
 const kind={shape:'shp',lat:'lat',spiral:'spi'}[tab];if(!kind){cv.toBlob(b=>b&&download(b,`nakis-snapshot-${slug()}.png`));return;}
 const c=document.createElement('canvas');SCL=3;c.width=W*3;c.height=H*3;TARGET=c.getContext('2d');
 try{if(kind==='shp')drawShape();else if(kind==='lat')drawLat();else drawSpiral();
  const x=TARGET,dark=kind==='spi',title={shp:'Your Shape · iterated',lat:'Rotating Hexagon Lattice',spi:'Conformal Spiral Tiling'}[kind];
  const form={shp:`generator: ${proj.gen.pts.length+1} pieces · arms ${proj.gen.arms} · D ≈ ${genDim()?genDim().toFixed(4):'—'}`,lat:`c = √3(i·e30° + j·e90°) · vₘ = c + R(θ)(cos 60°m, sin 60°m)`,spi:`w = exp(c·z), c = ${spi.k}·e^{i${spi.phi}°}`}[kind];
  x.setTransform(3,0,0,3,0,0);x.fillStyle=dark?'rgba(0,0,0,.7)':'rgba(244,240,230,.9)';x.fillRect(0,1130,W,220);x.fillStyle=dark?'#f2c14e':'#8a5a1f';x.font='500 44px Poppins,system-ui,sans-serif';x.textAlign='left';x.fillText('NAKIŞ — '+title,70,1195);
  x.fillStyle=dark?'#efe6d2':'#241f17';x.font='26px Poppins,system-ui,sans-serif';x.fillText(form,70,1245);x.globalAlpha=.6;x.font='22px Poppins,system-ui,sans-serif';x.fillText(proj.mark,70,1310);x.globalAlpha=1;}
 finally{TARGET=null;SCL=1;}
 c.toBlob(b=>b&&download(b,`nakis-snapshot-${kind}-${Date.now()%1e6}.png`));
}

// ───────────── image tab: your picture / last video frame as a part ─────────────
let imgGray=null,imgRGBA=null,vidEl=null;
const IMGMAX=320;
function imgShapes(){const m=proj.img;if(!m||!imgGray)return [];const ls=m.thr.slice(0,m.levels).sort((a,b)=>a-b);
 return IMG.shapesFrom(imgGray,m.w,m.h,{levels:ls,blur:m.blur,minArea:m.minA,eps:m.eps,invert:m.invert,smooth:1});}
const IMG_TONES=n=>n===1?['ink']:n===2?['soft','ink']:['soft','accent','ink'];
PARTS.c_image={title:'Your Image',tag:'IMAGE',group:'fractal',counts:[1],blurb:'Shapes lifted from your picture by luminance levels',
 build:()=>{const m=proj.img;if(!m||!imgGray)return [S('i0',[[-1,-1],[1,-1],[1,1],[-1,1]],'ink')];const tn=IMG_TONES(m.levels);
  const sh=imgShapes();if(!sh.length)return [S('i0',[[-1,-1],[1,-1],[1,1],[-1,1]],'ink')];
  return sh.map((q,i)=>S('i'+i,q.pts,q.hole?(q.level>0?tn[q.level-1]:'soft'):tn[q.level]));},
 f:()=>['luminance levels → contours',`levels: ${proj.img?proj.img.levels:0}`,`shapes: ${imgShapes().length}`]};
function imgChanged(){shapeCache.clear();normCache.clear();pcache.clear();}
function loadImgSource(url,isVideo){
 const done=(el,keep)=>{const sw=el.videoWidth||el.naturalWidth,sh=el.videoHeight||el.naturalHeight,k=Math.min(1,IMGMAX/Math.max(sw,sh)),w=Math.max(8,Math.round(sw*k)),h=Math.max(8,Math.round(sh*k)),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(el,0,0,w,h);
  imgRGBA=x.getImageData(0,0,w,h).data;imgGray=IMG.grayOf(imgRGBA,w,h);const th=IMG.autoLevels(IMG.blur(imgGray,w,h,2),3);
  if(keep&&proj.img)Object.assign(proj.img,{data:c.toDataURL('image/jpeg',.85),w,h,thr:th});else proj.img={data:c.toDataURL('image/jpeg',.85),w,h,levels:2,thr:th,blur:2,minA:40,eps:1.1,invert:false};imgChanged();mode='img';if(!keep)renderPanel();else{const im=document.querySelector('#panel img');if(im)im.src=proj.img.data;}redrawSoon();save();if(!isVideo)URL.revokeObjectURL(url);if(!keep)toast(t2(isVideo?'Son kare alındı':'Görsel yüklendi','Image loaded'));};
 if(isVideo){const v=document.createElement('video');v.muted=true;v.preload='auto';v.src=url;v.onloadedmetadata=()=>{v.currentTime=Math.max(0,v.duration-.08);};vidEl=v;let first=true;v.onseeked=()=>{done(v,!first);first=false;};v.onerror=()=>toast(t2('Video açılamadı','Could not open the video'));}
 else{vidEl=null;const i=new Image();i.onload=()=>done(i);i.onerror=()=>toast(t2('Görsel açılamadı','Could not open the image'));i.src=url;}
}
function restoreImg(){if(!proj.img)return;const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=proj.img.w;c.height=proj.img.h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);imgRGBA=x.getImageData(0,0,c.width,c.height).data;imgGray=IMG.grayOf(imgRGBA,c.width,c.height);imgChanged();rebuild();redrawSoon();};i.src=proj.img.data;}
function drawImgPreview(){
 ctx=mctx;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;const P=ST[1];ctx.fillStyle=P.ground;ctx.fillRect(0,0,W,H);
 const m=proj.img;if(!m||!imgGray){ctx.fillStyle='#a79d88';ctx.font='32px Poppins,system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(t2('Bir görsel ya da video yükleyin','Upload an image or a video'),CX,CY);return;}
 const sc=Math.min(940/m.w,1000/m.h),tn=IMG_TONES(m.levels);ctx.save();ctx.translate(CX,CY);ctx.scale(sc,-sc);
 for(const q of imgShapes()){ctx.fillStyle=P[q.hole?(q.level>0?tn[q.level-1]:'soft'):tn[q.level]]||P.ink;ctx.beginPath();q.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();}ctx.restore();
 ctx.fillStyle=P.ink;ctx.globalAlpha=.6;ctx.font='24px Poppins,system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(`${imgShapes().length} shapes · ${m.levels} level${m.levels>1?'s':''}`,70,100);ctx.globalAlpha=1;
}
function tabImg(){
 const m=proj.img,r=(k,a,b,st,tr,en)=>m?`<div class="ctl"><label>${t2(tr,en)}</label><input type="range" data-im="${k}" min="${a}" max="${b}" step="${st}" value="${m[k]}"><output>${m[k]}</output></div>`:'';
 const th=m?[0,1,2].slice(0,m.levels).map(i=>`<div class="ctl"><label>${t2('Eşik','Level')} ${i+1}</label><input type="range" data-im="thr${i}" min="5" max="250" step="1" value="${m.thr[i]??128}"><output>${m.thr[i]??128}</output></div>`).join(''):'';
 return `<h3>${t2('Görselden parça','Part from an image')}</h3><div class="hint">${t2('Resim ya da video yükleyin; videoda son kare alınır. Parlaklık eşikleriyle şekiller çıkarılır ve Stüdyo parçası olur: simetri, tekrar, renk, dokuma ve film bunlara uygulanır.','Upload a picture or a video (the last frame is taken). Brightness levels lift shapes that become a Studio part: symmetry, repeat, colour, weave and film all apply.')}</div>
 <div class="btns"><button class="pri" data-act="imgpick">${t2('Görsel / video seç','Choose image / video')}</button></div><input type="file" id="imgfile" accept="image/*,video/*" hidden>
 ${vidEl?`<div class="ctl"><label>${t2('Video karesi','Video frame')}</label><input type="range" data-vid="1" min="0" max="1000" step="1" value="${vidEl.duration?Math.round(vidEl.currentTime/vidEl.duration*1000):1000}"><output></output></div><div class="hint">${t2('Son kare boş ya da beyazsa kaydırıcıyla başka bir kare seçin.','If the last frame is blank or white, pick another frame with the slider.')}</div>`:''}
 ${m?`<img src="${m.data}" style="width:96px;border-radius:6px;float:right;margin-left:8px" alt="">
 <div class="ctl"><label>${t2('Seviye sayısı','Levels')}</label><select data-im="levels"><option ${m.levels===1?'selected':''}>1</option><option ${m.levels===2?'selected':''}>2</option><option ${m.levels===3?'selected':''}>3</option></select></div>${th}
 ${r('blur',0,8,1,'Yumuşatma','Blur')}${r('minA',4,1200,2,'Küçük lekeleri at','Drop small specks')}${r('eps',.3,4,.1,'Sadeleştirme','Simplify')}
 <div class="hint"><label><input type="checkbox" data-im="invert" ${m.invert?'checked':''}> ${t2('Açık ve koyu yer değiştirsin','Swap light and dark')}</label></div>
 <div class="btns"><button data-act="imgauto">${t2('Eşikleri otomatik bul','Find levels automatically')}</button><button class="pri" data-act="imgadd">${t2('Kompozisyona parça olarak ekle','Add to composition as a part')}</button></div>`:''}
 <h3>${t2('Nasıl çalışır','How it works')}</h3><div class="desc">${t2('1) Görsel en çok 320 px\'e küçültülür, parlaklık Y = 0,2126R + 0,7152G + 0,0722B.\n2) Kutu bulanıklaştırma.\n3) Eşikler Otsu yöntemiyle: sınıflar arası varyansı en büyük yapan t.\n4) Marching squares ile her eşikte kapalı konturlar; Douglas–Peucker ile sadeleştirme, Chaikin ile yumuşatma.\n5) İçteki konturlar delik sayılır. Düşük eşik altta, yüksek eşik üstte boyanır (ruh, vurgu, yumuşak rolleriyle).','1) The picture is shrunk to at most 320 px; brightness Y = 0.2126R + 0.7152G + 0.0722B.\n2) Box blur.\n3) Levels by Otsu: the t that maximises between-class variance.\n4) Marching squares gives closed contours at each level; Douglas–Peucker simplifies, Chaikin smooths.\n5) Inner contours are holes. Low levels paint underneath, high levels on top (in the ink, accent and soft roles).')}</div>`;
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const TABS=[['parts','Parçalar','Parts'],['colour','Renk','Colour'],['weave','Dokuma','Weave'],['text','Metin','Text'],['shape','Şekil','Shape'],['lat','Kafes','Lattice'],['spiral','Spiral','Spiral'],['img','Görsel','Image'],['out','Çıktı','Output']];
function renderPanel(){
 $('tabs').innerHTML=TABS.map(([k,a,b])=>`<button data-act="tab" data-key="${k}" class="${tab===k?'on':''}">${t2(a,b)}</button>`).join('');
 $('panel').innerHTML={parts:tabParts,colour:tabColour,weave:tabWeave,text:tabText,shape:tabShape,spiral:tabSpiral,img:tabImg,lat:tabLat,out:tabOut}[tab]();
 bindPad();
 $('pp').textContent=playing?'⏸':t2('▶ Film','▶ Film');$('sub').textContent=t2('— parçalardan motif, motiften kumaş','— parts into motif, motif into cloth');
 updateDerived();
}
function updateDerived(){const d=$('dur');if(d)d.textContent=`${Math.floor(TL.total/60)}:${String(Math.round(TL.total%60)).padStart(2,'0')}`;const e=$('desc');if(e)e.textContent=describe();}
function toast(s){const e=$('toast');e.textContent=s;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2200);}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
const slug=()=>proj.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'composition';

// ───────────── transport ─────────────
function showFilm(t){mode='film';now=clamp(t,0,TL.total);frame(now);$('seek').value=Math.round(now/TL.total*1000);const s=Math.floor(now);$('tm').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
let last=performance.now();
function loop(ts){const dt=Math.min(.1,(ts-last)/1000);last=ts;if(mode==='lat'&&lat.anim){lat.t+=dt;drawLat();}if(mode==='spi'&&spi.play){spi.t+=dt;drawSpiral();}if(mode==='steps'&&playing){if(now>=stepsTotal()){playing=false;$('pp').textContent=t2('▶ Film','▶ Film');if(rec){rec.stop();rec=null;}}else showSteps(now+dt);}if(playing&&mode==='film'){if(now>=TL.total){playing=false;$('pp').textContent=t2('▶ Film','▶ Film');if(rec){rec.stop();rec=null;}}else showFilm(now+dt);}requestAnimationFrame(loop);}
function play(){if(!proj.layers.length){toast(t2('Önce parça ekleyin','Add a part first'));return;}if(mode!=='film'||now>=TL.total)now=0;mode='film';playing=!playing;$('pp').textContent=playing?'⏸':t2('▶ Film','▶ Film');if(!playing)showFilm(now);}
function record(){
 if(!window.MediaRecorder){toast(t2('Bu tarayıcı kayıt desteklemiyor','Recording is not supported in this browser'));return;}
 if(!proj.layers.length){toast(t2('Önce parça ekleyin','Add a part first'));return;}
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));const ch=[];
 const r=new MediaRecorder(cv.captureStream(30),{mimeType:mime,videoBitsPerSecond:12e6});r.ondataavailable=e=>e.data.size&&ch.push(e.data);
 r.onstop=()=>download(new Blob(ch,{type:'video/webm'}),`nakis-${slug()}.webm`);rec=r;r.start(250);now=0;mode='film';showFilm(0);playing=true;$('pp').textContent='⏸';toast(t2('Kayıt başladı — sekmeyi açık tutun','Recording — keep this tab open'));
}

// ───────────── events ─────────────
const move=(i,d)=>{const j=i+d;if(j<0||j>=proj.layers.length)return;[proj.layers[i],proj.layers[j]]=[proj.layers[j],proj.layers[i]];sel=j;};
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-act]');if(!el||el.tagName==='SELECT'||el.type==='checkbox')return;const a=el.dataset.act,i=+el.dataset.i,key=el.dataset.key;
 if(a==='tab'){tab=key;{const MO={lat:'lat',shape:'shp',spiral:'spi',img:'img'};if(MO[key]){mode=MO[key];playing=false;}else if(['lat','shp','spi','img','steps'].includes(mode)){mode='edit';playing=false;}}renderPanel();redrawSoon();return;}
 if(a==='add'){const l=newLayer(el.dataset.part,{size:proj.layers.length?220:320});proj.layers.push(l);sel=proj.layers.length-1;changed(true);return;}
 if(a==='sel'){sel=i;mode='edit';renderPanel();redrawSoon();return;}
 if(a==='up'){move(i,-1);changed(true);return;}if(a==='dn'){move(i,1);changed(true);return;}
 if(a==='dup'){const c={...proj.layers[i],id:uid++,x:proj.layers[i].x+30,y:proj.layers[i].y+30};proj.layers.splice(i+1,0,c);sel=i+1;changed(true);return;}
 if(a==='del'){proj.layers.splice(i,1);sel=Math.max(0,Math.min(sel,proj.layers.length-1));changed(true);return;}
 if(a==='pal'){if(e.target.closest('label,input'))return;proj.palette=key;changed(true);return;}
 if(a==='weave'){proj.weave=key;changed(true);return;}
 if(a==='gundo'){proj.gen.pts.pop();genChanged();renderPanel();redrawSoon();save();return;}
 if(a==='gclear'){proj.gen.pts=[];genChanged();renderPanel();redrawSoon();save();return;}
 if(a==='gadd'){if(!proj.gen.pts.length)return;genChanged();proj.layers.push(newLayer('c_custom',{size:320}));sel=proj.layers.length-1;tab='parts';changed(true);toast(t2('Parça eklendi','Part added'));return;}
 if(a==='imgpick'){$('imgfile').click();return;}
 if(a==='imgauto'&&proj.img&&imgGray){const m=proj.img;m.thr=IMG.autoLevels(IMG.blur(imgGray,m.w,m.h,m.blur),3);imgChanged();renderPanel();redrawSoon();save();return;}
 if(a==='imgadd'){if(!proj.img)return;imgChanged();proj.layers.push(newLayer('c_image',{size:340}));sel=proj.layers.length-1;tab='parts';changed(true);toast(t2('Parça eklendi','Part added'));return;}
 if(a==='steps'){playSteps(false);return;}
 if(a==='recsteps'){playSteps(true);return;}
 if(a==='snap'){snapshot();return;}
 if(a==='play'){play();return;}
 if(a==='cloth'){if(!proj.layers.length)return;playing=false;showFilm(TL.c+.5);$('pp').textContent=t2('▶ Film','▶ Film');return;}
 if(a==='rec'){record();return;}
 if(a==='png'){cv.toBlob(b=>b&&download(b,`nakis-${slug()}.png`));return;}
 if(a==='savep'){download(new Blob([JSON.stringify(proj,null,1)],{type:'application/json'}),`nakis-${slug()}.json`);return;}
 if(a==='loadp'){$('file').click();return;}
 if(a==='newp'){proj=defaultProject();sel=0;changed(true);return;}
 if(a==='descdl'){download(new Blob([describe()],{type:'text/markdown'}),`nakis-${slug()}.md`);return;}
 if(a==='desccopy'){try{navigator.clipboard.writeText(describe());toast(t2('Kopyalandı','Copied'));}catch{}return;}
});
document.addEventListener('input',e=>{
 const el=e.target;if(el.dataset.vid&&vidEl){vidEl.currentTime=Math.min(vidEl.duration-.04,el.value/1000*vidEl.duration);return;}if(el.dataset.im&&proj.img){const k=el.dataset.im,m=proj.img;if(k.startsWith('thr'))m.thr[+k.slice(3)]=+el.value;else if(k==='invert')m.invert=el.checked;else m[k]=+el.value;if(k==='levels')while(m.thr.length<m.levels)m.thr.push(128);const o=el.parentNode.querySelector('output');if(o)o.textContent=el.value;imgChanged();mode='img';playing=false;if(k==='levels')renderPanel();drawImgPreview();save();return;}if(el.dataset.s){const k=el.dataset.s;spi[k]=el.type==='checkbox'?(el.checked?1:0):+el.value;if(k==='play')spi.play=el.checked;const o=el.parentNode.querySelector('output');if(o)o.textContent=el.value;mode='spi';playing=false;drawSpiral();return;}
 if(el.dataset.l||el.dataset.g){const M={l:'lat',g:'shp'};mode=el.dataset.l?'lat':'shp';playing=false;}if(el.dataset.g){const k=el.dataset.g;if(k==='preset'){const q=GPRE[el.value];if(q){proj.gen={pts:q.pts.map(a=>[...a]),alt:q.alt,arms:q.arms};}}else if(k==='alt')proj.gen.alt=el.checked;else if(k==='arms')proj.gen.arms=+el.value;else if(k==='n')shp.n=+el.value;genChanged();if(el.type==='range'){const o=el.parentNode.querySelector('output');if(o)o.textContent=el.value;const ns=document.querySelector('[data-g=n]');if(ns){ns.max=genMax();if(+ns.value>genMax()){ns.value=genMax();shp.n=genMax();}}}else renderPanel();drawPad();redrawSoon();save();return;}if(el.dataset.l){const k=el.dataset.l;lat[k]=el.type==='checkbox'?el.checked:(el.tagName==='SELECT'?el.value:+el.value);if(k==='theta'||k==='anim')lat.anim=k==='anim'?el.checked:false;const out=el.parentNode.querySelector('output');if(out)out.textContent=el.value;if(k==='theta'){const cb=document.querySelector('[data-l=anim]');if(cb)cb.checked=false;}drawLat();return;}
 const k=el.dataset.k,p=el.dataset.p,a=el.dataset.act,c=el.dataset.c;
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
$('seek').oninput=e=>{playing=false;showFilm(e.target.value/1000*TL.total);};
document.addEventListener('change',e=>{if(e.target.id==='imgfile'){const f=e.target.files[0];if(f)loadImgSource(URL.createObjectURL(f),f.type.startsWith('video'));e.target.value='';return;}if(e.target.id==='file'){const f=e.target.files[0];if(!f)return;f.text().then(s=>{try{loadProj(JSON.parse(s));sel=0;changed(true);toast(t2('Proje yüklendi','Project loaded'));}catch{toast(t2('Dosya okunamadı','Could not read file'));}});e.target.value='';}});
// canvas: select, drag, wheel
let drag=null;
const pos=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*W-CX,(e.clientY-r.top)/r.height*H-CY];};
cv.addEventListener('pointerdown',e=>{if(mode!=='edit')return;const [x,y]=pos(e),hit=i=>{const l=proj.layers[i];if(!l||!l.visible)return false;const b=placed(l).box;return x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1;};
 let h=hit(sel)?sel:-1;if(h<0)for(let i=proj.layers.length-1;i>=0;i--)if(hit(i)){h=i;break;}
 if(h<0)return;if(h!==sel){sel=h;renderPanel();}drag={x,y,lx:proj.layers[sel].x,ly:proj.layers[sel].y};cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing';});
cv.addEventListener('pointermove',e=>{if(!drag)return;const [x,y]=pos(e),l=proj.layers[sel];l.x=Math.round(drag.lx+x-drag.x);l.y=Math.round(drag.ly+y-drag.y);syncXY(l);rebuild();redrawSoon();});
cv.addEventListener('pointerup',()=>{if(drag){drag=null;cv.style.cursor='grab';save();}});
cv.addEventListener('wheel',e=>{if(mode!=='edit'||!proj.layers[sel])return;e.preventDefault();const l=proj.layers[sel];l.size=clamp(Math.round(l.size*Math.pow(1.0015,-e.deltaY)),30,900);const s=document.querySelector('[data-k=size]');if(s){s.value=l.size;s.parentNode.querySelector('output').textContent=l.size;}rebuild();redrawSoon();save();},{passive:false});
function syncXY(l){for(const k of ['x','y']){const s=document.querySelector(`[data-k=${k}]`);if(s){s.value=l[k];s.parentNode.querySelector('output').textContent=l[k];}}}

// ───────────── boot ─────────────
window.renderAt=t=>{playing=false;showFilm(t);return TL.total;};
window.filmTotal=()=>TL.total;
window.loadProject=p=>{loadProj(p);sel=0;changed(true);return TL.total;};
window.studio={get project(){return proj;},presets:PRESETS,parts:PARTS,load:name=>{loadProj(PRESETS[name]());sel=0;changed(true);},edit:()=>{mode='edit';playing=false;drawEdit(true);}};
(async()=>{
 $('lang').textContent=lang==='tr'?'EN':'TR';
 const q=new URLSearchParams(location.search);let ok=false;
 try{const s=localStorage.getItem(KEY);if(s&&!q.get('preset')&&!q.get('p')){loadProj(JSON.parse(s));ok=true;}}catch{}
 if(q.get('preset')&&PRESETS[q.get('preset')]){loadProj(PRESETS[q.get('preset')]());ok=true;}
 if(q.get('p')){try{loadProj(await (await fetch(q.get('p'))).json());ok=true;}catch{}}
 if(!ok)loadProj(PRESETS.medallion());
 restoreImg();rebuild();renderPanel();
 if(q.get('t')!==null&&q.get('t')!==''&&q.get('t')!==undefined&&q.has('t'))showFilm(+q.get('t'));else drawEdit(false),redraw();
 requestAnimationFrame(ts=>{last=ts;loop(ts);});
})();
