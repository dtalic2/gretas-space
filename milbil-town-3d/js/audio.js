// ---------- Little synthesised noises ----------
//
// No audio files: a handful of short oscillator blips, built on first tap so
// mobile browsers are happy to start the context.

export class Audio {
  constructor(muted = false){
    this.muted = muted;
    this.ctx = null;
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
