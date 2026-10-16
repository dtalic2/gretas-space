// ---------- Recording from the microphone ----------
//
// MediaRecorder records in whatever format the browser likes best (WebM in
// Chrome, MP4 in Safari, Ogg in Firefox). We don't ask for a particular one:
// recordings are only ever played back in the browser that made them, and a
// browser can always play its own favourite format.
//
// While recording, an AnalyserNode listens too, so the screen can show how
// loud it is. It has its own little AudioContext that's closed afterwards,
// and the microphone is switched off the moment recording stops, so phones go
// back to playing through the loudspeaker rather than the earpiece.

import { setSession } from './player.js';

export class MicError extends Error {
  constructor(kind){ super(kind); this.kind = kind; }
}

export async function startRecording(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    throw new MicError(window.isSecureContext === false ? 'insecure' : 'unsupported');
  }

  setSession('play-and-record');
  let stream;
  try {
    // Turn off the phone-call clean-up so music, animals and whistles come
    // through as they are. Quiet recordings get turned up when played.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (err) {
    setSession('playback');
    const name = err && err.name;
    throw new MicError(
      name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' :
      name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nomic' :
      name === 'NotReadableError' || name === 'AbortError' ? 'busy' : 'other');
  }

  const stopTracks = () => stream.getTracks().forEach(t => t.stop());

  let rec;
  try { rec = new MediaRecorder(stream); }
  catch { stopTracks(); setSession('playback'); throw new MicError('unsupported'); }

  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(resolve => { rec.onstop = resolve; });

  let meterCtx = null, analyser = null, samples = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    meterCtx = new AC();
    if (meterCtx.state !== 'running') meterCtx.resume().catch(() => {});
    analyser = meterCtx.createAnalyser();
    analyser.fftSize = 1024;
    samples = new Uint8Array(analyser.fftSize);
    meterCtx.createMediaStreamSource(stream).connect(analyser);
  } catch { analyser = null; }

  rec.start();
  const started = performance.now();

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    stopTracks();
    if (meterCtx) meterCtx.close().catch(() => {});
    setSession('playback');
  };

  return {
    // Seconds since recording started.
    elapsed: () => (performance.now() - started) / 1000,

    // How loud it is right now, from 0 to about 1.
    level(){
      if (!analyser) return 0;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) { const v = (samples[i] - 128) / 128; sum += v * v; }
      return Math.min(1, Math.sqrt(sum / samples.length) * 3.2);
    },

    // Stops and gives back the recording: { data: ArrayBuffer, mime, secs }.
    async finish(){
      const secs = (performance.now() - started) / 1000;
      if (rec.state !== 'inactive') rec.stop();
      await stopped;
      release();
      const mime = rec.mimeType || (chunks[0] && chunks[0].type) || '';
      const blob = new Blob(chunks, { type: mime });
      const data = await readBlob(blob);
      return { data, mime, secs };
    },

    cancel(){
      try { if (rec.state !== 'inactive') rec.stop(); } catch {}
      release();
    },
  };
}

function readBlob(blob){
  if (blob.arrayBuffer) return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(blob);
  });
}
