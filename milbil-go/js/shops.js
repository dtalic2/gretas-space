// ---------- The shops you walk to ----------
//
// Tap a shop on the map from anywhere to look inside, but you can only buy (or
// sell) once you're standing close enough. Every shelf is always full: in 3x3
// Garden the Magic Tree and the Animal Pen were the shelves you almost never
// saw stocked, so here nothing is ever out, and nothing needs a level.

import { CROPS, SEED_SHOP, MAGIC_SEEDS, CHARMS, ANIMALS, DECOR, TOOLS, OWN_TREE, SHOP_TYPES,
         PLOT_MAX, plotCost } from './data.js';
import { fmtNum, fmtTime } from './format.js';
import { esc, toast, floatText, sfx } from './ui.js';

export const shopBadge = (type, cls = '') => {
  const t = SHOP_TYPES[type];
  return `<span class="badge ${cls}" style="--c:${t.color};--d:${t.dark}">${t.emoji}</span>`;
};

const price = (G, cost) => Math.max(1, Math.round(cost * (1 - G.M().off)));
const coin = (n) => `🪙 ${fmtNum(n)}`;

let here = false;   // in reach of the open shop?

export function openShop(G, shop){
  const t = SHOP_TYPES[shop.type];
  const tabs = {
    magic: [{ id: 'seeds', label: '🌵 Rare seeds' }, { id: 'charms', label: '🔮 Charms' }, { id: 'sapling', label: '🌳 Sapling' }],
    carpenter: [{ id: 'soil', label: '🟫 Soil' }, { id: 'tools', label: '🪏 Tools' }, { id: 'decor', label: '🪑 Decor' }],
  }[shop.type];
  here = G.distTo(shop) <= G.M().reach;
  G.sheet.show({
    key: `shop:${shop.id}`, cls: `tall shop-${shop.type}`,
    icon: shopBadge(shop.type),
    title: esc(shop.name),
    sub: () => `${t.blurb} · ${coin(G.state.coins)}`,
    tabs,
    banner: () => banner(G, shop),
    render: (tab) => RENDER[shop.type](G, tab),
    onAct: (act, id, el) => act === 'help'
      ? null
      : here ? ACT[act]?.(G, id, el) : (sfx('nope'), toast(`🚶 Walk closer to ${esc(shop.name)} first`)),
  });
  G.sheet.cur.shop = shop;
}

/** Called every second while a shop is open: keep the distance honest. */
export function tickShop(G){
  const shop = G.sheet.cur?.shop;
  if (!shop) return;
  const now = G.distTo(shop) <= G.M().reach;
  if (now !== here && !G.sheet.pressing){
    here = now;
    if (now){ sfx('door'); toast(`✅ You're at ${esc(shop.name)}!`, 'good'); }
    G.sheet.render();
  } else G.sheet.setBanner(banner(G, shop));
}

function banner(G, shop){
  const d = G.distTo(shop), reach = G.M().reach;
  if (d <= reach) return `<div class="near">✅ You're here — ${shop.type === 'market' ? 'sell away!' : 'shop away!'}</div>`;
  return `<div class="far">🚶 ${fmtNum(Math.round(d))} m away. Walk ${fmtNum(Math.ceil(d - reach))} m closer to ${shop.type === 'market' ? 'sell' : 'buy'}.</div>`;
}

const btn = (G, act, id, cost, label = coin(cost), cls = '') =>
  `<button type="button" class="btn buy ${cls}" data-act="${act}" data-id="${id}" ${!here || G.state.coins < cost ? 'disabled' : ''}>${label}</button>`;

const row = (emoji, title, meta, buttons, cls = '') =>
  `<div class="row ${cls}"><span class="r-e">${emoji}</span><div class="r-t"><b>${title}</b><small>${meta}</small></div><div class="r-b">${buttons}</div></div>`;

