// ---------- M-I-L-B-I-L Lunchbox Simulator ----------
//
// One lunchbox a day. The morning (whose box, what they want, what the shops
// are charging), the packing, the report card at lunchtime, and choosing who
// to pack for tomorrow. The marking itself is in box.js.

import {
  FOODS, FOOD, GROUPS, GROUP, BRANDS, BRAND, MILBILS, MILBIL, JUDGES, KIT, STICKERS,
  STICKER_SLOTS, STICKER_TIP, MAX_POINTS, MAX_HEALTH, NAMES, COLORS, HATS, NAME_MAX,
  STREAK_TIP, STREAK_MAX, HEALTHY, SUPER_HEALTHY, MIX, TAGS,
  wishMatch, wishText, askText,
} from './data.js';
import {
  S, load, save, wipe, you, unlocked, friend, fmt, canPack, kitNeeded,
  market, offersFor, priceAt, today, startDay, purse, putIn, takeOut, freeSlot, packedCount,
} from './state.js';
import { boxHTML, boxMiniHTML, scoreBox, itemHealth, healthOf, healthLabel, mixGoal } from './box.js';
import { drawLook } from './milbil.js';
import { foodSVG } from './food.js';
import { $, esc, toast, floatText, Sheet, card, sfx, setSound } from './ui.js';

load();
setSound(S.sound);
const sheet = new Sheet($('#sheet'));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const stars = (n) => '⭐'.repeat(n) + '✩'.repeat(3 - n);
const pct = (n) => `${n > 0 ? '+' : ''}${Math.round(n * 100)}%`;

/** A milbil's picture: Greta's drawing if there is one, otherwise drawn here. */
const picOf = (m, cls = '') => m.art
  ? `<img class="milbil art ${cls}" src="${m.art}" alt="${esc(m.name)}" draggable="false">`
  : drawLook(m.look, { cls, title: m.name });

const hearts = (n) => `<span class="hearts h${n >= 4 ? 'g' : n >= 2 ? 'a' : 'r'}" title="How healthy it is: ${n} out of ${MAX_HEALTH}">${'♥'.repeat(n)}<span class="empty">${'♡'.repeat(MAX_HEALTH - n)}</span></span>`;
const markClass = (n) => n >= 9 ? 'm10' : n >= 6 ? 'm7' : n >= 3 ? 'm4' : 'm0';

/**
 * Half a main, a quarter fruit or veg, a quarter sweet — how far along you are.
 * The target shown is for the whole box, so you can see what you're aiming at
 * before you've packed a thing.
 */
function mixChips(items, spaces, short = false){
  const goal = mixGoal(spaces);
  const packed = items.filter(Boolean);
  return MIX.map(m => {
    const have = packed.filter(it => m.groups.includes(FOOD[it.food]?.group)).length;
    return `<span class="chip ${have >= goal[m.id] ? 'ok' : ''}">${m.icon}${short ? '' : ` ${m.name}`}<i><b>${have}</b>/${goal[m.id]}</i></span>`;
  }).join('');
}

/** Can anything you're allowed to pack today satisfy this wish? */
const reachable = (wish) => FOODS.some(f => canPack(f) && wishMatch(wish, { food: f.id, brand:'billys' }));
const askReachable = (ask) => ask.kind ? true : reachable(ask.what);

// ================================================================= welcome ===

function showWelcome(){
  const w = $('#welcome');
  w.hidden = false;
  const draw = () => { $('#welcomeMilbil').innerHTML = drawLook(you(), { title:'You' }); };
  $('#swatches').innerHTML = COLORS.map(c =>
    `<button type="button" class="swatch" data-c="${c}" style="background:${c}" aria-label="Colour"></button>`).join('');
  $('#hats').innerHTML = HATS.map(h =>
    `<button type="button" class="hat-btn" data-h="${h.id}">${h.name}</button>`).join('');
  const marks = () => {
    for (const b of w.querySelectorAll('.swatch')) b.classList.toggle('on', b.dataset.c === S.color);
    for (const b of w.querySelectorAll('.hat-btn')) b.classList.toggle('on', b.dataset.h === S.hat);
  };
  $('#swatches').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    S.color = b.dataset.c; sfx('tap'); marks(); draw();
  });
  $('#hats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    S.hat = b.dataset.h; sfx('tap'); marks(); draw();
  });
  const input = $('#nameInput');
  input.value = S.name || pick(NAMES);
  $('#nameDice').addEventListener('click', () => { input.value = pick(NAMES); sfx('tap'); });
  $('#startBtn').addEventListener('click', () => {
    const name = input.value.trim().slice(0, NAME_MAX);
    if (!name){ input.focus(); return toast('Pop a name in first 🙂'); }
    S.name = name;
    S.started = true;
    save();
    sfx('cheer');
    w.hidden = true;
    begin();
  });
  marks();
  draw();
}

