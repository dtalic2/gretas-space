// ---------- The microphone ----------
//
// Recording somebody's voice, for the soundtrack studio (studio.js) and for
// voices on bubbles and sound buttons (voice.js). It asks for the microphone,
// says how loud it is, records, and hands back the sound. Nothing is sent
// anywhere: the browser records it and the game keeps it on the device.

import { card, sfx } from './ui.js';

/** Can this browser record? (It needs a microphone it's allowed to ask for, and MediaRecorder.) */
export const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

// What to record in, best first. Chrome and Firefox make WebM; iPads make MP4.
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];

/** Switch off a sound-maker, whatever state it's in. */
const shut = (ctx) => { try { ctx?.close?.()?.catch?.(() => {}); } catch {} };

export class Mic {
  /**
   * Make one straight from a tap, before anything is waited for: the meter's
   * sound has to be switched on from a tap (iPads insist).
   */
  constructor(){
    const AC = window.AudioContext || window.webkitAudioContext;
    try { this.ctx = AC ? new AC() : null; this.ctx?.resume?.()?.catch?.(() => {}); } catch { this.ctx = null; }
    this.stream = null;
    this.rec = null;
    this.chunks = [];
    this.t0 = 0;
    this.lvl = 0;
    this.closed = false;
  }

  /** Ask for the microphone. Resolves once it's on; rejects with the browser's reason if it can't be. */
  async open(){
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err){ this.close(); throw err; }
    if (this.closed){ this.close(); throw new DOMException('closed', 'AbortError'); }
    try {
      this.an = this.ctx.createAnalyser();
      this.an.fftSize = 1024;
      this.ctx.createMediaStreamSource(this.stream).connect(this.an);
      this.buf = new Float32Array(this.an.fftSize);
    } catch { this.an = null; }
  }

  /** How loud it is now, from 0 to 1 — up fast and down slowly, like a real meter. */
  level(){
    if (!this.an) return 0;
    this.an.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) sum += v * v;
    this.lvl = Math.max(Math.min(1, Math.sqrt(sum / this.buf.length) * 6), this.lvl * 0.85);
    return this.lvl;
  }

  get recording(){ return !!this.rec && this.rec.state === 'recording'; }
  elapsed(){ return this.t0 ? (performance.now() - this.t0) / 1000 : 0; }

  /** Start recording (the microphone must be open). */
  start(){
    const mime = TYPES.find(t => window.MediaRecorder.isTypeSupported?.(t)) || '';
    let rec;
    try { rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined); }
    catch { rec = new MediaRecorder(this.stream); }
    this.chunks = [];
    rec.ondataavailable = (e) => { if (e.data?.size) this.chunks.push(e.data); };
    this.stopped = new Promise((resolve) => { rec.onstop = resolve; });
    this.mime = mime;
    this.rec = rec;
    this.t0 = performance.now();
    rec.start(1000);
  }

  /**
   * Stop, let go of the microphone, and hand over what was recorded:
   * { data: ArrayBuffer, mime, secs } — or null if nothing was.
   */
  async stop(){
    const rec = this.rec;
    const secs = this.elapsed();
    if (!rec){ this.close(); return null; }
    if (rec.state !== 'inactive'){ try { rec.stop(); } catch {} }
    // stopping hands over the last of the sound, and then says it has stopped
    await Promise.race([this.stopped, new Promise(r => setTimeout(r, 4000))]);
    this.close();
    if (!this.chunks.length) return null;
    const blob = new Blob(this.chunks, { type: rec.mimeType || this.mime || this.chunks[0].type || 'audio/webm' });
    return { data: await new Response(blob).arrayBuffer(), mime: blob.type, secs: Math.max(0.1, Math.round(secs * 10) / 10) };
  }

  /** Let go of the microphone (and its light goes off), keeping nothing that isn't already stopped. */
  close(){
    this.closed = true;
    try { if (this.rec && this.rec.state !== 'inactive') this.rec.stop(); } catch {}
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    shut(this.ctx);
    this.ctx = null;
    this.an = null;
  }
}

/** Say kindly why the microphone wouldn't come on. */
export function micTrouble(err){
  const name = err?.name || '';
  const msg = name === 'NotAllowedError' || name === 'SecurityError'
    ? "<p>Milbil Books isn't allowed to use the microphone. To record, let this page use the microphone — the browser asks, or it's in the browser's settings — and then tap 🔴 Record again.</p>"
    : name === 'NotFoundError' || name === 'OverconstrainedError'
      ? "<p>There doesn't seem to be a microphone to record with.</p>"
      : "<p>The microphone wouldn't start. Try again in a moment.</p>";
  card(`<h3>🎙️ Can't hear you</h3>${msg}`, [{ label: 'OK', cls: 'go' }]);
  sfx('nope');
}
