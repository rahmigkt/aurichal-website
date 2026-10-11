import earcut from './vendor/earcut.js';

const clamp=(v,a,b,d)=>Number.isFinite(+v)?Math.max(a,Math.min(b,+v)):d;
const lerp=(a,b,t)=>a+(b-a)*t;
const meshCache=new WeakMap();
export function geometrySettings(v={}){v=v||{};return {kind:['none','triangle','fold'].includes(v.kind)?v.kind:'none',chain:v.chain===true,depth:Math.round(clamp(v.depth,1,5,3)),ratio:clamp(v.ratio,.3,.75,.55),angle:clamp(v.angle,10,90,38),spacing:clamp(v.spacing,.7,2.4,1.3),foldAngle:clamp(v.foldAngle,15,165,135),mesh:v.mesh===true};}
export function bounds(shapes){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const s of shapes)for(const [x,y] of s.pts){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {cx:(x0+x1)/2,cy:(y0+y1)/2,r:Math.max(x1-x0,y1-y0)/2||1};}
export function triangulate(points){
 if(meshCache.has(points))return meshCache.get(points);
 // Filled studio parts are simple contours. Very complex contours remain intact.
 if(points.length<3||points.length>256)return [];
 const ids=earcut(points.flat()),tri=[];
 for(let i=0;i<ids.length;i+=3)tri.push(ids.slice(i,i+3));
 meshCache.set(points,tri);return tri;
}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function rotateHinge(point,a,b,angle){
 const axis=sub(b,a),length=Math.hypot(...axis);if(length<1e-10)return point.slice();
 const u=axis.map(v=>v/length),v=sub(point,a),c=Math.cos(angle),s=Math.sin(angle),cr=cross(u,v),d=dot(u,v);
 return a.map((n,i)=>n+v[i]*c+cr[i]*s+u[i]*d*(1-c));
}
/** Connected triangle panels; rigid 3D rotations about shared edges. */
export function foldMesh(points,amount,angle=135){
 const triangles=triangulate(points);if(!triangles.length)return [];
 const funcs=new Map(),parents=new Map(),id=p=>[p[0],p[1],0];
 funcs.set(0,id);const queue=[0];
 for(let qi=0;qi<queue.length;qi++){
  const i=queue[qi],parent=funcs.get(i);
  for(let j=0;j<triangles.length;j++)if(!funcs.has(j)){
   const common=triangles[i].filter(k=>triangles[j].includes(k));if(common.length!==2)continue;
   const a=parent(points[common[0]]),b=parent(points[common[1]]),theta=(j%2?-1:1)*amount*angle*Math.PI/180;
   funcs.set(j,p=>rotateHinge(parent(p),a,b,theta));parents.set(j,{parent:i,edge:common});queue.push(j);
  }
 }
 return triangles.map((ids,i)=>({ids,pts3:ids.map(k=>(funcs.get(i)||id)(points[k])),hinge:parents.get(i)}));
}
function surfaceGeometry(shapes,geo,pose,B){
 const formation=clamp(pose.formation,0,1,1),fold=clamp(pose.fold,0,1,0);
 if(geo.kind==='none'||(geo.kind==='triangle'&&formation===1&&!geo.mesh)||(geo.kind==='fold'&&fold===0&&!geo.mesh))return shapes;
 const seed=[[B.cx,B.cy+B.r*.75],[B.cx-B.r*.8,B.cy-B.r*.65],[B.cx+B.r*.8,B.cy-B.r*.65]],out=[];
 for(const sh of shapes){
  const tri=sh.fill&&sh.closed?triangulate(sh.pts):[];
  if(!tri.length){out.push(sh);continue;}
  const panels=geo.kind==='fold'?foldMesh(sh.pts,fold,geo.foldAngle):tri.map(ids=>({ids}));
  for(let i=0;i<panels.length;i++){
   const panel=panels[i];let pts,z=0,faceShade=1;
   if(geo.kind==='triangle')pts=panel.ids.map((k,j)=>sh.pts[k].map((v,a)=>lerp(seed[j][a],v,formation)));
   else{
    z=panel.pts3.reduce((s,p)=>s+p[2],0)/3;
    const normal=cross(sub(panel.pts3[1],panel.pts3[0]),sub(panel.pts3[2],panel.pts3[0]));
    faceShade=.45+.55*Math.abs(normal[2])/(Math.hypot(...normal)||1);
    pts=panel.pts3.map(([x,y,z])=>{const q=B.r*8/Math.max(B.r*2,B.r*8+z);return [B.cx+(x-B.cx)*q,B.cy+(y-B.cy)*q];});
   }
   out.push({...sh,id:sh.id+'-panel-'+i,pts,noStroke:!geo.mesh,tone2:null,edge:sh.tone,faceShade,depth3:z});
  }
 }
 // Far faces first. A disconnected logo is not a watertight origami surface.
 return out.sort((a,b)=>(b.depth3||0)-(a.depth3||0));
}
export function chainDepth(shapes,requested){
 const points=shapes.reduce((n,s)=>n+s.pts.length,0);let d=requested;
 while(d>0&&points*(2**(d+1)-1)>50000)d--;
 return d;
}
export function constructGeometry(shapes,settings,pose={}){
 const geo=geometrySettings(settings),B=bounds(shapes),base=surfaceGeometry(shapes,geo,pose,B);
 if(!geo.chain)return base;
 const d=chainDepth(base,geo.depth),growth=clamp(pose.growth,0,1,1),out=[];
 const visit=(level,x,y,scale,angle,path)=>{
  const u=level===0?1:clamp(growth*d-(level-1),0,1,0);if(u<=0)return;
  const c=Math.cos(angle),s=Math.sin(angle),q=scale*u;
  for(const sh of base)out.push({...sh,id:sh.id+'-chain-'+path,pts:sh.pts.map(([px,py])=>{const a=(px-B.cx)*q,b=(py-B.cy)*q;return [B.cx+x+a*c-b*s,B.cy+y+a*s+b*c];})});
  if(level>=d)return;
  for(const sign of [-1,1]){
   const dx=sign*B.r*geo.spacing*.65*scale,dy=B.r*geo.spacing*scale;
   visit(level+1,x+dx*c-dy*s,y+dx*s+dy*c,scale*geo.ratio,angle+sign*geo.angle*Math.PI/180,path+(sign<0?'L':'R'));
  }
 };
 visit(0,0,0,1,0,'0');return out;
}
export function shadeColour(col,shade=1){if(!/^#[0-9a-f]{6}$/i.test(col)||shade===1)return col;return '#'+[1,3,5].map(i=>Math.round(255-(255-parseInt(col.slice(i,i+2),16))*shade).toString(16).padStart(2,'0')).join('');}