// ==================================================================== HUD ===

function renderHud(){
  $('#meAvatar').innerHTML = drawLook(you(), { title: S.name });
  $('#meName').textContent = S.name || 'You';
  $('#meDay').textContent = `Day ${S.day}`;
  $('#coins').textContent = fmt(S.coins);
  $('#points').textContent = fmt(S.points);
  const kitLeft = KIT.filter(k => !S.kit.includes(k.id) && k.cost <= S.coins).length;
  const stLeft = STICKERS.filter(k => !S.stickers.includes(k.id) && k.cost <= S.coins).length;
  $('#kitBadge').textContent = kitLeft || '';
  $('#stickerBadge').textContent = stLeft || '';
}

function bumpPill(sel){
  const el = $(sel);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// ============================================================== the note ===

function renderNote(){
  const t = today();
  const m = MILBIL[t.milbil];
  const f = friend(m.id);
  const lines = [];
  if (m.allergy) lines.push(`<li class="allergy"><i>🚫</i><span>Never, ever any <b>${TAGS[m.allergy] ?? m.allergy}</b>!</span></li>`);
  for (const w of m.loves){
    const need = !reachable(w);
    lines.push(`<li class="love ${need ? 'locked' : ''}"><i>💖</i><span>I love ${wishText(w)}${need ? ' <small>🔒 you can\'t pack that yet</small>' : ''}</span></li>`);
  }
  for (const w of m.hates) lines.push(`<li class="hate"><i>🙅</i><span>No ${wishText(w)}, please</span></li>`);
  lines.push(`<li class="ask"><i>🎯</i><span>Today: ${askText(t.ask)}</span></li>`);

  const streak = S.streak > 1 ? ` · ${S.streak} days in a row` : '';
  $('#noteCard').innerHTML = `
    <div class="who">
      <span class="who-pic">${picOf(m)}</span>
      <span class="who-txt">
        <b>${esc(m.name)}</b>
        <small>${boxMiniHTML(m)} ${m.box.spaces} spaces${streak}${f.days ? ` · packed ${f.days}×` : ''}</small>
      </span>
    </div>
    <div class="note">
      <h3>📝 Their note</h3>
      <ul>${lines.join('')}</ul>
      <p class="blurb">${esc(m.blurb)}</p>
    </div>`;
}

// ========================================================== the lunchbox ===

function renderPack(popSlot = -1){
  const t = today();
  const m = MILBIL[t.milbil];
  const p = purse();
  const h = healthOf(t.items);
  // An empty box isn't unhealthy, it's just empty.
  const lab = t.items.some(Boolean) ? healthLabel(h) : { icon:'🎒', text:'empty' };
  $('#packCard').innerHTML = `
    <div class="pack-top">
      <span>💰 Lunch money <b>${fmt(p.left)}</b>${p.over ? ` <span class="over">(−${fmt(p.over)} of yours)</span>` : ''}</span>
      <span>${lab.icon} ${t.items.some(Boolean) ? `<b>${h}</b>/100` : 'nothing in it yet'}</span>
    </div>
    ${boxHTML(m, t.items, { stickers: S.wearing, tappable: true })}
    <div class="mix-goal">
      <small>Milbils like about <b>half a main</b>, <b>a quarter fruit or veg</b> and <b>a quarter sweet</b>:</small>
      <div class="chips">${mixChips(t.items, m.box.spaces)}</div>
    </div>
    <p class="muted" style="font-size:12.5px;text-align:center">Tap something in the box to put it back and get the money back.</p>`;
  $(`#packCard .slot[data-slot="${popSlot}"]`)?.classList.add('pop');
  $('#packCard').querySelector('.box-tray').addEventListener('click', (e) => {
    const b = e.target.closest('button.slot');
    if (!b) return;
    const slot = +b.dataset.slot;
    const it = today().items[slot];
    if (!it) return;
    takeOut(slot);
    sfx('unpack');
    floatText(b, `+${fmt(it.paid)}`);
    refresh();
  });
}

// ============================================================== the shops ===

let tab = 'all';

function renderShop(){
  const t = today();
  const mk = market();
  const full = packedCount() >= MILBIL[t.milbil].box.spaces;
  const p = purse();
  const allergen = MILBIL[t.milbil].allergy;   // flagged in red on the shelf

  const brands = mk.shops.map(s => `
    <div class="brand-card" style="background:${s.brand.color}">
      <b>${s.brand.icon} ${esc(s.brand.name)}</b>
      <small>${esc(s.brand.slogan)}</small>
      <span class="deal">🏷️ ${esc(s.line)}</span>
    </div>`).join('');

  const tabs = [{ id:'all', label:'Everything' }, ...GROUPS.map(g => ({ id:g.id, label:`${g.icon} ${g.name}` }))]
    .map(x => `<button type="button" data-tab="${x.id}" class="${x.id === tab ? 'on' : ''}">${x.label}</button>`).join('');

  // The note again, shrunk down, so it stays in sight all the way down the
  // shelf — there's no use remembering the prices if you forget the wishes.
  const m = MILBIL[t.milbil];
  const wishes = [
    ...(m.allergy ? [`<b class="danger">🚫 no ${TAGS[m.allergy]}</b>`] : []),
    ...m.loves.map(w => `💖 ${wishText(w)}`),
    ...m.hates.map(w => `🙅 ${wishText(w)}`),
    `<b>🎯 ${askText(t.ask)}</b>`,
  ].map(x => `<span>${x}</span>`).join('');

  const list = FOODS.filter(f => tab === 'all' || f.group === tab);
  const shelf = list.map(f => {
    const need = kitNeeded(f);
    const offers = offersFor(f.id);
    const best = offers[0]?.price;
    const buys = BRANDS.map(b => {
      const o = offers.find(x => x.brand.id === b.id);
      if (!o) return `<button class="buy" disabled style="background:#bdb6c8">—<small>${esc(b.name)}</small></button>`;
      const poor = o.price > p.can;
      const dh = b.health > 0 ? ' ♥+' : b.health < 0 ? ' ♥−' : '';
      return `<button type="button" class="buy ${o.price === best ? 'best' : ''} ${o.deal ? 'deal' : ''}"
        style="background:${b.color}" data-food="${f.id}" data-brand="${b.id}"
        ${need || full || poor ? 'disabled' : ''}>${fmt(o.price)}<small>${esc(b.name)}${dh}</small></button>`;
    }).join('');
    return `<div class="item ${need ? 'cant' : ''}">
      ${foodSVG(f.id)}
      <div>
        <div class="item-name">${esc(f.name)}</div>
        <div class="item-sub">${GROUP[f.group].icon} ${GROUP[f.group].name.toLowerCase()}${f.tags.length ? ' · ' + f.tags.map(t =>
          t === allergen ? `<b class="danger">🚫 ${TAGS[t]}</b>` : TAGS[t]).join(', ') : ''} ${hearts(f.health)}</div>
        <div class="buys">${buys}</div>
        ${need ? `<div class="locked-note">🔒 You need the ${need.icon} ${esc(need.name)} to pack this</div>` : ''}
      </div>
    </div>`;
  }).join('');

  $('#shopCard').innerHTML = `
    <h2>🛍️ Three shops, one lunchbox</h2>
    <div class="brands">${brands}</div>
    <div class="shop-sticky">
      <div class="wishes">${wishes}</div>
      <div class="tabs">${tabs}</div>
    </div>
    <div class="shelf">${shelf}</div>`;

  $('#shopCard').querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    sfx('tap');
    const keep = $('#shopCard').getBoundingClientRect().top;
    renderShop();
    // Changing shelf keeps the shop where it was rather than jumping.
    if (keep < 0) $('#shopCard').scrollIntoView();
  });
  $('#shopCard').querySelector('.shelf').addEventListener('click', (e) => {
    const b = e.target.closest('.buy');
    if (!b || b.disabled) return;
    buy(b, b.dataset.food, b.dataset.brand);
  });
}

