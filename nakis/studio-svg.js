import simplify from './vendor/simplify.js';
import {trimLine} from './studio-motion.js';
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=n=>Number(n.toFixed(6));
/** Export vector geometry only. Cloth shading / film captions are raster effects. */
export function sceneSVG(layers,palette,placed,{width=1080,height=1350,cx=540,cy=625,optimise=false}={}){
 let defs='',body='',count=0,before=0,after=0;
 for(const l of layers){if(!l.visible)continue;
  body+=`<g opacity="${num(l.opacity??1)}">`;
  for(const sh of placed(l).shapes){
   const reveal=l.reveal??1;
   if(reveal<=0)continue;
   let pts=sh.fill?sh.pts:trimLine(sh.pts,reveal);before+=pts.length;
   // Simplification is opt-in for open non-brand strokes only. Filled polygons stay exact.
   if(optimise&&!sh.fill&&!sh.closed&&l.part!=='wac_w')pts=simplify(pts.map(([x,y])=>({x,y})),.35,true).map(p=>[p.x,p.y]);
   after+=pts.length;
   if(!pts.length)continue;
   const d=pts.map(([x,y],i)=>`${i?'L':'M'}${num(x+cx)} ${num(y+cy)}`).join(' ')+(sh.closed?' Z':'');
   let fill=sh.fill?palette[sh.tone]:'none';
   if(sh.fill&&sh.tone2){const id='g'+count;defs+=`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${cx}" x2="${cx}" y1="${num(sh.y0+cy)}" y2="${num(sh.y1+cy)}"><stop stop-color="${xml(fill)}"/><stop offset="1" stop-color="${xml(palette[sh.tone2]||fill)}"/></linearGradient>`;fill=`url(#${id})`;}
   const stroke=sh.noStroke?'none':palette[sh.tone2||sh.edge||sh.tone];
   const u=Math.max(0,Math.min(1,reveal*1.4-.2)),alpha=sh.fill?u*u*(3-2*u):1;
   body+=`<path d="${d}" fill="${xml(fill)}" fill-opacity="${num(alpha)}" stroke="${xml(stroke||'none')}" stroke-width="${num(sh.lw)}" stroke-linecap="round" stroke-linejoin="round"/>`;count++;
  }body+='</g>';
 }
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs><rect width="${width}" height="${height}" fill="${xml(palette.ground)}"/>${body}</svg>`,before,after};
}
