// Original approved WAC SVG geometry; SVG y-down -> studio y-up.
export const WAC_POLYGONS = [
 [[0,2],[145,281],[191,192],[85,1]],
 [[120,2],[268,281],[314,195],[313,190],[211,1]],
 [[280,1],[347,130],[407,0]]
];
export const WAC_PART = {
 title:'WAC · W',tag:'LOGO',group:'brand',counts:[1],
 blurb:'Original WAC symbol: three geometric pieces, one colour, unchanged proportions',
 build:()=>WAC_POLYGONS.map((pts,i)=>({id:'wac-'+i,pts:pts.map(([x,y])=>[x,-y]),tone:'ink',fill:true,closed:true,noStroke:true})),
 f:()=>['Original SVG geometry','3 geometric pieces','Single colour']
};
