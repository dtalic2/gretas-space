// ---------- Sound, synthesised ----------
//
// No audio files: the surf, the gulls, the frogs at night, every splash and
// the little ukulele tune are noise and oscillators built at runtime. Browsers won't start an AudioContext
// before a gesture, so nothing is created until unlock() is called.

const NOISE_SECONDS = 3;

// A bouncy island tune in C major, for a plucked ukulele. [semitones above C5, beats]
const TUNE = [
  [0, 1], [4, 1], [7, 1], [9, 1], [7, 2], [4, 2],
  [5, 1], [4, 1], [2, 1], [0, 1], [2, 4],
  [0, 1], [4, 1], [7, 1], [12, 1], [9, 2], [7, 2],
  [5, 1], [7, 1], [4, 1], [2, 1], [0, 4],
];
const BASS = [0, 5, 7, 0, 0, 5, 7, 0];

export class Audio {
  constructor(){
    this.ctx = null;
    this.enabled = true;
    this.music = true;
    this.ready = false;
    this._chirpT = 2;
  }

  unlock(){
    if (this.ctx){ if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.85 : 0;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.music ? 0.5 : 0;
    this.musicBus.connect(this.master);

    const len = ctx.sampleRate * NOISE_SECONDS;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // The sea: low noise whose cutoff swells like breaking waves.
    this.sea = this._loop('lowpass', 520, 0.8, 0.06);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const amt = ctx.createGain();
    amt.gain.value = 220;
    lfo.connect(amt); amt.connect(this.sea.filter.frequency);
    lfo.start();
    this.wind = this._loop('bandpass', 600, 0.5, 0.012);
    this.crickets = this._loop('bandpass', 3200, 12, 0);

    this.ready = true;
    this._startMusic();
  }

  setEnabled(on){
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.85 : 0, this.ctx.currentTime, 0.05);
  }
  setMusic(on){
    this.music = on;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.2);
  }

  _loop(type, freq, q, gain){
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
    return { src, filter: f, gain: g };
  }

  /** Every frame: how near the sea you are, and whether it is night. */
  ambience(dt, seaNear, night){
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.sea.gain.gain.setTargetAtTime((0.03 + seaNear * 0.1) * (this.under ? 0.3 : 1), t, 0.5);
    // Crickets chirp in pulses.
    const pulse = night > 0.5 ? (Math.sin(t * 28) > 0.2 ? 0.035 : 0) * (Math.sin(t * 0.7) > -0.3 ? 1 : 0) : 0;
    this.crickets.gain.gain.setTargetAtTime(pulse, t, 0.01);
    // Gulls and tropical birds by day.
    if (night < 0.3){
      this._chirpT -= dt;
      if (this._chirpT <= 0){ this._chirpT = 2 + Math.random() * 6; Math.random() < 0.5 ? this.gull() : this.bird(); }
    }
  }

  _burst({ type = 'lowpass', freq = 800, q = 1, gain = 0.3, dur = 0.2, rate = 1, sweep = 0, delay = 0 }){
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise; src.playbackRate.value = rate; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.setValueAtTime(freq, t), f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 2); src.stop(t + dur + 0.05);
  }

  _tone(freq, dur, gain = 0.16, type = 'sine', slideTo = null, delay = 0, bus = null){
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus ?? this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------ one-shots
  step(wet){
    if (wet) this._burst({ type: 'bandpass', freq: 800 + Math.random() * 300, q: 0.8, gain: 0.1, dur: 0.15, rate: 1.4 });
    else this._burst({ type: 'lowpass', freq: 500 + Math.random() * 200, q: 1, gain: 0.06, dur: 0.1, rate: 1.1 });
  }
  splash(){ this._burst({ type: 'bandpass', freq: 900, q: 0.6, gain: 0.3, dur: 0.5, rate: 1.2, sweep: 0.25 }); }
  swim(){ this._burst({ type: 'bandpass', freq: 600, q: 0.7, gain: 0.1, dur: 0.35, rate: 0.9, sweep: 0.4 }); }
  jump(){ this._tone(300, 0.15, 0.06, 'triangle', 600); }
  cast(){ this._burst({ type: 'bandpass', freq: 2200, q: 0.8, gain: 0.18, dur: 0.35, rate: 1.4, sweep: 0.4 }); }
  plop(){ this._tone(420, 0.12, 0.12, 'sine', 180); this._burst({ type: 'bandpass', freq: 900, q: 1, gain: 0.12, dur: 0.2 }); }
  bite(){ this._tone(700, 0.08, 0.1, 'square'); this._tone(900, 0.1, 0.1, 'square', null, 0.1); }
  reel(){ for (let i = 0; i < 6; i++) this._tone(1400 + i * 30, 0.03, 0.04, 'square', null, i * 0.05); }
  miss(){ this._tone(400, 0.3, 0.08, 'triangle', 200); }
  catch(legend){
    const n = legend ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
    n.forEach((f, i) => this._tone(f, 0.3, 0.1, 'triangle', null, i * 0.09));
  }
  pick(){ this._tone(660, 0.06, 0.07, 'triangle'); this._tone(990, 0.1, 0.06, 'triangle', null, 0.06); }
  coin(){ this._tone(988, 0.08, 0.09, 'square'); this._tone(1319, 0.2, 0.08, 'square', null, 0.07); }
  ui(){ this._tone(660, 0.05, 0.05, 'triangle'); }
  deny(){ this._tone(190, 0.18, 0.08, 'sawtooth', 120); }
  done(){ [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.35, 0.09, 'triangle', null, i * 0.1)); }
  heart(){ [880, 1175, 1568].forEach((f, i) => this._tone(f, 0.2, 0.05, 'sine', null, i * 0.07)); }
  bark(){ for (let i = 0; i < 2; i++){ this._tone(420, 0.09, 0.14, 'sawtooth', 260, i * 0.18); this._burst({ type: 'bandpass', freq: 900, q: 2, gain: 0.12, dur: 0.08, delay: i * 0.18 }); } }
  squawk(){ this._tone(1500, 0.18, 0.08, 'sawtooth', 900); this._tone(1700, 0.14, 0.06, 'sawtooth', 1100, 0.2); }
  ooh(){ this._tone(400, 0.2, 0.08, 'sine', 700); this._tone(450, 0.2, 0.08, 'sine', 800, 0.25); }
  click(){ for (let i = 0; i < 3; i++) this._burst({ type: 'highpass', freq: 3000, q: 1, gain: 0.15, dur: 0.03, delay: i * 0.08 }); }
  dolphin(){ this._tone(1800, 0.25, 0.06, 'sine', 3200); this._tone(3000, 0.2, 0.05, 'sine', 1900, 0.28); }
  gull(){ const b = 1300 + Math.random() * 400; this._tone(b, 0.25, 0.025, 'sawtooth', b * 0.7); this._tone(b * 1.05, 0.2, 0.02, 'sawtooth', b * 0.75, 0.3); }
  bird(){
    const base = 2200 + Math.random() * 1600;
    for (let i = 0; i < 3; i++) this._tone(base, 0.09, 0.025, 'sine', base * (1.2 + Math.random() * 0.4), i * 0.13);
  }
  dawn(){ [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.6, 0.06, 'sine', null, i * 0.16)); }
  /** One strum of the ukulele: a chord, strings a hair apart. */
  strum(root = 0){
    if (!this.ready) return;
    const C5 = 523.25;
    [0, 4, 7, 12].forEach((s, i) => this._pluck(C5 * Math.pow(2, (s + root) / 12) / 2, this.ctx.currentTime + i * 0.02, 0.9, 0.08, this.master));
  }

  // ------------------------------------------------------------ music
  _pluck(freq, t, dur, gain, bus = null){
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    const o2 = ctx.createOscillator(); o2.type = 'sine';
    o2.frequency.setValueAtTime(freq * 2.003, t);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(freq * 6, t);
    f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(bus ?? this.musicBus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  _startMusic(){
    const BEAT = 0.3;
    const D4 = 523.25;
    let i = 0, next = this.ctx.currentTime + 1.5, bar = 0, rest = 0;
    const tick = () => {
      if (!this.ready) return;
      const now = this.ctx.currentTime;
      while (next < now + 0.6){
        if (rest > 0){ next += BEAT; rest--; continue; }
        const [semi, beats] = TUNE[i];
        this._pluck(D4 * Math.pow(2, semi / 12), next, beats * BEAT * 1.6, 0.09);
        // A drone note on every bar's downbeat.
        if (i % 4 === 0){
          this._pluck(D4 / 2 * Math.pow(2, BASS[bar % BASS.length] / 12), next, BEAT * 4, 0.06);
          bar++;
        }
        next += beats * BEAT;
        i = (i + 1) % TUNE.length;
        // A long pause between times through, so it doesn't nag.
        if (i === 0) rest = 16;
      }
    };
    setInterval(tick, 200);
  }
}
