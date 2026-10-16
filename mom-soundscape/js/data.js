// ---------- Every number and every choice in Mom Soundscape ----------

// The longest a recording can be. Recording stops by itself after this.
export const MAX_SECS = 60;

// Recordings shorter than this are thrown away ("too short, try again").
export const MIN_SECS = 0.3;

// The longest a name can be.
export const MAX_NAME = 24;

// Button colours. New sounds take the next one along.
export const COLORS = [
  '#ff4f8b',  // pink
  '#ff5a4e',  // red
  '#ff9f1c',  // orange
  '#ffd23f',  // yellow
  '#2fbf71',  // green
  '#17b8a6',  // teal
  '#3a86ff',  // blue
  '#8a47e6',  // purple
  '#a0673f',  // brown
  '#3d3a4b',  // night
];

// Pictures for the buttons. New sounds get one at random.
export const EMOJIS = [
  '❤️', '😘', '😂', '🥰', '😴', '🤪',
  '👋', '👏', '🎵', '🎤', '🥁', '🎸',
  '🐶', '🐱', '🐮', '🐷', '🐸', '🦁',
  '🐔', '🦆', '🐵', '🦄', '🤖', '👻',
  '🚗', '🚀', '🌙', '☀️', '🌈', '⭐',
  '🎂', '🍕', '🎉', '🔔', '💩', '🦖',
];

// Ways a sound can be played back. `rate` speeds it up (higher and quicker)
// or slows it down (lower and slower); the rest is in js/player.js.
export const VOICES = [
  { id: 'normal',    emoji: '🙂', name: 'Normal' },
  { id: 'squeaky',   emoji: '🐭', name: 'Squeaky',   rate: 1.6 },
  { id: 'deep',      emoji: '🐻', name: 'Deep',      rate: 0.62 },
  { id: 'robot',     emoji: '🤖', name: 'Robot' },
  { id: 'echo',      emoji: '🏔️', name: 'Echo' },
  { id: 'backwards', emoji: '🔄', name: 'Backwards' },
];
export const VOICE_BY_ID = Object.fromEntries(VOICES.map(v => [v.id, v]));

// Shown in the empty name box, one after another.
export const NAME_IDEAS = [
  "Mom's laugh", 'I love you', 'Good night', 'Silly song',
  'Dinner time!', 'Big sneeze', 'Wake up!', 'Moo',
];