function seedRows(G, ids){
  return ids.map(id => {
    const c = CROPS[id], p = price(G, c.cost), have = G.state.seeds[id] || 0;
    const meta = c.perennial
      ? `Tree · grows ${fmtTime(c.growSec)}, then fruit every ${fmtTime(c.regrowSec)} · fruit sells ${coin(c.sell)}`
      : `Grows ${fmtTime(c.growSec)} · sells ${coin(c.sell)}`;
    return row(c.emoji, esc(c.name), `${meta}${have ? ` · <i>you have ${fmtNum(have)}</i>` : ''}`,
      btn(G, 'seed', `${id}:1`, p) + btn(G, 'seed', `${id}:5`, p * 5, '×5', 'alt'));
  }).join('');
}

const RENDER = {
  seed: (G) => `<p class="note">Everything in the 3x3 Garden seed shop — buy anything you have the coins for.</p>${seedRows(G, SEED_SHOP)}`,

  magic: (G, tab) => {
    if (tab === 'charms'){
      return `<p class="note">Charms work forever, one of each. Always in stock here.</p>` +
        Object.entries(CHARMS).sort((a, b) => a[1].cost - b[1].cost).map(([id, c]) =>
          row(c.emoji, esc(c.name), esc(c.desc), G.state.charms[id] ? '<span class="own">✓ Active</span>' : btn(G, 'charm', id, price(G, c.cost)),
              G.state.charms[id] ? 'owned' : '')).join('');
    }
    if (tab === 'sapling'){
      const o = OWN_TREE;
      return `<p class="note">Plant your very own magic tree in your garden. It grows free seeds for you while you walk.</p>` +
        row(o.emoji, o.name, esc(o.desc), G.state.tree ? '<span class="own">✓ Planted</span>' : btn(G, 'sapling', 'x', price(G, o.cost)));
    }
    return `<p class="note">Rare seeds you'll never find in a seed shop. They take longer and sell for far more — and here they're <b>always</b> in stock.</p>${seedRows(G, MAGIC_SEEDS)}`;
  },

  animal: (G) => `<p class="note">Every animal lives in your garden and helps it along. All of them, always in stock.</p>` +
    Object.entries(ANIMALS).map(([id, a]) => {
      const n = G.state.animals[id] || 0;
      return row(a.emoji, `${esc(a.name)} <span class="cnt">${n}/${a.max}</span>`, esc(a.desc),
        n >= a.max ? '<span class="own">✓ Full</span>' : btn(G, 'animal', id, price(G, a.cost)), n >= a.max ? 'owned' : '');
    }).join(''),

  carpenter: (G, tab) => {
    const s = G.state;
    if (tab === 'tools'){
      return Object.entries(TOOLS).map(([id, t]) =>
        row(t.emoji, esc(t.name), esc(t.desc), s.tools[id] ? '<span class="own">✓ Owned</span>' : btn(G, 'tool', id, price(G, t.cost)),
            s.tools[id] ? 'owned' : '')).join('');
    }
    if (tab === 'decor'){
      return `<p class="note">Just for looks — they sit in your garden.</p>` + Object.entries(DECOR).map(([id, d]) =>
        row(d.emoji, esc(d.name), 'Decoration', s.decor[id] ? '<span class="own">✓ Placed</span>' : btn(G, 'decor', id, price(G, d.cost)),
            s.decor[id] ? 'owned' : '')).join('');
    }
    if (s.plotsOwned >= PLOT_MAX) return `<p class="note">Your garden is as big as it gets: all ${PLOT_MAX} plots! 🎉</p>`;
    const cost = Math.round(plotCost(s.plotsOwned) * (1 - G.M().plotOff));
    return `<p class="note">Your garden starts 3x3. Each extra plot of soil grows it toward 5x5.</p>` +
      row('🟫', `Soil plot <span class="cnt">${s.plotsOwned}/${PLOT_MAX}</span>`, 'One more square to plant in', btn(G, 'plot', 'x', cost));
  },

  market: (G) => {
    const m = G.M();
    const items = Object.entries(G.state.basket).filter(([, n]) => n > 0)
      .map(([id, n]) => ({ id, n, c: CROPS[id], each: Math.round(CROPS[id].sell * m.sell) }))
      .sort((a, b) => b.each * b.n - a.each * a.n);
    if (!items.length) return `<p class="note big">Your basket is empty. Pick ✨ ripe crops in your 🌱 garden, then bring them here to sell.</p>`;
    const total = items.reduce((t, x) => t + x.each * x.n, 0);
    return `<button type="button" class="btn go wide" data-act="sellall" data-id="x" ${here ? '' : 'disabled'}>Sell everything · ${coin(total)}</button>
      ${m.sell > 1 ? `<p class="note">Your sale bonus: ×${m.sell.toFixed(2)}</p>` : ''}` +
      items.map(x => row(x.c.emoji, `${esc(x.c.name)} <span class="cnt">×${fmtNum(x.n)}</span>`, `${coin(x.each)} each`,
        `<button type="button" class="btn buy" data-act="sell" data-id="${x.id}" ${here ? '' : 'disabled'}>Sell · ${coin(x.each * x.n)}</button>`)).join('');
  },
};