function buy(btn, foodId, brandId){
  const slot = freeSlot();
  if (slot < 0){ sfx('nope'); return toast('The box is full! Tap something in it to take it out 👆'); }
  const price = priceAt(foodId, brandId);
  if (price > purse().can){ sfx('nope'); return toast('Not enough money for that one 💸'); }
  const target = $(`#packCard .slot[data-slot="${slot}"]`);
  flyTo(btn, target, foodSVG(foodId));
  putIn(slot, foodId, brandId);
  sfx('pack');
  setTimeout(() => refresh(slot), 240);
}

/**
 * After a purchase only the buy buttons change, so grey them out where they
 * stand instead of redrawing thirty-odd food pictures.
 */
function updateShop(){
  const full = packedCount() >= MILBIL[today().milbil].box.spaces;
  const can = purse().can;
  for (const b of document.querySelectorAll('#shopCard .buy[data-food]')){
    const f = FOOD[b.dataset.food];
    b.disabled = !!kitNeeded(f) || full || (priceAt(b.dataset.food, b.dataset.brand) ?? Infinity) > can;
  }
}

/** The food hops from the shop shelf into its compartment. */
function flyTo(fromEl, toEl, html){
  if (!toEl) return;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'flyer';
  f.innerHTML = html;
  f.style.left = `${a.left + a.width / 2}px`;
  f.style.top = `${a.top + a.height / 2}px`;
  f.style.transition = 'transform .26s cubic-bezier(.3,.9,.4,1), opacity .26s';
  document.body.appendChild(f);
  requestAnimationFrame(() => {
    f.style.transform = `translate(calc(-50% + ${b.left + b.width / 2 - a.left - a.width / 2}px), calc(-50% + ${b.top + b.height / 2 - a.top - a.height / 2}px)) scale(1.1)`;
    f.style.opacity = '.2';
  });
  setTimeout(() => f.remove(), 300);
}

