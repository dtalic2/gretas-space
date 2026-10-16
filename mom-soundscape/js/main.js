// ---------- Mom Soundscape: the board of sound buttons, recording, naming ----------

import { MAX_SECS, MIN_SECS, MAX_NAME, COLORS, EMOJIS, VOICES, VOICE_BY_ID, NAME_IDEAS } from './data.js';
import * as store from './store.js';
import * as player from './player.js';
import { startRecording } from './recorder.js';

const $ = id => document.getElementById(id);

const sounds = [];            // in the order they're shown
const padEls = new Map();     // sound id -> its button
const playing = new Map();    // sound id -> what's playing it
let editing = false;          // "Change" mode: tapping a button opens it
let canKeep = true;           // false if this browser won't store anything
let draft = null;             // the sound in the name sheet, before it's saved
let preview = null;           // the name sheet's button playing
let recState = null;          // null, 'waiting', 'recording', 'finishing' or 'error'
let recording = null;         // the recording in progress

// --------------------------------------------------------------- helpers

function span(cls, text){
  const el = document.createElement('span');
  el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

const byId = id => sounds.find(s => s.id === id);
const newId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pick = list => list[Math.floor(Math.random() * list.length)];
const clock = secs => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

function isLight(hex){
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72;
}

function toast(text, { good = false, ms = 3200 } = {}){
  const el = document.createElement('div');
  el.className = 'toast' + (good ? ' good' : '');
  el.textContent = text;
  $('toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
}

function cantKeep(){
  if (!canKeep) return;
  canKeep = false;
  toast("This browser won't keep your sounds after you close it, but they'll work until then.", { ms: 6000 });
}

// Two taps to do something you can't undo: the first changes the label.
function confirmTap(btn, ask, then){
  if (btn.dataset.armed) { disarm(btn); then(); return; }
  btn.dataset.label = btn.textContent;
  btn.dataset.armed = '1';
  btn.textContent = ask;
  btn.classList.add('armed');
  clearTimeout(btn._disarm);
  btn._disarm = setTimeout(() => disarm(btn), 3000);
}
function disarm(btn){
  clearTimeout(btn._disarm);
  btn.classList.remove('armed');
  if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.label; }
}

// -------------------------------------------------------------- the board

// Fills a button with a sound's look: colour, picture, name, and little
// badges for its voice and looping.
function paintPad(btn, look){
  btn.style.setProperty('--c', look.color);
  btn.classList.toggle('light', isLight(look.color));
  btn.textContent = '';
  const badges = span('pad-badges');
  if (look.voice !== 'normal') badges.append(span('badge', VOICE_BY_ID[look.voice].emoji));
  if (look.loop) badges.append(span('badge', '🔁'));
  btn.append(span('pad-fill'), span('pad-emoji', look.emoji), span('pad-name', look.name), badges);
}

function renderPads(){
  const box = $('pads');
  box.textContent = '';
  padEls.clear();
  sounds.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pad';
    paintPad(b, s);
    b.setAttribute('aria-label', s.name);
    b.append(span('pad-edit', '✏️'));
    if (i < 10) b.append(span('pad-key', String((i + 1) % 10)));
    if (playing.has(s.id)) b.classList.add('playing');
    b.addEventListener('click', () => tapPad(s.id));
    box.append(b);
    padEls.set(s.id, b);
  });
  $('empty').hidden = sounds.length > 0;
  $('editBtn').hidden = sounds.length === 0;
  if (!sounds.length && editing) setEditing(false);
}

function setEditing(on){
  editing = on;
  document.body.classList.toggle('editing', on);
  $('editLabel').textContent = on ? 'Done' : 'Change';
  $('editNote').hidden = !on;
  if (on) stopAll();
}

async function tapPad(id){
  const s = byId(id);
  if (!s) return;
  if (editing) { openEdit(s); return; }
  player.wake();
  const now = playing.get(id);
  if (now) { now.stop(); return; }

  const b = padEls.get(id);
  if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }

  let prep;
  try { prep = await player.prepare(s.id, s.audio, s.mime); }
  catch { toast("That sound won't play. Try recording it again."); return; }
  if (playing.has(id) || !byId(id) || editing || draft) return;   // things changed while it was getting ready

  let pb = null, over = false;
  pb = player.play(prep, {
    voice: s.voice, loop: s.loop,
    onEnd(){
      over = true;
      if (pb && playing.get(id) === pb) { playing.delete(id); showPlaying(id, false); }
    },
  });
  if (over) return;
  playing.set(id, pb);
  showPlaying(id, true);
}

