// Browser helper: weave the figure into the cloth (damask principle) on any 2D context.
import {WEAVE_ORDER,MOTIF_WEAVE,weaveTile} from './weave.js';
import {brocade} from './brocade.js';
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const GRAY={};
function gray(k){if(!GRAY[k]){const c=weaveTile(k,7),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,g=new Uint8Array(c.width*c.height);for(let i=0;i<g.length;i++)g[i]=d[i*4];GRAY[k]={w:c.width,h:c.height,g};}return GRAY[k];}
export function brocadeOver(ctx,W,H,P){if(!P.wk)return;const img=ctx.getImageData(0,0,W,H);brocade(img.data,W,H,hexRgb(P.ground),gray(P.wk),gray(MOTIF_WEAVE[P.wk]));ctx.putImageData(img,0,0);}
