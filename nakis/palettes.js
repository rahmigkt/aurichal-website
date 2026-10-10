// Historic colourways. ground/ink/accent/soft are the screen colours of the dyed cloth and the three motif tones.
export const HISTORIC={
 ochre:{n:'Yellow Ochre',dye:'Africa & the Mediterranean · iron-oxide earth pigment',ground:'#dcae4a',ink:'#2e1a0c',accent:'#8c2f18',soft:'#5e3a18'},
 turkeyred:{n:'Turkey Red',dye:'Anatolia & India · madder root, alum mordant',ground:'#a8261f',ink:'#f6ead0',accent:'#f2c25a',soft:'#f0b0a0'},
 verdigris:{n:'Verdigris',dye:'Mediterranean · copper acetate, blue-green',ground:'#2f7463',ink:'#f4ecd9',accent:'#f2c25a',soft:'#bfe6d6'},
 cochineal:{n:'Cochineal Crimson',dye:'Mexico & Peru · cochineal insect, alum mordant',ground:'#7a1230',ink:'#f6e8d2',accent:'#f2c25a',soft:'#eba3b6'},
 turkishblue:{n:'Turkish Blue',dye:'Iznik, Ottoman Turkey · tile blue-turquoise',ground:'#17788f',ink:'#f6efde',accent:'#f4c85e',soft:'#bfe9ee'},
 indigo:{n:'Indigo',dye:'West Africa & India · Indigofera fermentation vat',ground:'#1b2a63',ink:'#efe6d2',accent:'#f0b64e',soft:'#8fb0e8'},
 tyrian:{n:'Tyrian Purple',dye:'Phoenicia · murex sea-snail purple',ground:'#5e2a6a',ink:'#f4e8d6',accent:'#f2c25a',soft:'#d9a8e0'},
 kakishibu:{n:'Kakishibu Brown',dye:'Japan · fermented persimmon tannin',ground:'#8a5430',ink:'#f6ead2',accent:'#f2c25a',soft:'#e8c7a0'},
 bogolan:{n:'Bogolan Mud Black',dye:'Mali · fermented river mud on cotton',ground:'#2a231c',ink:'#efe1c2',accent:'#d9a441',soft:'#b9a483'},
 linen:{n:'Natural Linen',dye:'Egypt & Europe · undyed flax, cobalt-blue thread',ground:'#e6dabd',ink:'#1f3f8f',accent:'#9a3b1c',soft:'#3f66ad'},
 woad:{n:'Woad Blue',dye:'Europe · Isatis tinctoria leaf vat',ground:'#33669c',ink:'#f5eddb',accent:'#f2c25a',soft:'#c3dcf0'},
 weld:{n:'Weld Yellow',dye:'Europe & Anatolia · Reseda luteola',ground:'#d5bf48',ink:'#2b2410',accent:'#7a2a18',soft:'#5a4a14'}
};
export const HISTORIC_ORDER=['ochre','turkeyred','verdigris','cochineal','turkishblue','indigo','tyrian','kakishibu','bogolan','linen','woad','weld'];
const lin=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);};
export const relLum=h=>{const v=[1,3,5].map(i=>lin(parseInt(h.slice(i,i+2),16)));return .2126*v[0]+.7152*v[1]+.0722*v[2];};
export const contrast=(a,b)=>{const A=relLum(a),B=relLum(b),hi=Math.max(A,B),lo=Math.min(A,B);return (hi+.05)/(lo+.05);};
