// ---------- Sound ----------
// Everything is synthesised with WebAudio, so there are no sound files to load.
// The context is created on the first user gesture (browsers block it before that).

let ctx = null, master = null, sfxBus = null, musicBus = null;
let musicOn = true, soundOn = true, voiceOn = true;
let musicTimer = null, musicStep = 0, nextNoteTime = 0, musicIntensity = 0;

export function initAudio(){
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = soundOn ? 0.9 : 0; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.32 : 0; musicBus.connect(master);
}

export function setSound(on){ soundOn = on; if (sfxBus) sfxBus.gain.value = on ? 0.9 : 0; }
export function setMusic(on){ musicOn = on; if (musicBus) musicBus.gain.value = on ? 0.32 : 0; }
export function setVoice(on){ voiceOn = on; if (!on) try { speechSynthesis.cancel(); } catch {} }

function tone(freq, dur, { type='sine', vol=0.3, slide=0, delay=0, bus=sfxBus, attack=0.005 } = {}){
  if (!ctx || !bus) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { vol=0.3, filter=1200, delay=0, type='lowpass' } = {}){
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filter;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t);
}

export const sfx = {
  coin(pitch = 0){ tone(988 * Math.pow(1.03, pitch), 0.08, { type:'square', vol:0.08 });
                   tone(1319 * Math.pow(1.03, pitch), 0.14, { type:'square', vol:0.08, delay:0.06 }); },
  jump(){ tone(320, 0.22, { type:'triangle', vol:0.25, slide:420 }); },
  slide(){ noise(0.3, { vol:0.25, filter:900 }); },
  lane(){ tone(500, 0.06, { type:'sine', vol:0.08, slide:120 }); },
  correct(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type:'triangle', vol:0.22, delay:i * 0.07 })); },
  fast(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, { type:'square', vol:0.08, delay:0.3 + i * 0.05 })); },
  wrong(){ tone(220, 0.35, { type:'sawtooth', vol:0.2, slide:-120 }); tone(160, 0.45, { type:'square', vol:0.12, delay:0.12, slide:-80 }); },
  crash(){ noise(0.5, { vol:0.6, filter:600 }); tone(110, 0.5, { type:'sawtooth', vol:0.25, slide:-60 }); },
  shieldBreak(){ noise(0.4, { vol:0.35, filter:4000, type:'highpass' }); tone(880, 0.3, { type:'sine', vol:0.2, slide:-600 }); },
  power(){ [440, 554, 659, 880, 1109].forEach((f, i) => tone(f, 0.12, { type:'square', vol:0.09, delay:i * 0.045 })); },
  rocket(){ noise(1.0, { vol:0.35, filter:500 }); tone(90, 1.0, { type:'sawtooth', vol:0.1, slide:200 }); },
  question(){ tone(660, 0.1, { type:'sine', vol:0.18 }); tone(880, 0.16, { type:'sine', vol:0.18, delay:0.1 }); },
  click(){ tone(700, 0.05, { type:'square', vol:0.06 }); },
  buy(){ [659, 880, 1319].forEach((f, i) => tone(f, 0.14, { type:'triangle', vol:0.18, delay:i * 0.08 })); },
  levelUp(){ [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, { type:'triangle', vol:0.2, delay:i * 0.09 })); },
  bark(){ tone(420, 0.09, { type:'sawtooth', vol:0.18, slide:-180 }); noise(0.08, { vol:0.15, filter:1800 });
          tone(460, 0.09, { type:'sawtooth', vol:0.16, slide:-200, delay:0.16 }); },
  whoosh(){ noise(0.35, { vol:0.18, filter:2500, type:'bandpass' }); },
  countdown(last){ tone(last ? 1047 : 660, last ? 0.4 : 0.15, { type:'square', vol:0.12 }); },
};

// ---------- Music: a bouncy little loop, intensity follows speed ----------
const BASS = [0, 0, 7, 7, 5, 5, 3, 7];
const MELODY = [
  12, null, 15, 12, 19, null, 17, 15, 12, null, 15, 17, 19, 22, 19, null,
  15, null, 17, 15, 12, null, 10, 12, 15, null, 12, 10, 7, null, 10, null,
];
const ROOT = 146.83; // D3

export function startMusic(){
  if (!ctx || musicTimer) return;
  nextNoteTime = ctx.currentTime + 0.05;
  musicStep = 0;
  musicTimer = setInterval(scheduleMusic, 25);
}
export function stopMusic(){ clearInterval(musicTimer); musicTimer = null; }
export function setMusicIntensity(v){ musicIntensity = Math.max(0, Math.min(1, v)); }

function scheduleMusic(){
  const bpm = 132 + musicIntensity * 24;
  const step = 60 / bpm / 2;
  while (nextNoteTime < ctx.currentTime + 0.12){
    const i = musicStep;
    const t = nextNoteTime - ctx.currentTime;
    const semi = n => ROOT * Math.pow(2, n / 12);
    if (i % 2 === 0) tone(semi(BASS[(i >> 2) % 8] - 12), step * 1.6, { type:'triangle', vol:0.35, delay:t, bus:musicBus });
    const m = MELODY[i % MELODY.length];
    if (m !== null) tone(semi(m), step * 0.9, { type:'square', vol:0.07, delay:t, bus:musicBus });
    // hats and kick
    if (i % 4 === 0) kick(t);
    if (i % 2 === 1) hat(t);
    nextNoteTime += step;
    musicStep++;
  }
}

function kick(delay){
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.16);
}
function hat(delay){
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.value = 0.12;
  s.connect(f).connect(g).connect(musicBus); s.start(t);
}

// ---------- Voice: reads the question aloud, if the browser can ----------
export function speak(text){
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const spoken = text.replace(/×/g, ' times ').replace(/\?/g, ' what ').replace(/=/g, ' equals ');
    const u = new SpeechSynthesisUtterance(spoken);
    u.rate = 1.15; u.pitch = 1.2; u.volume = 0.9;
    speechSynthesis.speak(u);
  } catch {}
}