function showPlaying(id, on){
  const b = padEls.get(id);
  if (b) {
    b.classList.toggle('playing', on);
    if (!on) b.style.removeProperty('--p');
  }
  $('stopAll').hidden = playing.size === 0;
  if (on) tick();
}

function stopSound(id){
  const pb = playing.get(id);
  if (pb) pb.stop();
}

function stopAll(){
  [...playing.values()].forEach(pb => pb.stop());
}

// Moves the coloured fill across every button that's playing.
let ticking = 0;
function tick(){
  if (ticking) return;
  const step = () => {
    for (const [id, pb] of playing) {
      const b = padEls.get(id);
      if (b) b.style.setProperty('--p', pb.progress().toFixed(4));
    }
    if (preview) $('preview').style.setProperty('--p', preview.progress().toFixed(4));
    ticking = playing.size || preview ? requestAnimationFrame(step) : 0;
  };
  ticking = requestAnimationFrame(step);
}

// ----------------------------------------------------------- recording

function openRec(){
  $('recSheet').hidden = false;
  $('nameSheet').hidden = true;
  document.documentElement.classList.add('sheet-open');
}

function closeRec(){
  recState = null;
  $('recSheet').hidden = true;
  if (draft) $('nameSheet').hidden = false;
  else document.documentElement.classList.remove('sheet-open');
}

function showRec(state, title, sub){
  recState = state;
  const card = $('recSheet').firstElementChild;
  card.dataset.state = state;
  $('recTitle').textContent = title;
  $('recSub').textContent = sub;
  $('recStop').hidden = state === 'error';
  $('recStop').disabled = state !== 'recording';
  $('recCancel').textContent = state === 'error' ? 'OK' : 'Cancel';
  $('recCancel').hidden = state === 'finishing';
}

const MIC_TROUBLE = {
  denied: "The microphone isn't allowed. Tap the 🔒 or ⓘ next to the web address, allow the microphone, then try again.",
  nomic: "We couldn't find a microphone. If one's plugged in, check it's switched on.",
  busy: 'Another app is using the microphone. Close it and try again.',
  insecure: 'Recording only works on a secure (https) page.',
  unsupported: "This browser can't record sounds. Try Safari or Chrome.",
  other: "The microphone didn't start. Try again.",
};

async function beginRecording(){
  if (recState) return;
  stopAll();
  stopPreview();
  player.wake();
  openRec();
  showRec('waiting', 'Getting the microphone…', 'If it asks, tap Allow.');
  $('recTime').textContent = '0:00';
  $('recMax').textContent = '/ ' + clock(MAX_SECS);
  levels.length = 0;
  drawWave(0);

  let r;
  try { r = await startRecording(); }
  catch (err) {
    if (recState !== 'waiting') return;
    showRec('error', "Can't use the microphone", MIC_TROUBLE[err.kind] || MIC_TROUBLE.other);
    return;
  }
  if (recState !== 'waiting') { r.cancel(); return; }   // cancelled while it was asking
  recording = r;
  showRec('recording', 'Recording…', draft && draft.id ? 'Make the new sound now!' : 'Make your sound now!');
  meter();
}

// Keeps a short history of how loud it's been and draws it as bars that
// scroll from right to left.
const levels = [];
let lastBar = 0;
function meter(){
  const r = recording;
  if (!r || recState !== 'recording') return;
  const t = r.elapsed();
  const lv = r.level();
  const now = performance.now();
  if (now - lastBar > 45) { levels.push(lv); lastBar = now; if (levels.length > 200) levels.shift(); }
  $('recDot').style.setProperty('--lv', lv.toFixed(3));
  $('recTime').textContent = clock(t);
  drawWave(lv);
  if (t >= MAX_SECS) { stopRecording(); return; }
  requestAnimationFrame(meter);
}