// ============================================================ bottom bar ===

function renderBar(){
  const t = today();
  const m = MILBIL[t.milbil];
  const p = purse();
  const n = packedCount();
  const money = p.over
    ? `<span class="over">💰 <b>−${fmt(p.over)}</b> of your own</span>`
    : `💰 <b>${fmt(p.left)}</b> left`;
  $('#barMoney').innerHTML = `${money} · 🎒 ${n}/${m.box.spaces}
    <span class="chips">${mixChips(t.items, m.box.spaces, true)}</span>`;
  const lid = $('#lidBtn');
  lid.disabled = n === 0;
  lid.textContent = n === 0 ? '🎒 Pack something first' : '🎒 Close the lid';
}

function refresh(popSlot = -1){
  renderHud();
  renderPack(popSlot);
  updateShop();
  renderBar();
}

// ============================================================ report card ===

function closeLid(){
  const t = today();
  if (!packedCount()) return;
  const r = scoreBox(t, S);
  const m = MILBIL[t.milbil];
  const packed = { ...t, items: [...t.items] };   // the report reads this, not the save

  S.coins = Math.max(0, S.coins + r.coins);
  S.points += r.points;
  if (!r.allergy && r.health > S.bestHealth) S.bestHealth = r.health;
  const f = { ...friend(m.id) };
  f.days++;
  f.best = Math.max(f.best || 0, r.points);
  if (r.stars === 3) f.stars3 = (f.stars3 || 0) + 1;
  S.friends[m.id] = f;
  S.totals.packed++;
  S.totals.earned += Math.max(0, r.coins);
  if (r.points === MAX_POINTS) S.totals.perfect++;
  // Tomorrow starts here, so closing the game on the report card can't lose
  // the day's pay or let the same lunchbox be marked twice.
  S.day++;
  S.today = null;
  S.choosing = true;
  save();

  sfx(r.allergy ? 'oops' : r.stars === 3 ? 'cheer' : 'ding');
  showReport(r, m, packed);
}

