// ---------- Sound, synthesised ----------
//
// No audio files: waves, birds, crickets, axes and the little lute tune are all
// noise and oscillators built at runtime. Browsers won't start an AudioContext
// before a gesture, so nothing is created until unlock() is called.

const NOISE_SECONDS = 3;

// A slow tune in D dorian, for a plucked lute. [semitones above D4, beats]
const TUNE = [
  [0, 1], [3, 1], [5, 1], [7, 2], [5, 1], [3, 1], [5, 2], [0, 2],
  [-2, 1], [0, 1], [3, 1], [5, 1], [3, 2], [0, 1], [-2, 1], [0, 4],
  [7, 1], [10, 1], [12, 2], [10, 1], [7, 1], [5, 2], [7, 2],
  [3, 1], [5, 1], [7, 1], [5, 1], [3, 2], [2, 1], [3, 1], [0, 4],
];
const BASS = [0, 0, -5, -2, 0, -5, -7, 0];

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
    this.sea = this._loop('lowpass', 380, 0.8, 0.05);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const amt = ctx.createGain();
    amt.gain.value = 220;
    lfo.connect(amt); amt.connect(this.sea.filter.frequency);
    lfo.start();
    this.wind = this._loop('bandpass', 600, 0.5, 0.012);
    this.crickets = this._loop('bandpass', 4600, 14, 0);

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
    this.sea.gain.gain.setTargetAtTime(0.02 + seaNear * 0.09, t, 0.5);
    // Crickets chirp in pulses.
    const pulse = night > 0.5 ? (Math.sin(t * 28) > 0.2 ? 0.035 : 0) * (Math.sin(t * 0.7) > -0.3 ? 1 : 0) : 0;
    this.crickets.gain.gain.setTargetAtTime(pulse, t, 0.01);
    // Birds by day.
    if (night < 0.3){
      this._chirpT -= dt;
      if (this._chirpT <= 0){ this._chirpT = 1.5 + Math.random() * 5; this.bird(); }
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
    else this._burst({ type: 'lowpass', freq: 300 + Math.random() * 120, q: 1.2, gain: 0.07, dur: 0.08, rate: 0.8 });
  }
  chop(){
    this._burst({ type: 'bandpass', freq: 900, q: 1.5, gain: 0.35, dur: 0.12, rate: 0.9 });
    this._tone(170, 0.12, 0.14, 'triangle', 110);
  }
  mine(){
    this._tone(1900 + Math.random() * 300, 0.18, 0.08, 'square', 1500);
    this._tone(2600, 0.12, 0.05, 'sine');
    this._burst({ type: 'highpass', freq: 2500, q: 0.8, gain: 0.18, dur: 0.1 });
  }
  pick(){ this._burst({ type: 'bandpass', freq: 2200, q: 1, gain: 0.12, dur: 0.1, rate: 1.4 }); this._tone(900, 0.06, 0.04, 'triangle'); }
  reel(){ this._burst({ type: 'bandpass', freq: 1100, q: 0.6, gain: 0.2, dur: 0.4, rate: 1.1, sweep: 0.3 }); }
  hammer(){
    this._burst({ type: 'highpass', freq: 2000, q: 0.7, gain: 0.22, dur: 0.06, rate: 1.6 });
    this._tone(210, 0.12, 0.12, 'square', 130);
  }
  get(){ this._tone(740, 0.07, 0.07, 'triangle'); this._tone(1110, 0.1, 0.06, 'triangle', null, 0.06); }
  timber(){ this._burst({ type: 'lowpass', freq: 600, q: 2, gain: 0.25, dur: 0.9, rate: 0.5, sweep: 0.3 }); }
  thud(){ this._tone(80, 0.4, 0.3, 'sine', 40); this._burst({ type: 'lowpass', freq: 300, gain: 0.3, dur: 0.3 }); }
  eat(){ for (let i = 0; i < 3; i++) this._burst({ type: 'bandpass', freq: 1400, q: 2, gain: 0.12, dur: 0.06, delay: i * 0.12 }); }
  drink(){ for (let i = 0; i < 3; i++) this._tone(500 + i * 90, 0.1, 0.07, 'sine', 300, i * 0.15); }
  swing(){ this._burst({ type: 'bandpass', freq: 1500, q: 1, gain: 0.18, dur: 0.18, rate: 1.2, sweep: 0.3 }); }
  hurt(){ this._tone(260, 0.25, 0.14, 'sawtooth', 150); }
  ui(){ this._tone(660, 0.05, 0.05, 'triangle'); }
  deny(){ this._tone(190, 0.18, 0.09, 'sawtooth', 120); }
  place(){ this._tone(392, 0.1, 0.1, 'triangle'); this._tone(523, 0.14, 0.1, 'triangle', null, 0.08); }

  bird(){
    const base = 2200 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) this._tone(base, 0.09, 0.025, 'sine', base * (1.2 + Math.random() * 0.4), i * 0.13);
  }

  howl(){
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.linearRampToValueAtTime(560, t + 0.6);
    o.frequency.linearRampToValueAtTime(520, t + 1.6);
    o.frequency.linearRampToValueAtTime(380, t + 2.2);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
    const va = ctx.createGain(); va.gain.value = 9;
    vib.connect(va); va.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.5);
    g.gain.linearRampToValueAtTime(0.05, t + 1.6);
    g.gain.linearRampToValueAtTime(0, t + 2.3);
    o.connect(g); g.connect(this.master);
    o.start(t); vib.start(t); o.stop(t + 2.4); vib.stop(t + 2.4);
  }
  growl(){ this._burst({ type: 'lowpass', freq: 380, q: 3, gain: 0.3, dur: 0.35, rate: 0.4 }); this._tone(110, 0.3, 0.1, 'sawtooth', 80); }
  yelp(){ this._tone(900, 0.2, 0.08, 'triangle', 1400); }

  bell(){
    for (const [f, g] of [[392, 0.12], [784, 0.06], [988, 0.035], [1176, 0.03]]) this._tone(f, 2.6, g, 'sine');
  }

  done(){
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.35, 0.1, 'triangle', null, i * 0.1));
  }
  fanfare(){
    const n = [[523, 0], [523, 0.15], [523, 0.3], [659, 0.45], [784, 0.75], [659, 1.05], [784, 1.2], [1047, 1.5]];
    for (const [f, d] of n){ this._tone(f, 0.5, 0.1, 'square', null, d); this._tone(f / 2, 0.5, 0.06, 'triangle', null, d); }
  }
  dawn(){ [392, 523, 659, 784].forEach((f, i) => this._tone(f, 0.6, 0.06, 'sine', null, i * 0.16)); }

  // ------------------------------------------------------------ music
  _pluck(freq, t, dur, gain){
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
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.musicBus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  _startMusic(){
    const BEAT = 0.42;
    const D4 = 293.66;
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
        if (i === 0) rest = 24;
      }
    };
    setInterval(tick, 200);
  }
}