function drawWave(){
  const cv = $('wave');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const step = 9, bw = 6;
  const count = Math.floor(w / step);
  g.fillStyle = '#ff4f8b';
  for (let i = 0; i < count; i++) {
    const lv = levels[levels.length - count + i];
    const bh = Math.max(bw, (lv || 0) * h * 0.95);
    const x = i * step + (w - count * step) / 2;
    g.globalAlpha = lv == null ? 0.18 : 0.45 + 0.55 * Math.min(1, lv * 1.5);
    roundBar(g, x, (h - bh) / 2, bw, bh);
  }
  g.globalAlpha = 1;
}

function roundBar(g, x, y, w, h){
  const r = w / 2;
  g.beginPath();
  g.moveTo(x, y + r);
  g.arc(x + r, y + r, r, Math.PI, 0);
  g.lineTo(x + w, y + h - r);
  g.arc(x + r, y + h - r, r, 0, Math.PI);
  g.closePath();
  g.fill();
}

async function stopRecording(){
  if (recState !== 'recording') return;
  const r = recording;
  recording = null;
  showRec('finishing', 'Getting it ready…', '');

  let out;
  try { out = await r.finish(); }
  catch { showRec('error', "That recording didn't work", 'Please try again.'); return; }
  if (out.secs < MIN_SECS || !out.data.byteLength) {
    closeRec();
    toast('That was too short! Tap Record, make your sound, then tap Stop.', { ms: 4000 });
    return;
  }

  const prep = await player.build(out.data, out.mime);
  const fresh = {
    data: out.data, mime: out.mime, secs: prep.kind === 'buffer' ? prep.secs : out.secs,
    prep: Promise.resolve(prep), quiet: prep.quiet, newAudio: true,
  };
  if (draft) {
    // "Record again": the new sound keeps the name and look chosen so far.
    if (draft.newAudio) draft.prep.then(player.release);
    Object.assign(draft, fresh);
  } else {
    draft = {
      id: null, name: '', fallback: `Sound ${sounds.length + 1}`,
      emoji: pick(EMOJIS), color: COLORS[sounds.length % COLORS.length],
      voice: 'normal', loop: false, ...fresh,
    };
    $('nameInput').value = '';
    $('nameInput').placeholder = `Type a name, like “${NAME_IDEAS[sounds.length % NAME_IDEAS.length]}”`;
  }
  closeRec();
  showSheet();
}

function cancelRecording(){
  if (recState === 'finishing') return;
  if (recording) { recording.cancel(); recording = null; }
  closeRec();
}

// -------------------------------------------------- naming and changing

function buildPickers(){
  const colors = $('colorPicks');
  COLORS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.setProperty('--c', c);
    b.dataset.v = c;
    b.setAttribute('aria-label', 'Colour');
    b.addEventListener('click', () => { draft.color = c; renderSheet(); });
    colors.append(b);
  });

  const emojis = $('emojiPicks');
  EMOJIS.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emoji';
    b.textContent = e;
    b.dataset.v = e;
    b.addEventListener('click', () => { draft.emoji = e; renderSheet(); });
    emojis.append(b);
  });

  const voices = $('voicePicks');
  VOICES.forEach(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'voice';
    b.dataset.v = v.id;
    b.append(span('voice-ico', v.emoji), span('voice-name', v.name));
    b.addEventListener('click', () => {
      draft.voice = v.id;
      renderSheet();
      playPreview(true);   // hear what it sounds like straight away
    });
    voices.append(b);
  });

  $('nameInput').maxLength = MAX_NAME;
}

function showSheet(){
  document.documentElement.classList.add('sheet-open');
  $('nameSheet').hidden = false;
  $('nameSheet').scrollTop = 0;
  ['dropBtn', 'delBtn'].forEach(id => disarm($(id)));
  renderSheet();
}

function closeSheet(){
  stopPreview();
  draft = null;
  $('nameSheet').hidden = true;
  document.documentElement.classList.remove('sheet-open');
  $('nameInput').blur();
}

// What the sound will be called if it's saved now.
function draftName(){
  return (draft.name.trim() || draft.fallback).slice(0, MAX_NAME);
}

