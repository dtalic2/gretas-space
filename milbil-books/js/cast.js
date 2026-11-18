// ---------- Who can be in a book ----------
//
// Every milbil that has turned up anywhere on this account. Greta's own five
// drawings come first, then everybody from Milbil Café, MilMATHS, the
// Ningy-Ningy Canteen and Milbil.io, each drawn exactly the way those games
// draw them.
//
// `aspect` is width ÷ height, so a milbil can be stood in a panel at any height
// without being squashed. Greta's pictures are their real proportions; the drawn
// ones all share drawLook()'s 88 × 106 box.

import { drawLook, artHTML } from './milbil.js';

const DRAWN = 88 / 106;

export const CAST = [
  // Greta's drawings
  { id:'chomp',   name:'Chomp',   art:'art/chomp.png',  aspect:283 / 397, greta:true },
  { id:'hattie',  name:'Hattie',  art:'art/hattie.png', aspect:283 / 355, greta:true },
  { id:'petal',   name:'Petal',   art:'art/petal.png',  aspect:283 / 307, greta:true },
  { id:'scoop',   name:'Scoop',   art:'art/scoop.png',  aspect:283 / 396, greta:true },
  { id:'sunny',   name:'Sunny',   art:'art/sunny.png',  aspect:283 / 331, greta:true },

  // Milbil Café, MilMATHS and Milbil Lunchbox
  { id:'common',  name:'Common Milbil', look:{ line:'#8b7bff' } },
  { id:'sprouty', name:'Sprouty',  look:{ line:'#4cbb4a', hat:'sprout' } },
  { id:'giggle',  name:'Giggle',   look:{ line:'#ff6fae', eyes:'happy', mouth:'open' } },
  { id:'toothy',  name:'Toothy',   look:{ line:'#7d8cff', mouth:'teeth', eyes:'cross' } },
  { id:'snooze',  name:'Snooze',   look:{ line:'#7aa7ff', eyes:'sleepy' } },
  { id:'freckles',name:'Freckles', look:{ line:'#ff8a5b', extra:'freckles' } },
  { id:'brainy',  name:'Brainy',   look:{ line:'#2bb5a0', extra:'glasses' } },
  { id:'sporty',  name:'Sporty',   look:{ line:'#e05252', hat:'cap' } },
  { id:'cosy',    name:'Cosy',     look:{ line:'#3f7fe0', hat:'beanie', extra:'scarf' } },
  { id:'wizzle',  name:'Wizzle',   look:{ line:'#6a5cff', hat:'wizard' } },
  { id:'starry',  name:'Starry',   look:{ line:'#ffc93c', eyes:'sparkle', badge:'star' } },
  { id:'royal',   name:'Royal',    look:{ line:'#e0b000', hat:'crown', extra:'cape' } },
  { id:'chef',    name:'Chef Bil', look:{ line:'#c86fd8', hat:'chef', extra:'apron' } },

  // The Ningy-Ningy Canteen
  { id:'doodle',  name:'Doodle',   look:{ line:'#14b8a6', hat:'party', eyes:'happy' } },
  { id:'bobbin',  name:'Bobbin',   look:{ line:'#b05cf0', hat:'flowers' } },
  { id:'puddle',  name:'Puddle',   look:{ line:'#38b6ff', hat:'straw', eyes:'big' } },
  { id:'fizz',    name:'Fizz',     look:{ line:'#ff9a3c', hat:'cap', mouth:'open' } },
  { id:'marzi',   name:'Marzi',    look:{ line:'#ff6fa5', extra:'bow', eyes:'sparkle' } },
  { id:'tumble',  name:'Tumble',   look:{ line:'#3fbf6a', hat:'beanie' } },
  { id:'gus',     name:'Gus',      look:{ line:'#5b6cff', mouth:'teeth' } },
  { id:'zig',     name:'Zig',      look:{ line:'#e5484d', eyes:'wink' } },

  // Milbil.io
  { id:'farmer',  name:'Farmer',   look:{ line:'#e0a02c', hat:'straw' } },
  { id:'bowtie',  name:'Bowtie',   look:{ line:'#ff5fa2', extra:'bow' } },
  { id:'party',   name:'Party',    look:{ line:'#ff9f1c', hat:'party', mouth:'open' } },
  { id:'blossom', name:'Blossom',  look:{ line:'#ff7eb6', hat:'flowers' } },
  { id:'scoopy',  name:'Scoopy',   look:{ line:'#ff8fc8', hold:'icecream', eyes:'happy' } },
  { id:'floaty',  name:'Floaty',   look:{ line:'#ff4d6d', hold:'balloon' } },
  { id:'golden',  name:'Golden',   look:{ line:'#d99a00', fill:'#ffe27a', eyes:'sparkle' } },
  { id:'rainbow', name:'Rainbow',  look:{ line:'rainbow', eyes:'sparkle', hat:'party' } },
  { id:'boo',     name:'Boo',      look:{ line:'#9fb4ff', fill:'#eef2ff', ghost:true, eyes:'big' } },
];

for (const c of CAST) c.aspect ||= DRAWN;

export const WHO = Object.fromEntries(CAST.map(c => [c.id, c]));

/** Somebody to stand in for a milbil this version of the game has never heard of. */
const STRANGER = { id:'?', name:'Milbil', look:{ line:'#b9b2cc' }, aspect:DRAWN };
export const who = (id) => WHO[id] || STRANGER;

/** Picture of one milbil, filling whatever box it is put in. */
export function castHTML(id, cls = ''){
  const c = who(id);
  return c.art ? artHTML(c.art, c.name, cls) : drawLook(c.look, { cls, title: c.name });
}
