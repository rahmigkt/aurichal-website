// NAKIŞ Studio — conformal spiral tiling (after the Fazlıoğlu hexagon-spiral animation).
// Model: tile centres sit on a lattice z = i + j·ω in the z-plane (ω = e^{iπ/3}); each is carried by the complex
// exponential w = exp(c·z), c = k·e^{iφ}. A tile keeps its shape, is scaled by |c·w|/√3 (so neighbours touch)
// and turned by arg(c·w). Zoom = multiplying every w by exp(c·s): the picture spirals into the centre and,
// when s reaches one lattice step, repeats itself.
export const PAL_FZ=['#f024ad','#f37754','#f9a305','#d7e011','#10d61a','#0bccc9','#0955e5','#a24cf0'];  // measured from the video
export const DEF={k:.38,phi:60,sides:6,imax:40,jmin:-12,jmax:12,hueI:22,hueJ:47,speed:.35,dashes:1};
const hsv=(h,s,v)=>{h=((h%360)+360)%360/60;const c=v*s,x=c*(1-Math.abs(h%2-1)),m=v-c,[r,g,b]=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h)%6];return `rgb(${Math.round((r+m)*255)},${Math.round((g+m)*255)},${Math.round((b+m)*255)})`;};
const rnd=(i,j)=>{let x=Math.sin(i*127.1+j*311.7)*43758.5453;return x-Math.floor(x);};
/** tiles sorted from the centre outward; s = zoom phase (0..1 repeats) */
export function scene(P,s){
 const p={...DEF,...P},c=[p.k*Math.cos(p.phi*Math.PI/180),p.k*Math.sin(p.phi*Math.PI/180)],tiles=[],dashes=[];
 const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],ex=z=>{const m=Math.exp(z[0]);return [m*Math.cos(z[1]),m*Math.sin(z[1])];};
 const om=[.5,Math.sqrt(3)/2],shift=mul(c,[-s*1,0]); // zoom: translate z by -s along the ring axis... (one lattice step)
 for(let j=p.jmin;j<=p.jmax;j++)for(let i=-p.imax;i<=p.imax;i++){
  const z=[i+j*om[0],j*om[1]],w=ex([...mul(c,z)].map((v,q)=>v+shift[q])),cw=mul(c,w),sc=Math.hypot(cw[0],cw[1])/Math.sqrt(3);
  const K=P.K||40;if(sc*K<4||sc*K>420)continue;
  tiles.push({x:w[0]*K,y:w[1]*K,r:sc*K*(P.fill||.74),rot:Math.atan2(cw[1],cw[0]),i,j,order:sc});
  if(p.dashes){for(let q=0;q<2;q++){const u=rnd(i+q*7,j-q*3),v=rnd(j+q*5,i+q*11),zz=[z[0]+(u-.5),z[1]+(v-.5)*.9],w2=ex([...mul(c,zz)].map((a,b)=>a+shift[b])),cw2=mul(c,w2),s2=Math.hypot(cw2[0],cw2[1]);
   dashes.push({x:w2[0]*K,y:w2[1]*K,l:s2*K*.42,w:s2*K*.11,ang:Math.atan2(cw2[1],cw2[0])+(rnd(i,j+q)<.5?0:Math.PI/2),h:rnd(i*q+1,j)*360});}}
 }
 tiles.sort((a,b)=>a.order-b.order);
 return {tiles,dashes,hue:(i,j,t)=>PAL_FZ[(((Math.floor(i*.6+j*1.7+t*p.speed*8))%8)+8)%8],dashHue:(d,t)=>hsv(d.h+t*360*p.speed*.5,.9,.95)};
}