function renderSheet(){
  const d = draft;
  if (!d) return;
  $('nameTitle').textContent = d.id ? 'Change this sound' : 'Name your sound';
  paintPad($('preview'), { ...d, name: draftName() });

  for (const b of $('colorPicks').children) b.classList.toggle('on', b.dataset.v === d.color);
  for (const b of $('emojiPicks').children) b.classList.toggle('on', b.dataset.v === d.emoji);
  for (const b of $('voicePicks').children) b.classList.toggle('on', b.dataset.v === d.voice);
  $('loopBtn').setAttribute('aria-pressed', String(d.loop));
  $('loopBtn').classList.toggle('on', d.loop);
  $('quietNote').hidden = !d.quiet;

  if (!$('dropBtn').dataset.armed) $('dropBtn').textContent = d.id ? 'Cancel' : 'Throw away';
  $('editExtras').hidden = !d.id;
  if (d.id) {
    const i = sounds.findIndex(s => s.id === d.id);
    $('moveEarlier').disabled = i <= 0;
    $('moveLater').disabled = i < 0 || i >= sounds.length - 1;
  }
}

function openEdit(s){
  stopAll();
  draft = {
    id: s.id, name: s.name, fallback: s.name, emoji: s.emoji, color: s.color, voice: s.voice, loop: s.loop,
    data: s.audio, mime: s.mime, secs: s.secs, quiet: false, newAudio: false,
    prep: player.prepare(s.id, s.audio, s.mime),
  };
  $('nameInput').value = s.name;
  $('nameInput').placeholder = s.name;
  showSheet();
}

async function playPreview(restart){
  player.wake();
  if (preview) {
    preview.stop();
    if (!restart) return;
  }
  const d = draft;
  let prep;
  try { prep = await d.prep; } catch { toast("That sound won't play. Try recording it again."); return; }
  if (draft !== d || preview) return;
  let pb = null, over = false;
  pb = player.play(prep, {
    voice: d.voice, loop: d.loop,
    onEnd(){
      over = true;
      if (preview === pb) { preview = null; $('preview').classList.remove('playing'); $('preview').style.removeProperty('--p'); }
    },
  });
  if (over) return;
  preview = pb;
  $('preview').classList.add('playing');
  tick();
}

function stopPreview(){
  if (preview) preview.stop();
}

