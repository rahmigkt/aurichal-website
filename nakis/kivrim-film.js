import {RULES,build} from './iter-core.js';
import {clamp,smooth,inOut,outBack,mix,lum} from './film-core.js';
import {WEAVES,WEAVE_ORDER,weaveTile} from './weave.js';

const W=1080,H=1350,CX=540,CY=640,SEED=1.2,STEPN=2.2,INTRO=2.5,MULT=8,GROUND=5,SWATCH=3.5,OUTRO=3;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const SERIF='"Cormorant Garamond","Times New Roman",Georgia,serif',SANS='Poppins,system-ui,-apple-system,"Segoe UI",sans-serif',GOLD='#f2c14e',CORAL='#ff6b5e';
const CURVES={
 levy:{rule:'levy',arms:4,col:'#ff6b5e',title:'Lévy C Eğrisi',max:8,blurb:'Her parça, dik açıyla kırılan iki küçük parçaya dönüşür'},
 dragon:{rule:'dragon',arms:4,col:'#4fd1c5',title:'Ejderha Eğrisi',max:8,blurb:'Kıvrımlar dönüşümlü yöne gider; dört kol düzlemi boşluksuz doldurur'},
 twin:{rule:'dragon',arms:2,col:'#f1ece0',title:'İkiz Ejderha',max:8,blurb:'İki ejderha, aynı noktadan sırt sırta büyür'},
 terdragon:{rule:'terdragon',arms:4,col:'#f2c14e',title:'Terdragon',max:7,blurb:'Her parça, 120° kıvrılan üç küçük parçaya dönüşür'}
};
const PALS=[{n:'Kobalt',ground:'#f1e9d8',ink:'#1f4a9c',accent:'#c08a3e',soft:'#86a9dc'},{n:'Lacivert',ground:'#0f2b5c',ink:'#efe6d2',accent:'#e0a84a',soft:'#4fb4c4'},{n:'Turkuaz',ground:'#1b5a63',ink:'#f1e9d8',accent:'#e0a84a',soft:'#8fcfc0'},{n:'Süzani',ground:'#efe3c6',ink:'#b3262e',accent:'#2f4fb0',soft:'#4f8a4f'},{n:'Kobalt',ground:'#f1e9d8',ink:'#1f4a9c',accent:'#c08a3e',soft:'#86a9dc'}];
const P0={ground:'#121212',ink:'#efe6d2',accent:'#e0a84a',soft:'#5fb8c8'},KEYS=['ground','ink','accent','soft'];
const key=new URLSearchParams(location.search).get('c'),CK=CURVES[key]?key:'levy',C=CURVES[CK],R=RULES[C.rule],MAXN=C.max;
const nsteps=MAXN,T={a:INTRO};T.ae=T.a+SEED+nsteps*STEPN+1;T.m=T.ae;T.me=T.m+MULT;T.g=T.me;T.ge=T.g+GROUND;T.c=T.ge;T.ce=T.c+(PALS.length-1)*SWATCH;T.total=T.ce+OUTRO;
const cache=new Map();
const arms=N=>{if(!cache.has(N))cache.set(N,build(R,N,C.arms));return cache.get(N);};
let bx,by,half;{const all=arms(MAXN).flatMap(a=>a.full);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const q of all){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}bx=(x0+x1)/2;by=(y0+y1)/2;half=Math.max(x1-x0,y1-y0)/2;}
const tiles={};for(const k of WEAVE_ORDER)tiles[k]=ctx.createPattern(weaveTile(k,7),'repeat');

function pal(t){const g=smooth((t-T.g)/(T.ge-T.g)),f=clamp((t-T.c)/(T.ce-T.c))*(PALS.length-1),i=Math.min(PALS.length-2,Math.floor(f)),w=smooth(f-i),o={g,w,i};
 for(const k of KEYS){o[k]=mix(P0[k],mix(PALS[i][k],PALS[i+1][k],w),g);}o.name=(w<.5?PALS[i]:PALS[i+1]).n;o.weaveA=WEAVE_ORDER[i];o.weaveB=WEAVE_ORDER[i+1];o.weaveName=WEAVES[w<.5?o.weaveA:o.weaveB].name;return o;}