function showReport(r, m, t){
  const judges = r.marks.map((mark, i) => `
    <div class="judge" style="animation-delay:${0.15 + i * 0.35}s">
      <span class="ic">${drawLook(mark.judge.look, { title: mark.judge.name })}</span>
      <div>
        <div class="judge-name">${mark.judge.icon} ${esc(mark.judge.name)}</div>
        <div class="judge-q">${esc(mark.judge.asks)}</div>
        <ul class="judge-notes">${mark.notes.map(n =>
          `<li class="${n.ok ? '' : 'no'}"><i>${n.ok ? '✓' : '✗'}</i><span>${n.text}</span></li>`).join('')}</ul>
      </div>
      <div class="judge-mark ${markClass(mark.score)}">${mark.score}<small>out of 10</small></div>
    </div>`).join('');

  const bonuses = r.extras.length ? `
    <div class="card">
      <h3>Extra on the tip</h3>
      <ul class="bonuses">${r.extras.map(e =>
        `<li class="${e.pct < 0 ? 'minus' : ''}"><span>${e.icon} ${esc(e.text)}</span><span>${pct(e.pct)}</span></li>`).join('')}</ul>
    </div>` : '';

  const till = `
    <div class="card till">
      <div><span>💰 ${esc(m.name)}'s lunch money</span><b>${fmt(t.money)}</b></div>
      <div><span>🛍️ Spent at the shops</span><b>−${fmt(t.spent)}</b></div>
      <div><span>${r.keepsChange ? '🪙 Change you keep' : '🙁 They wanted the change back'}</span><b>${fmt(r.change)}</b></div>
      <div><span>💝 Tip from ${esc(m.name)}</span><b>${fmt(r.tip)}</b></div>
      <div class="tot"><span>Today you made</span><b>${r.coins >= 0 ? '' : '−'}${fmt(Math.abs(r.coins))} 🪙</b></div>
    </div>`;

  $('#report').innerHTML = `<div class="inner">
    <h2>🔔 Lunchtime at Milbil School</h2>
    ${r.allergy ? `<div class="oops"><b>Oh no!</b><br>${esc(m.name)} found ${TAGS[r.allergy] ?? r.allergy} in there and
      brought the whole lunchbox home without opening it. No marks today.</div>` : ''}
    <div class="card" style="display:grid;justify-items:center;gap:8px">
      ${boxHTML(m, t.items, { stickers: S.wearing })}
      <div style="width:100%">
        <div style="display:flex;justify-content:space-between;font-size:14px">
          <span>${r.label.icon} ${r.label.text}</span><b>${r.health}/100</b></div>
        <div class="health-bar"><i style="width:${r.health}%"></i></div>
        ${r.record ? '<p style="text-align:center;font-weight:800;color:var(--gold-d)">🏆 Your healthiest lunchbox yet!</p>' : ''}
      </div>
    </div>
    ${judges}
    <div class="card score-big">
      <div class="stars">${stars(r.stars)}</div>
      <div class="total">${r.points}<small>/${MAX_POINTS}</small></div>
      <p>You walk home with <b>${r.points} point${r.points === 1 ? '' : 's'}</b>.</p>
    </div>
    ${bonuses}
    ${till}
    <button type="button" class="btn go big block" id="toTomorrow">Tomorrow ☀️</button>
  </div>`;
  $('#report').hidden = false;
  $('#report').scrollTop = 0;
  document.body.style.overflow = 'hidden';
  $('#toTomorrow').addEventListener('click', () => {
    sfx('tap');
    $('#report').hidden = true;
    showPickNext();
  });
}

// ========================================================== who's next? ===

