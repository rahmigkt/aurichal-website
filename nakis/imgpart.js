// NAKIŞ Studio — turn a picture (or the last frame of a video) into shapes: blur → luminance levels → marching-squares contours.
export function grayOf(rgba,w,h){const g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=.2126*rgba[i*4]+.7152*rgba[i*4+1]+.0722*rgba[i*4+2];return g;}
export function blur(g,w,h,r){if(r<=0)return g;let a=g,b=new Float32Array(w*h);for(let pass=0;pass<2;pass++){
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let k=-r;k<=r;k++){const xx=x+k;if(xx<0||xx>=w)continue;s+=a[y*w+xx];n++;}b[y*w+x]=s/n;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let k=-r;k<=r;k++){const yy=y+k;if(yy<0||yy>=h)continue;s+=b[yy*w+x];n++;}a[y*w+x]=s/n;}
 if(pass===0)a=new Float32Array(a);}return a;}
export function otsu(g,lo=0,hi=255){const hist=new Float64Array(256);let N=0;for(const v of g){const i=Math.min(255,Math.max(0,Math.round(v)));if(i<lo||i>hi)continue;hist[i]++;N++;}
 if(!N)return (lo+hi)/2;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let wB=0,sB=0,best=0,t=(lo+hi)/2;
 for(let i=lo;i<=hi;i++){wB+=hist[i];if(!wB)continue;const wF=N-wB;if(!wF)break;sB+=i*hist[i];const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;t=i;}}return t;}
/** n thresholds by repeated Otsu splitting */
export function autoLevels(g,n){let ts=[otsu(g)];while(ts.length<n){const edges=[0,...ts,255];let bi=0,bs=-1;for(let i=0;i<edges.length-1;i++){const s=edges[i+1]-edges[i];if(s>bs){bs=s;bi=i;}}const t=otsu(g,edges[bi],edges[bi+1]);ts.push(t);ts.sort((a,b)=>a-b);}return ts.map(Math.round);}
const SEG={1:[['L','B']],2:[['B','R']],3:[['L','R']],4:[['T','R']],5:[['L','T'],['B','R']],6:[['T','B']],7:[['L','T']],8:[['L','T']],9:[['T','B']],10:[['L','B'],['T','R']],11:[['T','R']],12:[['L','R']],13:[['B','R']],14:[['L','B']]};
export function contours(g,w,h,t){
 const W=w+2,H=h+2,f=new Uint8Array(W*H);for(let y=0;y<h;y++)for(let x=0;x<w;x++)f[(y+1)*W+x+1]=g[y*w+x]>=t?1:0;
 const pt=(x,y,e)=>e==='T'?[2*x+1,2*y]:e==='B'?[2*x+1,2*y+2]:e==='L'?[2*x,2*y+1]:[2*x+2,2*y+1],segs=[];
 for(let y=0;y<H-1;y++)for(let x=0;x<W-1;x++){const c=(f[y*W+x]?8:0)|(f[y*W+x+1]?4:0)|(f[(y+1)*W+x+1]?2:0)|(f[(y+1)*W+x]?1:0);if(c===0||c===15)continue;for(const [a,b] of SEG[c])segs.push([pt(x,y,a),pt(x,y,b)]);}
 const key=p=>p[0]+','+p[1],map=new Map();segs.forEach((s,i)=>{for(const p of s){const k=key(p);if(!map.has(k))map.set(k,[]);map.get(k).push(i);}});
 const used=new Uint8Array(segs.length),out=[];
 for(let i=0;i<segs.length;i++){if(used[i])continue;used[i]=1;const pts=[segs[i][0],segs[i][1]];let cur=segs[i][1];
  for(;;){const nx=(map.get(key(cur))||[]).find(j=>!used[j]);if(nx===undefined)break;used[nx]=1;const s=segs[nx],n=key(s[0])===key(cur)?s[1]:s[0];pts.push(n);cur=n;}
  out.push(pts.map(p=>[p[0]/2-1,p[1]/2-1]));}
 return out;
}
const area=p=>{let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return a/2;};
function dp(p,eps){if(p.length<4)return p;const n=p.length,keep=new Uint8Array(n);keep[0]=keep[n-1]=1;const st=[[0,n-1]];
 while(st.length){const [a,b]=st.pop();let md=0,mi=-1;const [ax,ay]=p[a],[bx,by]=p[b],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1;for(let i=a+1;i<b;i++){const d=Math.abs((p[i][0]-ax)*dy-(p[i][1]-ay)*dx)/L;if(d>md){md=d;mi=i;}}if(md>eps&&mi>0){keep[mi]=1;st.push([a,mi],[mi,b]);}}
 return p.filter((_,i)=>keep[i]);}
function dpClosed(p,eps){p=p.slice();const f=p[0],l=p[p.length-1];if(f[0]===l[0]&&f[1]===l[1])p.pop();if(p.length<4)return p;let k=1,md=-1;for(let i=1;i<p.length;i++){const d=Math.hypot(p[i][0]-p[0][0],p[i][1]-p[0][1]);if(d>md){md=d;k=i;}}
 const a=dp(p.slice(0,k+1),eps),b=dp([...p.slice(k),p[0]],eps);return [...a.slice(0,-1),...b.slice(0,-1)];}
const chaikin=p=>{const o=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];o.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]],[.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]]);}return o;};
const inside=(pt,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c;}return c;};
/** levels: ascending thresholds; returns [{pts,hole,level}] with y pointing up, centred */
export function shapesFrom(gray,w,h,{levels,blur:br=2,minArea=40,eps=1.1,invert=false,smooth=1}){
 let g=blur(gray,w,h,br);if(invert)g=g.map(v=>255-v);const out=[];
 levels.forEach((t,li)=>{const polys=contours(g,w,h,t).map(p=>dpClosed(p,eps)).filter(p=>p.length>=3&&Math.abs(area(p))>=minArea);
  const depth=polys.map((p,i)=>polys.reduce((n,q,j)=>n+(i!==j&&Math.abs(area(q))>Math.abs(area(p))&&inside(p[0],q)?1:0),0));
  polys.forEach((p,i)=>{let q=p;for(let s=0;s<smooth;s++)q=chaikin(q);out.push({pts:q.map(([x,y])=>[x-w/2,h/2-y]),hole:depth[i]%2===1,level:li});});});
 return out;
}