function stroke(A,u,cx,cy,s,colors,lw,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';
 const path=a=>{for(let i=0;i<a.full.length;i++){const p=a.flat[i],q=a.full[i],x=p[0]+(q[0]-p[0])*u,y=p[1]+(q[1]-p[1])*u,X=cx+s*(x-bx),Y=cy-s*(y-by);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}};
 if(typeof colors==='string'){ctx.strokeStyle=colors;ctx.beginPath();A.forEach(path);ctx.stroke();}
 else A.forEach((a,i)=>{ctx.strokeStyle=colors[i%colors.length];ctx.beginPath();path(a);ctx.stroke();});
 ctx.restore();
}
function text(s,x,y,size,col,{font=SERIF,style='italic',align='left',alpha=1,weight=''}={}){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.textAlign=align;ctx.font=`${style} ${weight} ${size}px ${font}`;ctx.fillText(s,x,y);ctx.restore();}
const sup=n=>String(n).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const fmt=n=>n.toLocaleString('tr-TR');
function overlay(P){if(P.g<=0)return;ctx.save();ctx.globalCompositeOperation='overlay';
 ctx.fillStyle=tiles[P.weaveA];ctx.globalAlpha=P.g*(1-P.w)*.85;ctx.fillRect(0,0,W,H);
 if(P.w>0){ctx.fillStyle=tiles[P.weaveB];ctx.globalAlpha=P.g*P.w*.85;ctx.fillRect(0,0,W,H);}ctx.restore();}