async function saveDraft(){
  const d = draft;
  if (!d) return;
  stopPreview();
  const look = { name: draftName(), emoji: d.emoji, color: d.color, voice: d.voice, loop: d.loop };

  let s;
  if (d.id) {
    s = byId(d.id);
    if (!s) { closeSheet(); return; }
    stopSound(s.id);
    Object.assign(s, look);
    if (d.newAudio) {
      Object.assign(s, { audio: d.data, mime: d.mime, secs: d.secs });
      player.adopt(s.id, await d.prep);
    }
  } else {
    s = {
      id: newId(), ...look,
      order: sounds.reduce((m, x) => Math.max(m, x.order), 0) + 1,
      created: Date.now(), mime: d.mime, secs: d.secs, audio: d.data,
    };
    sounds.push(s);
    player.adopt(s.id, await d.prep);
  }

  draft = null;
  closeSheet();
  renderPads();
  const b = padEls.get(s.id);
  if (b) {
    b.classList.add('new');
    setTimeout(() => b.classList.remove('new'), 900);
    b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  if (!d.id) toast(`“${s.name}” is ready. Tap it to hear it!`, { good: true });

  if (canKeep) store.put(s).then(store.keepForever, cantKeep);
}

function dropDraft(){
  const d = draft;
  if (!d) return;
  if (d.id) {
    if (d.newAudio) d.prep.then(player.release);
    closeSheet();
    return;
  }
  confirmTap($('dropBtn'), 'Tap again to throw it away', () => {
    d.prep.then(player.release);
    closeSheet();
  });
}

function deleteDraft(){
  const d = draft;
  if (!d || !d.id) return;
  confirmTap($('delBtn'), 'Tap again to delete', () => {
    stopSound(d.id);
    if (d.newAudio) d.prep.then(player.release);
    const i = sounds.findIndex(s => s.id === d.id);
    if (i >= 0) sounds.splice(i, 1);
    player.forget(d.id);
    closeSheet();
    renderPads();
    if (canKeep) store.remove(d.id).catch(cantKeep);
  });
}

function moveDraft(by){
  const d = draft;
  const i = sounds.findIndex(s => s.id === d.id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= sounds.length) return;
  [sounds[i], sounds[j]] = [sounds[j], sounds[i]];
  sounds.forEach((s, k) => { s.order = k + 1; });
  renderPads();
  renderSheet();
  if (canKeep) store.putMany(sounds).catch(cantKeep);
}

const EXT = { webm: 'webm', mp4: 'm4a', 'x-m4a': 'm4a', aac: 'aac', ogg: 'ogg', wav: 'wav', mpeg: 'mp3' };

function downloadDraft(){
  const d = draft;
  if (!d) return;
  const sub = (d.mime.split(';')[0].split('/')[1] || '').toLowerCase();
  const name = (draftName().replace(/[\\/:*?"<>|]+/g, '').trim() || 'sound') + '.' + (EXT[sub] || sub || 'webm');
  const url = URL.createObjectURL(new Blob([d.data], { type: d.mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ------------------------------------------------------------ start-up

function wire(){
  $('recBtn').addEventListener('click', () => { if (editing) setEditing(false); beginRecording(); });
  $('recStop').addEventListener('click', stopRecording);
  $('recCancel').addEventListener('click', cancelRecording);
  $('stopAll').addEventListener('click', stopAll);
  $('editBtn').addEventListener('click', () => setEditing(!editing));

  $('preview').addEventListener('click', () => playPreview(false));
  $('nameInput').addEventListener('input', e => { draft.name = e.target.value; renderSheet(); });
  $('loopBtn').addEventListener('click', () => {
    draft.loop = !draft.loop;
    renderSheet();
    if (preview) playPreview(true);
  });
  $('saveBtn').addEventListener('click', saveDraft);
  $('againBtn').addEventListener('click', beginRecording);
  $('dropBtn').addEventListener('click', dropDraft);
  $('delBtn').addEventListener('click', deleteDraft);
  $('moveEarlier').addEventListener('click', () => moveDraft(-1));
  $('moveLater').addEventListener('click', () => moveDraft(1));
  $('dlBtn').addEventListener('click', downloadDraft);

  // Phones only allow sound after a touch, so wake it up on the first one.
  document.addEventListener('pointerdown', player.wake, { passive: true });

  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.tagName === 'INPUT') {
      if (e.key === 'Enter' || e.key === 'Escape') e.target.blur();
      return;
    }
    if (recState) {
      if (e.key === 'Escape') cancelRecording();
      else if ((e.key === ' ' || e.key === 'Enter') && recState === 'recording') { e.preventDefault(); stopRecording(); }
      return;
    }
    if (draft) {
      if (e.key === 'Escape' && draft.id) dropDraft();
      return;
    }
    if (e.key === 'Escape') { stopAll(); if (editing) setEditing(false); return; }
    if (/^[0-9]$/.test(e.key)) {
      const s = sounds[(Number(e.key) + 9) % 10];
      if (s) tapPad(s.id);
      return;
    }
    if (e.key === 'r' || e.key === 'R') beginRecording();
  });

  // A phone may switch the microphone off when you leave the page, so keep
  // what's been recorded so far.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && recState === 'recording') stopRecording();
  });
}

function tidy(rec){
  if (!rec || typeof rec.id !== 'string' || !(rec.audio instanceof ArrayBuffer)) return null;
  return {
    ...rec,
    name: String(rec.name || 'Sound').slice(0, MAX_NAME),
    emoji: typeof rec.emoji === 'string' && rec.emoji ? rec.emoji : '🎵',
    color: /^#[0-9a-f]{6}$/i.test(rec.color) ? rec.color : COLORS[0],
    voice: VOICE_BY_ID[rec.voice] ? rec.voice : 'normal',
    loop: !!rec.loop,
    mime: String(rec.mime || ''),
    order: Number(rec.order) || 0,
  };
}

async function start(){
  buildPickers();
  wire();
  player.setSession('playback');
  try {
    const list = await store.loadAll();
    list.map(tidy).filter(Boolean).forEach(s => sounds.push(s));
  } catch {
    cantKeep();
  }
  renderPads();
  // Get every sound ready now so the first tap plays straight away.
  sounds.forEach(s => player.prepare(s.id, s.audio, s.mime).catch(() => {}));

  window.SOUNDSCAPE = { sounds, playing };   // for poking at in the console
}

start();
