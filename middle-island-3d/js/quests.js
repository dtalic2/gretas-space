// ---------- The path from shipwreck to castle ----------
//
// Each step says what to do, knows when it is done, and can point at where to
// do it. The guide arrow on the HUD follows `target`.
import { HILL, MEADOW } from './terrain.js';

const nearestNode = (g, type) => {
  let best = null, bd = Infinity;
  const p = g.player.position;
  for (const n of g.world.nodes){
    if (n.type !== type || n.hp <= 0) continue;
    const d = (n.x - p.x) ** 2 + (n.z - p.z) ** 2;
    if (d < bd){ bd = d; best = n; }
  }
  return best && { x: best.x, z: best.z };
};
const site = (g, type) => {
  const b = g.world.buildings.find((q) => q.type === type && q.progress < 1);
  return b && { x: b.x, z: b.z, label: 'Keep hammering' };
};
const meadow = { x: MEADOW.x, z: MEADOW.z, label: 'The meadow is good flat ground' };
const buildStep = (type, text, hint) => ({
  text, hint,
  done: (g) => g.world.has(type),
  target: (g) => site(g, type) ?? meadow,
  build: type,
});

export const QUESTS = [
  { text: 'Your ship ran aground! Chop some trees for wood', hint: 'Walk up to a tree and hold E',
    done: (g) => g.state.res.wood >= 5 || g.world.buildings.length > 0, target: (g) => nearestNode(g, 'tree'), goal: ['wood', 5] },
  buildStep('campfire', 'Build a Campfire before night falls', 'Press B (or 🔨) and pick the Campfire'),
  { text: 'Pick some berries so you do not go hungry', hint: 'Berry bushes grow around the meadow',
    done: (g) => g.state.gathered.food >= 3, target: (g) => nearestNode(g, 'bush'), goal: ['food', 3, 'gathered'] },
  buildStep('hut', 'Build a Straw Hut to sleep in', 'Chop 12 wood, then 🔨 → Straw Hut'),
  { text: 'Mine stone from the rocks up on the hill', hint: 'The grey rocks are north, up the hill',
    done: (g) => g.state.res.stone >= 12 || g.world.has('cottage'), target: (g) => nearestNode(g, 'rock'), goal: ['stone', 12] },
  buildStep('farm', 'Plant a Wheat Farm', 'A farm needs flat ground. Harvest it when it turns gold'),
  buildStep('cottage', 'Build a Timber Cottage — settlers will move in', 'Settlers gather wood and stone for you'),
  buildStep('well', 'Dig a Stone Well', 'Drink from it to heal. Farms grow faster too'),
  { text: 'Find iron ore at the very top of the hill', hint: 'Look for rocks with orange crystals',
    done: (g) => g.state.res.iron >= 4 || g.world.has('blacksmith'), target: (g) => nearestNode(g, 'iron') ?? { x: HILL.x, z: HILL.z }, goal: ['iron', 4] },
  buildStep('blacksmith', 'Build a Blacksmith', 'Then forge an Iron Axe and Pickaxe there'),
  { text: 'Forge a tool at the Blacksmith', hint: 'Stand at the forge and press E',
    done: (g) => Object.keys(g.state.upgrades).length > 0,
    target: (g) => { const b = g.world.buildings.find((q) => q.type === 'blacksmith'); return b && { x: b.x, z: b.z }; } },
  buildStep('windmill', 'Build a Windmill to grind your wheat', 'More bread from every harvest'),
  buildStep('watchtower', 'Build a Watchtower to keep the wolves away', 'Wolves will not come near its fire'),
  buildStep('chapel', 'Build a Chapel with a bell tower', 'Two more settlers will join you'),
  buildStep('castle', 'Build the Castle Keep and become Lord of Middle Island!', 'It is big! Anything in the way gets cleared when you place it'),
  { text: 'You are the Lord of Middle Island! Keep building your kingdom', hint: 'Build more cottages, farms and towers',
    done: () => false, target: () => null },
];