function frame(t){
 const P=pal(t),bg=P.ground,dark=lum(bg)<.55,fg=dark?'#efe6d2':'#1a1410',S0=400/half;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 const tones=[P.ink,P.accent,P.soft,P.ink];let label='',sub='',l1='',l2='',l3='';
 if(t<T.a){const a=smooth(t/1.2)*(1-smooth((t-2)/.5));text('NAKIŞ',CX,CY-40,150,GOLD,{align:'center',alpha:a,style:'normal',weight:'500'});text(C.title,CX,CY+30,58,fg,{align:'center',alpha:a});text('Kıvrımın Geometrisi',CX,CY+86,26,fg,{align:'center',alpha:a*.6,font:SANS,style:'normal'});}
 else if(t<T.m){
  const tt=t-T.a,N=tt<SEED?0:Math.min(MAXN,1+Math.floor((tt-SEED)/STEPN)),u=N?inOut(((tt-SEED)-(N-1)*STEPN)/(STEPN*.8)):1,segPx=S0*Math.pow(R.ratio,N);
  stroke(arms(N),u,CX,CY,S0,C.col,Math.max(1.6,Math.min(3.6,.3*segPx)));
  label=C.title.toUpperCase();sub=C.blurb;
  const parts=C.arms*R.m**N;l1=`N = ${N}`;l3=`parça: ${C.arms}·${R.m}${sup(N)} = ${fmt(parts)}`;
  l2=R.m===2?`ℓ = (1/√2)${sup(N)} = 1/${fmt(Math.round(Math.pow(Math.SQRT2,N)*100)/100)}`:`ℓ = (1/√3)${sup(N)} = 1/${fmt(Math.round(Math.pow(Math.sqrt(3),N)*100)/100)}`;
  var dline=`d = ln ${R.m} / ln(1/r) = ${R.m===2?'ln 2 / ln √2':'ln 3 / ln √3'} = 2`;
 }else{
  const w=300,h=375,q=Math.min(.46*w/half,.46*h/half)*1.0,hu=inOut((t-T.m)/3),S=S0+(q*half/half-S0)*hu,hy=CY+(675-CY)*hu,lw=Math.max(1.5,Math.min(2.8,.3*q*Math.pow(R.ratio,MAXN)));
  const A=arms(MAXN);
  for(let m=-4;m<=4;m++)for(let n=-5;n<=5;n++){if(!m&&!n)continue;const d=Math.hypot(m,n),u=(t-T.m-1.2-d*.45)/1.2;if(u<=0)continue;
   const x=390+(m+.5)*w,y=487.5+(n+.5)*h+(Math.abs(m%2)===1?h/2:0);stroke(A,1,x,y,q*outBack(u),tones,lw,smooth(u*2));}
  stroke(A,1,CX,hy,S,tones,Math.max(lw,Math.min(3.4,.3*S*Math.pow(R.ratio,MAXN))),1);
  if(t<T.g){label='ÇOĞALTMA';sub='Yarım kaydırmalı tekrar: her sütun yarım boy aşağı';}
  else if(t<T.c){label='KUMAŞ ZEMİN';sub='Çözgü ve atkı: iplikler motifin altından geçer';}
  else{label=`${P.name.toUpperCase()} · ${P.weaveName.toUpperCase()}`;sub='Aynı geometri, başka boya, başka dokuma';}
  l1='pₘₙ = q + (w(m+½), h(n+½) + ½h·(m mod 2))';l2='m, n ∈ ℤ';
 }
 overlay(P);
 if(t>=T.a){
  if(t>=T.m){ctx.save();ctx.fillStyle=bg;ctx.globalAlpha=.86;ctx.fillRect(0,0,W,175);ctx.fillRect(0,1050,W,300);ctx.restore();overlay(P);}
  const gold=dark?GOLD:'#8a5a10';text(label,70,100,32,gold,{font:SANS,style:'normal',weight:'500'});text(sub,70,148,27,fg,{alpha:.8});
  const fa=1-smooth((t-(T.total-3))/1);
  if(t<T.m){text(l1,70,1235,84,CORAL,{style:'normal'});text(l3,70,1135,36,fg);text(l2,W-70,1235,40,fg,{align:'right',alpha:.9});text(dline,W-70,1290,26,GOLD,{align:'right',alpha:.9});}
  else{text(l1,70,1135,40,fg,{alpha:fa});text(l2,70,1235,84,gold,{style:'normal',alpha:fa});}
 }
 if(t>T.total-3)text('NAKIŞ — '+C.title,CX,1180,44,fg,{align:'center',alpha:smooth((t-(T.total-3))/1)});
 text('Hüseyin Rahmi Göktaş · MUKANTARA',W-40,1332,22,fg,{align:'right',alpha:.55,style:'normal',font:SANS});
}
const $=id=>document.getElementById(id);
let now=0,playing=true,last=performance.now(),rec=null;
function show(t){now=clamp(t,0,T.total);frame(now);$('seek').value=Math.round(now/T.total*1000);const s=Math.floor(now);$('tm').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function loop(ts){const dt=(ts-last)/1000;last=ts;if(playing){if(now>=T.total){playing=false;$('pp').textContent='▶';if(rec){rec.stop();rec=null;}}else show(now+dt);}requestAnimationFrame(loop);}
$('m').value=CK;$('m').onchange=e=>{location.search='?c='+e.target.value;};
$('pp').onclick=()=>{if(now>=T.total)now=0;playing=!playing;$('pp').textContent=playing?'⏸':'▶';};
$('seek').oninput=e=>{playing=false;$('pp').textContent='▶';show(e.target.value/1000*T.total);};
$('rec').onclick=()=>{if(!window.MediaRecorder)return;const ch=[],r=new MediaRecorder(cv.captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:12e6});r.ondataavailable=e=>ch.push(e.data);r.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(ch,{type:'video/webm'}));a.download=`nakis-kivrim-${CK}.webm`;a.click();};rec=r;r.start();show(0);playing=true;$('pp').textContent='⏸';};
window.renderAt=t=>{playing=false;show(t);return T.total;};window.filmTotal=()=>T.total;
if(location.search.includes('static'))playing=false;
show(0);requestAnimationFrame(ts=>{last=ts;loop(ts);});