function showPickNext(){
  const prev = MILBIL[S.milbil];
  const nextStreak = S.streak + 1;
  const tipNow = Math.min(nextStreak * STREAK_TIP, STREAK_MAX);
  const cards = MILBILS.map(m => {
    const open = unlocked(m.id);
    const f = friend(m.id);
    return `<button type="button" class="mb-card ${open ? '' : 'locked'} ${m.id === S.milbil ? 'on' : ''}"
      data-m="${m.id}" ${open ? '' : 'disabled'}>
      <span class="mb-pic">${picOf(m, open ? '' : 'hidden-milbil')}</span>
      <b>${open ? esc(m.name) : '🔒 ???'}</b>
      ${open ? `<small>${boxMiniHTML(m)} ${m.box.spaces} spaces</small><small>💰 ${fmt(m.money)} · 💝 ${fmt(m.tip)}</small>
                ${f.days ? `<small>packed ${f.days}×</small>` : ''}`
             : `<span class="cost">⭐ ${fmt(m.points)} points</span>`}
    </button>`;
  }).join('');

  $('#pickNext').innerHTML = `<div class="inner">
    <h2>☀️ Day ${S.day}</h2>
    <div class="stay">
      ${picOf(prev)}
      <div>
        <b>Pack for ${esc(prev.name)} again?</b>
        <p class="muted" style="font-size:13px">That would be ${nextStreak} days in a row — they'd add
          <b>${pct(tipNow)}</b> to the tip. Same lunchbox, same likes, same dislikes.</p>
        <button type="button" class="btn go" id="stayBtn" style="margin-top:8px">🤝 Stay with ${esc(prev.name)}</button>
      </div>
    </div>
    <h3 style="text-align:center">…or pack for somebody else</h3>
    <p class="muted" style="text-align:center;font-size:13px">A new milbil means a new lunchbox, new likes — and the days in a row start again.</p>
    <div class="milbil-grid">${cards}</div>
  </div>`;
  $('#pickNext').hidden = false;
  $('#pickNext').scrollTop = 0;
  document.body.style.overflow = 'hidden';

  $('#stayBtn').addEventListener('click', () => { S.streak++; goToDay(); });
  $('#pickNext').querySelector('.milbil-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b || b.disabled) return;
    if (b.dataset.m !== S.milbil) S.streak = 1; else S.streak++;
    S.milbil = b.dataset.m;
    goToDay();
  });
}

function goToDay(){
  sfx('bell');
  $('#pickNext').hidden = true;
  document.body.style.overflow = '';
  S.choosing = false;
  S.today = null;
  save();
  startDay();
  renderAll();
  window.scrollTo({ top: 0 });
}

// ================================================================ sheets ===

function openKit(){
  sfx('tap');
  sheet.show({
    key:'kit', icon:'🧰', title:'Your packing kit',
    sub:'Bought once, used in every lunchbox you pack.',
    render: () => KIT.map(k => {
      const own = S.kit.includes(k.id);
      return `<div class="row ${own ? 'own' : ''}">
        <span class="ic">${k.icon}</span>
        <div><b>${esc(k.name)}</b><small>${esc(k.text)}</small></div>
        ${own ? '<span class="tick">✓</span>'
              : `<button type="button" class="btn small gold" data-act="buy" data-id="${k.id}" ${S.coins < k.cost ? 'disabled' : ''}>🪙 ${fmt(k.cost)}</button>`}
      </div>`;
    }).join(''),
    onAct: (act, id) => {
      const k = KIT.find(x => x.id === id);
      if (!k || S.kit.includes(id) || S.coins < k.cost) return sfx('nope');
      S.coins -= k.cost;
      S.kit.push(id);
      save();
      sfx('buy');
      toast(`${k.icon} ${k.name} — in the bag!`);
      bumpPill('#coinPill');
      sheet.render();
      refresh();
    },
  });
}

