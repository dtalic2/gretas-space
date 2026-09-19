// ---------- Little synthesised noises ----------
//
// No audio files: a handful of short oscillator blips, built on first tap so
// mobile browsers are happy to start the context.

export class Audio {
  constructor(muted = false){
    this.muted = muted;
    this.ctx = null;
    this.night = 0;
    this.ambient = null;
    this._timer = null;
  }

  _wake(){
    if (!this.ctx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** One note. `type` is an oscillator shape, `t` an offset in seconds. */
  note(freq, dur = 0.12, type = 'sine', t = 0, gain = 1){
    if (this.muted) return;
    const ctx = this._wake();
    if (!ctx) return;
    const now = ctx.currentTime + t;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.5 * gain, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(env).connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // ------------------------------------------------------------ ambience --
  /**
   * A bed of wind, plus birds by day and crickets after dark. Started on the
   * first tap, because browsers will not make a sound before one.
   */
  startAmbient(){
    if (this.ambient) return;
    const ctx = this._wake();
    if (!ctx) return;

    const out = ctx.createGain();
    out.gain.value = this.muted ? 0 : 0.5;
    out.connect(this.master);

    // Wind: filtered noise, with a slow swell so it never sits still.
    const secs = 3;
    const buf = ctx.createBuffer(1, ctx.sampleRate * secs, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++){
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;          // brown-ish, easier on the ear
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const wind = ctx.createGain();
    wind.gain.value = 0.16;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(filter.frequency);

    src.connect(filter).connect(wind).connect(out);
    src.start();
    lfo.start();

    this.ambient = { out, wind, filter, src, lfo };
    this._schedule();
  }

  /** 0 = broad daylight, 1 = deep night. Chooses who is singing. */
  setNight(k){ this.night = k; }

  _schedule(){
    clearTimeout(this._timer);
    const gap = 2600 + Math.random() * 5200;
    this._timer = setTimeout(() => {
      if (!this.muted && this.ambient) this.night > 0.55 ? this._cricket() : this._chirp();
      this._schedule();
    }, gap);
  }

  _chirp(){
    const base = 2100 + Math.random() * 1500;
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i++){
      this.note(base * (1 + i * 0.08), 0.07, 'sine', i * 0.1, 0.13);
    }
  }

  _cricket(){
    for (let i = 0; i < 4; i++) this.note(4600, 0.035, 'triangle', i * 0.085, 0.07);
  }

  setMuted(muted){
    this.muted = muted;
    if (this.ambient) this.ambient.out.gain.value = muted ? 0 : 0.5;
  }

  chord(freqs, dur = 0.3, type = 'triangle'){
    freqs.forEach((f, i) => this.note(f, dur, type, i * 0.05, 0.7));
  }

  tap(){ this.note(520, 0.07, 'triangle', 0, 0.5); }
  plant(){ this.note(330, 0.1, 'sine'); this.note(440, 0.1, 'sine', 0.06); }
  harvest(){ this.chord([523, 659, 784], 0.22); }
  coins(){ this.note(880, 0.08, 'square', 0, 0.35); this.note(1175, 0.12, 'square', 0.06, 0.3); }
  build(){ this.note(196, 0.16, 'sawtooth', 0, 0.35); this.note(294, 0.2, 'triangle', 0.08); }
  deliver(){ this.chord([659, 880, 1047], 0.3); }
  level(){ [523, 659, 784, 1047].forEach((f, i) => this.note(f, 0.28, 'triangle', i * 0.09, 0.8)); }
  nope(){ this.note(180, 0.14, 'sawtooth', 0, 0.3); }
}
