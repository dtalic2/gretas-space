// ---------- Everything you can choose about your character ----------
//
// A look is a plain object of choices, saved with the game. Each list below is
// what the character creator offers; `key` is what gets saved.

export const SKIN = [0xf3d2b3, 0xe3b48a, 0xc98f62, 0xa8704a, 0x7d4f32, 0x5a3622];

export const HAIR_COLORS = [0x1d1a18, 0x4a2e1a, 0x8a5a2a, 0xd8b060, 0xa8401e, 0xcfcfcf, 0x6a3fa0, 0x2f7ad0];

export const CLOTH = [0x7a4e2c, 0xa8423a, 0x2f5da8, 0x3f7d3a, 0x6a4ea0, 0xc28a2e, 0x2f2f36, 0xe6ddc8, 0xd0628a, 0x3a8a86];

export const HAIR_STYLES = [
  { key: 'short', name: 'Short' },
  { key: 'long', name: 'Long' },
  { key: 'ponytail', name: 'Ponytail' },
  { key: 'braids', name: 'Braids' },
  { key: 'curly', name: 'Curly' },
  { key: 'bald', name: 'Bald' },
];

export const HEADWEAR = [
  { key: 'none', name: 'Nothing' },
  { key: 'hood', name: 'Hood' },
  { key: 'strawhat', name: 'Straw hat' },
  { key: 'feather', name: 'Feather cap' },
  { key: 'helmet', name: 'Helmet' },
  { key: 'crown', name: 'Crown', locked: 'Build the Castle Keep to wear the crown' },
];

export const BEARDS = [
  { key: 'none', name: 'None' },
  { key: 'short', name: 'Stubble' },
  { key: 'long', name: 'Long beard' },
];

export const TITLES = ['Lord', 'Lady'];

export const DEFAULT_LOOK = {
  name: '', title: 'Lord',
  skin: 1, hair: 1, hairStyle: 'short', beard: 'none', headwear: 'hood',
  tunic: 0, pants: 6, cape: 3, hood: 3,
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const idx = (a) => Math.floor(Math.random() * a.length);

export function randomLook(prev = DEFAULT_LOOK){
  return {
    ...prev,
    skin: idx(SKIN), hair: idx(HAIR_COLORS),
    hairStyle: pick(HAIR_STYLES).key, beard: Math.random() < 0.7 ? 'none' : pick(BEARDS).key,
    headwear: pick(HEADWEAR.filter((h) => !h.locked)).key,
    tunic: idx(CLOTH), pants: idx(CLOTH), cape: Math.random() < 0.2 ? -1 : idx(CLOTH), hood: idx(CLOTH),
  };
}

/** Turn a saved look into the colours and parts makePerson() takes. */
export function personOptions(look){
  const l = { ...DEFAULT_LOOK, ...look };
  return {
    skin: SKIN[l.skin] ?? SKIN[1],
    hair: HAIR_COLORS[l.hair] ?? HAIR_COLORS[1],
    tunic: CLOTH[l.tunic] ?? CLOTH[0],
    pants: CLOTH[l.pants] ?? CLOTH[6],
    hairStyle: l.hairStyle, beard: l.beard, headwear: l.headwear,
    headColor: CLOTH[l.hood] ?? CLOTH[3],
    belt: 0x2a1c10,
  };
}