function openStickers(){
  sfx('tap');
  sheet.show({
    key:'stickers', icon:'✨', title:'Stickers',
    sub: () => `Stick up to ${STICKER_SLOTS} on the lid. Each one you own adds ${pct(STICKER_TIP)} to every tip.`,
    render: () => STICKERS.map(s => {
      const own = S.stickers.includes(s.id);
      const on = S.wearing.includes(s.id);
      return `<div class="row ${own ? 'own' : ''}">
        <span class="ic">${s.emoji}</span>
        <div><b>${esc(s.name)}</b><small>${own ? (on ? 'On the lid' : 'In the drawer') : `Adds ${pct(STICKER_TIP)} to every tip`}</small></div>
        ${own ? `<button type="button" class="btn small ${on ? '' : 'go'}" data-act="wear" data-id="${s.id}">${on ? 'Take off' : 'Stick on'}</button>`
              : `<button type="button" class="btn small gold" data-act="buy" data-id="${s.id}" ${S.coins < s.cost ? 'disabled' : ''}>🪙 ${fmt(s.cost)}</button>`}
      </div>`;
    }).join(''),
    onAct: (act, id) => {
      const st = STICKERS.find(x => x.id === id);
      if (!st) return;
      if (act === 'buy'){
        if (S.stickers.includes(id) || S.coins < st.cost) return sfx('nope');
        S.coins -= st.cost;
        S.stickers.push(id);
        if (S.wearing.length < STICKER_SLOTS) S.wearing.push(id);
        sfx('buy');
        bumpPill('#coinPill');
      } else {
        if (S.wearing.includes(id)) S.wearing = S.wearing.filter(x => x !== id);
        else if (S.wearing.length >= STICKER_SLOTS){ sfx('nope'); return toast(`Only ${STICKER_SLOTS} fit on the lid — take one off first.`); }
        else S.wearing.push(id);
        sfx('tap');
      }
      save();
      sheet.render();
      refresh();
    },
  });
}

function openBook(){
  sfx('tap');
  sheet.show({
    key:'book', icon:'📖', title:'The milbils',
    sub:'Everyone at Milbil School, and exactly what they like.',
    render: () => MILBILS.map(m => {
      const open = unlocked(m.id);
      const f = friend(m.id);
      if (!open) return `<div class="row"><span class="ic">🔒</span>
        <div><b>???</b><small>Unlocks at ⭐ ${fmt(m.points)} points — you have ${fmt(S.points)}.</small></div></div>`;
      const likes = [
        ...m.loves.map(w => `💖 ${wishText(w)}`),
        ...m.hates.map(w => `🙅 ${wishText(w)}`),
        ...(m.allergy ? [`🚫 ${TAGS[m.allergy]}`] : []),
      ].join(' · ');
      return `<div class="row ${m.id === S.milbil ? 'own' : ''}">
        <span class="ic">${picOf(m)}</span>
        <div><b>${esc(m.name)} ${boxMiniHTML(m)}</b>
          <small>${likes}</small>
          <small>💰 ${fmt(m.money)} lunch money · 💝 ${fmt(m.tip)} tip · ${f.days ? `packed ${f.days}×, best ${f.best}/${MAX_POINTS}` : 'never packed'}</small></div>
      </div>`;
    }).join(''),
  });
}

function openJudges(){
  sfx('tap');
  sheet.show({
    key:'judges', icon:'👩‍⚖️', title:'The lunchtime judges',
    sub:`Three milbils, ten marks each, so ${MAX_POINTS} points at most.`,
    render: () => JUDGES.map(j => `<div class="row">
      <span class="ic">${drawLook(j.look, { title: j.name })}</span>
      <div><b>${j.icon} ${esc(j.name)} — ${esc(j.asks)}</b><small>${esc(j.blurb)}</small></div>
    </div>`).join('') + `
    <div class="row"><span class="ic">🏅</span><div><b>Your record</b>
      <small>Lunchboxes packed: ${fmt(S.totals.packed)} · Full marks: ${fmt(S.totals.perfect)}
      · Healthiest ever: ${S.bestHealth}/100 · Coins earned: ${fmt(S.totals.earned)}</small></div></div>`,
  });
}

