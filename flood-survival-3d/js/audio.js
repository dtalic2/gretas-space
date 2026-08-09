// ---------- Sound, synthesised ----------
//
// No audio files: everything is noise and oscillators built at runtime. That
// keeps the folder a pure text checkout, and rain that is *generated* can follow
// the storm's intensity continuously instead of cross-fading between clips.
//
// Browsers won't start an AudioContext before a gesture, so nothing is created
// until unlock() is called from the first tap or key press.

const NOISE_SECONDS = 3;

export class Audio {
  constructor(){
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
  }

  unlock(){
    if (this.ctx){ if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0;
    this.master.connect(ctx.destination);

    // One shared buffer of white noise, played back at different rates and
    // through different filters, is most of a weather system.
    const len = ctx.sampleRate * NOISE_SECONDS;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    this._startRain();
    this._startWind();
    this.ready = true;
  }

  setEnabled(on){
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
  }

  _loop(filterType, freq, q, gain){
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
    return { src, filter: f, gain: g };
  }

  _startRain(){
    this.rainHi = this._loop('highpass', 1900, 0.7, 0);      // the hiss
    this.rainLo = this._loop('bandpass', 420, 0.9, 0);       // the body
  }

  _startWind(){
    this.wind = this._loop('lowpass', 320, 1.4, 0.02);
    // Slow LFO on the cutoff so gusts come and go on their own.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const amt = this.ctx.createGain();
    amt.gain.value = 140;
    lfo.connect(amt); amt.connect(this.wind.filter.frequency);
    lfo.start();
  }

  /** Called every frame: rain volume tracks the storm, muffled when submerged. */
  ambience(rain, submerged){
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const duck = submerged ? 0.25 : 1;
    this.rainHi.gain.gain.setTargetAtTime(rain * 0.14 * duck, t, 0.4);
    this.rainLo.gain.gain.setTargetAtTime(rain * 0.10 * duck, t, 0.4);
    this.wind.gain.gain.setTargetAtTime((0.02 + rain * 0.06) * duck, t, 0.6);
  }

  // ------------------------------------------------------------------ one-shots
  _burst({ type = 'lowpass', freq = 800, q = 1, gain = 0.3, dur = 0.2, rate = 1, sweep = 0 }){
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rate;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  _tone(freq, dur, gain = 0.16, type = 'sine', slideTo = null){
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  step(wet){
    if (wet) this._burst({ type: 'bandpass', freq: 700 + Math.random() * 400, q: 0.8, gain: 0.16, dur: 0.17, rate: 1.4 });
    else this._burst({ type: 'lowpass', freq: 260 + Math.random() * 120, q: 1.2, gain: 0.1, dur: 0.09, rate: 0.8 });
  }

  splash(){ this._burst({ type: 'bandpass', freq: 900, q: 0.6, gain: 0.32, dur: 0.5, rate: 1.2, sweep: 0.25 }); }
  swim(){ this._burst({ type: 'bandpass', freq: 520, q: 0.7, gain: 0.13, dur: 0.35, rate: 0.9, sweep: 0.4 }); }

  gather(){
    this._burst({ type: 'lowpass', freq: 420, q: 1.4, gain: 0.14, dur: 0.13, rate: 0.7 });
    this._tone(320 + Math.random() * 60, 0.09, 0.05, 'triangle');
  }

  hammer(){
    this._burst({ type: 'highpass', freq: 2400, q: 0.7, gain: 0.2, dur: 0.06, rate: 1.6 });
    this._tone(190, 0.13, 0.1, 'square', 120);
  }

  cash(){
    this._tone(880, 0.09, 0.11, 'triangle');
    setTimeout(() => this._tone(1320, 0.14, 0.09, 'triangle'), 70);
  }

  buy(){ this._tone(520, 0.1, 0.1, 'square', 700); }
  ui(){ this._tone(660, 0.05, 0.05, 'triangle'); }
  deny(){ this._tone(180, 0.18, 0.1, 'sawtooth', 110); }

  done(){
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 0.1, 'triangle'), i * 95));
  }

  dawn(){
    [392, 523, 659].forEach((f, i) => setTimeout(() => this._tone(f, 0.5, 0.07, 'sine'), i * 150));
  }

  thunder(){
    if (!this.ready) return;
    // Two layers: a crack, then a long rumble sweeping down. The sweep is what
    // sells the distance.
    this._burst({ type: 'lowpass', freq: 1400, q: 0.5, gain: 0.3, dur: 0.35, rate: 1.1, sweep: 0.2 });
    setTimeout(() => this._burst({ type: 'lowpass', freq: 180, q: 0.7, gain: 0.42, dur: 2.6, rate: 0.35, sweep: 0.35 }), 90);
  }

  siren(){
    // The evacuation horn on the last day.
    this._tone(300, 1.5, 0.12, 'sawtooth', 240);
    setTimeout(() => this._tone(300, 1.5, 0.12, 'sawtooth', 240), 1900);
  }
}