function pay(G, cost, el){
  if (G.state.coins < cost){ sfx('nope'); toast('Not enough coins yet'); return false; }
  G.state.coins -= cost;
  floatText(el, `−${fmtNum(cost)} 🪙`);
  sfx('buy');
  return true;
}
const after = (G) => { G.changed(); G.sheet.render(); };

const ACT = {
  seed(G, id, el){
    const [cid, q] = id.split(':');
    const n = +q || 1;
    if (!pay(G, price(G, CROPS[cid].cost) * n, el)) return;
    G.state.seeds[cid] = (G.state.seeds[cid] || 0) + n;
    if (!(G.state.seeds[G.state.selSeed] > 0)) G.state.selSeed = cid;
    after(G);
  },
  charm(G, id, el){
    if (G.state.charms[id] || !pay(G, price(G, CHARMS[id].cost), el)) return;
    G.state.charms[id] = true;
    toast(`${CHARMS[id].emoji} ${esc(CHARMS[id].name)}: ${esc(CHARMS[id].desc)}`, 'good');
    after(G);
  },
  sapling(G, id, el){
    if (G.state.tree || !pay(G, price(G, OWN_TREE.cost), el)) return;
    G.state.tree = { last: Date.now(), stock: [] };
    toast('🌳 Your Magic Sapling is planted in your garden!', 'good');
    after(G);
  },
  animal(G, id, el){
    const a = ANIMALS[id], n = G.state.animals[id] || 0;
    if (n >= a.max || !pay(G, price(G, a.cost), el)) return;
    G.state.animals[id] = n + 1;
    toast(`${a.emoji} A ${esc(a.name)} moved into your garden!`, 'good');
    after(G);
  },
  plot(G, id, el){
    const s = G.state;
    if (s.plotsOwned >= PLOT_MAX) return;
    if (!pay(G, Math.round(plotCost(s.plotsOwned) * (1 - G.M().plotOff)), el)) return;
    s.plotsOwned++;
    toast(`🟫 New soil! Your garden has ${s.plotsOwned} plots.`, 'good');
    after(G);
  },
  tool(G, id, el){
    if (G.state.tools[id] || !pay(G, price(G, TOOLS[id].cost), el)) return;
    G.state.tools[id] = true;
    toast(`${TOOLS[id].emoji} ${esc(TOOLS[id].name)} — find it in your garden`, 'good');
    after(G);
  },
  decor(G, id, el){
    if (G.state.decor[id] || !pay(G, price(G, DECOR[id].cost), el)) return;
    G.state.decor[id] = true;
    after(G);
  },
  sell(G, id, el){ sell(G, [id], el); },
  sellall(G, id, el){ sell(G, Object.keys(G.state.basket), el); },
};

function sell(G, ids, el){
  const m = G.M();
  let total = 0, count = 0;
  for (const id of ids){
    const n = G.state.basket[id] || 0;
    if (!n || !CROPS[id]) continue;
    total += Math.round(CROPS[id].sell * m.sell) * n;
    count += n;
    delete G.state.basket[id];
  }
  if (!count) return;
  G.state.coins += total;
  G.state.stats.earned += total;
  floatText(el, `+${fmtNum(total)} 🪙`);
  sfx('coin');
  toast(`🧺 Sold ${fmtNum(count)} for 🪙 ${fmtNum(total)}`, 'good');
  after(G);
}