function openHelp(){
  sfx('tap');
  sheet.show({
    key:'help', icon:'❓', title:'How to play',
    sub:'One lunchbox a day.',
    render: () => [
      ['📝', 'Read the note', 'Every morning a milbil hands you their lunchbox, their lunch money and a note. The note never changes — only the one thing they ask for that day.'],
      ['🛍️', 'Shop around', "Bill's, Billy's and Lebelibs all sell the same food at different prices, and the prices move every single day. Look for the BEST badge and the 🏷️ half-price deals."],
      ['🏷️', "Cheap isn't always best", "Bill's food is less healthy and milbils can tell. Lebelibs costs nearly double but it's fresher, and some milbils only want the posh stuff."],
      ['🎒', 'Pack the box', 'Tap a price to buy it and drop it in. Tap anything in the box to put it back and get the money back.'],
      ['🍱', 'Get the mix right', 'Whoever it is for, a milbil wants about half a main, about a quarter fruit or veg and about a quarter something sweet. The little 🥪 🍎 🍪 counters under the box show how far along you are. Snacks and drinks fill no counter, so too many of them spoil the mix.'],
      ['👩‍⚖️', 'Three judges', `Munch, Nurse Pip and Tidy each mark the box out of ten, so you walk home with up to ${MAX_POINTS} points. Points are what unlock new milbils.`],
      ['🪙', 'Keep the change', "Whatever lunch money you didn't spend is yours, as long as the lunchbox earned at least one star. Plus a tip from the milbil."],
      ['🤝', 'Stay or swap', 'Pack for the same milbil again and their tip grows every day. Swap and you get a different lunchbox, different likes, and the run starts again.'],
    ].map(([ic, t, s]) => `<div class="row"><span class="ic">${ic}</span><div><b>${t}</b><small>${s}</small></div></div>`).join(''),
  });
}

function openSettings(){
  sfx('tap');
  sheet.show({
    key:'set', icon:'⚙️', title:'Settings',
    sub:`Day ${S.day} · ${fmt(S.points)} points`,
    render: () => `
      <div class="row"><span class="ic">🔊</span><div><b>Sound</b><small>Taps, tills and the lunch bell.</small></div>
        <button type="button" class="btn small ${S.sound ? 'go' : ''}" data-act="sound">${S.sound ? 'On' : 'Off'}</button></div>
      <div class="row"><span class="ic">🎨</span><div><b>Change how you look</b><small>Your name, colour and hat.</small></div>
        <button type="button" class="btn small" data-act="look">Change</button></div>
      <div class="row"><span class="ic">🗑️</span><div><b>Start again</b><small>Back to day 1 with no coins and no points. You keep your name and colour.</small></div>
        <button type="button" class="btn small red" data-act="wipe">Start again</button></div>`,
    onAct: async (act) => {
      if (act === 'sound'){ S.sound = !S.sound; setSound(S.sound); save(); sfx('tap'); return sheet.render(); }
      if (act === 'look'){ sheet.close(); S.started = false; save(); return location.reload(); }
      if (act === 'wipe'){
        const yes = await card('<h2>Start again?</h2><p>Day 1, no coins, no points, and every milbil but the first three locked away again.</p>',
          [{ label:'No, keep going', cls:'' }, { label:'Yes, start again', cls:'red', value:'yes' }]);
        if (yes !== 'yes') return;
        sheet.close();
        wipe();
        begin();
        toast('A brand new term 🎒');
      }
    },
  });
}

// ================================================================= start ===

function renderAll(){
  renderHud();
  renderNote();
  renderPack();
  renderShop();
  renderBar();
}

/** The sticky shop strip sits just under the header, whatever height it is. */
function measureHud(){
  document.documentElement.style.setProperty('--hud-h', `${$('.hud').offsetHeight}px`);
}
addEventListener('resize', measureHud);

function begin(){
  measureHud();
  if (S.choosing) return showPickNext();   // came back mid-choice
  today();
  renderAll();
  document.body.style.overflow = '';
}

$('#lidBtn').addEventListener('click', closeLid);
$('#barMoney').addEventListener('click', () => $('#packCard').scrollIntoView({ behavior:'smooth', block:'center' }));
$('#meBtn').addEventListener('click', openSettings);
$('#kitBtn').addEventListener('click', openKit);
$('#stickerBtn').addEventListener('click', openStickers);
$('#bookBtn').addEventListener('click', openBook);
$('#judgeBtn').addEventListener('click', openJudges);
$('#helpBtn').addEventListener('click', openHelp);
$('#setBtn').addEventListener('click', openSettings);
addEventListener('beforeunload', save);

if (S.started) begin();
else showWelcome();
