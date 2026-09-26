// ---------- Things to do on the island ----------
//
// Gentle goals, one at a time, each with a place for the arrow to point.
// Anything already done gets ticked off without fuss.
import { LAGOON } from './terrain.js';

const node = (g, type) => {
  let best = null, bd = Infinity;
  const p = g.player.position;
  for (const n of g.world.nodes){
    if (n.type !== type || !n.ready) continue;
    const d = (n.x - p.x) ** 2 + (n.z - p.z) ** 2;
    if (d < bd){ bd = d; best = n; }
  }
  return best && { x: best.x, z: best.z };
};
const animal = (g, k) => { const a = g.animals.get(k).root.position; return { x: a.x, z: a.z }; };
const friend = (g, k) => g.state.friends[k].hearts >= 3;

export const GOALS = [
  { text: 'Say hello to Coco the dog', hint: 'Walk up to Coco and press E to pet him', done: (g) => g.state.friends.dog.petDay > 0, target: (g) => animal(g, 'dog') },
  { text: 'Pick a mango', hint: 'Mango trees have orange fruit. Press E next to one', done: (g) => g.state.bag.mango > 0 || g.state.friends.parrot.hearts > 0, target: (g) => node(g, 'mango') },
  { text: 'Give the mango to Pip the parrot', hint: 'Pip sits on the perch by your hut', done: (g) => g.state.friends.parrot.hearts > 0, target: (g) => g.world.perch },
  { text: 'Go for a swim in the lagoon', hint: 'Walk into the water until you float', done: (g) => g.state.flags.swam, target: () => ({ x: LAGOON.x, z: LAGOON.z }) },
  { text: 'Catch a fish from the end of the dock', hint: 'Stand on the dock, face the water and press E to cast', done: (g) => Object.keys(g.state.journal).length > 0, target: (g) => ({ x: g.world.dock.x, z: g.world.dock.z + g.world.dock.len - 1 }) },
  { text: "Sell your catch at Kai's Tiki Shack", hint: 'Kai buys fish, shells and coconuts', done: (g) => g.state.flags.sold, target: (g) => ({ x: g.world.shack.x, z: g.world.shack.z + 2.4 }) },
  { text: 'Buy a snorkel from Kai and dive for a pearl', hint: 'Hold Dive while swimming. Pearls hide in oysters on the lagoon floor', done: (g) => g.state.found.pearl > 0, target: (g) => g.state.owned.snorkel ? node(g, 'pearl') : ({ x: g.world.shack.x, z: g.world.shack.z + 2.4 }) },
  { text: 'Feed seaweed to Shelly the sea turtle', hint: 'Grab seaweed from the lagoon floor, then swim up to Shelly', done: (g) => g.state.friends.turtle.hearts > 0, target: (g) => g.state.bag.seaweed ? animal(g, 'turtle') : node(g, 'seaweed') },
  { text: 'Give a banana to Momo the monkey', hint: 'Bananas grow in the jungle up the hill, where Momo lives', done: (g) => g.state.friends.monkey.hearts > 0, target: (g) => g.state.bag.banana ? animal(g, 'monkey') : node(g, 'banana') },
  { text: 'Feed a fish to Pinch the crab', hint: 'Pinch scuttles about near the shack. Walk, don\'t run!', done: (g) => g.state.friends.crab.hearts > 0, target: (g) => animal(g, 'crab') },
  { text: 'Swim out past the lagoon and meet Splash the dolphin', hint: 'Bring a fish. Splash loves them', done: (g) => g.state.friends.dolphin.hearts > 0, target: (g) => animal(g, 'dolphin') },
  { text: 'Play the ukulele for your friends', hint: 'Kai sells ukuleles. Then tap 🎸', done: (g) => g.state.flags.played, target: (g) => g.state.owned.ukulele ? null : ({ x: g.world.shack.x, z: g.world.shack.z + 2.4 }) },
  { text: 'Become best friends with everyone', hint: 'Three hearts each. Pet them every day and bring their favourite food', done: (g) => ['dog', 'parrot', 'monkey', 'turtle', 'crab', 'dolphin'].every((k) => friend(g, k)), target: () => null },
  { text: 'Catch the legendary Golden Fish', hint: 'It could bite anywhere. A Pro Rod helps', done: (g) => !!g.state.journal.golden, target: () => null },
  { text: 'Island life! Fill your fish journal', hint: 'Deep-sea fish bite from the ocean beaches; glow squid only at night', done: () => false, target: () => null },
];
