# 3x3 Garden 3D

A fully 3D, browser-based gardening game inspired by the **3x3 Garden** game on
timestables.com. Walk a low-poly farmer around a garden in third person, and plant,
water and harvest a growing field of crops to build up a farm.

Built with **Three.js** (WebGL). No build step, no install, no dependencies to fetch —
the engine is vendored into `vendor/`, so the whole thing runs offline from a folder.

---

## Running it

It needs to be served over HTTP (ES modules won't load from `file://`).

```bash
python3 ~/Projects/3x3-garden-3d/serve.py
```

Then open <http://localhost:8123>.

`serve.py` is just `http.server` with no-cache headers added. That matters while you're
editing: browsers cache ES modules hard, so with a plain `python3 -m http.server` a change
to `js/data.js` often won't show up on reload and it looks like your edit did nothing.

For deployment any static host works — `npx serve`, nginx, GitHub Pages, S3. It is a plain
static site: upload the folder and it runs.

---

## How it plays

| Action | Desktop | Mobile |
| --- | --- | --- |
| Tend a plot / open a stall | **click it** (any distance) | **tap it** |
| Move | `W A S D` or arrows | on-screen stick |
| Look / orbit | drag | drag |
| Zoom | scroll wheel | pinch |
| Interact with what's targeted | `E` | ✋ button |
| Pick a seed | `Q` to cycle, `1`–`9`, or click | tap the hotbar |
| Dig up a plant | `G` or 🪏 | 🪏 |
| Your things | `B` or 🎒 | 🎒 |
| Settings | ⚙️ | ⚙️ |
| Close a panel | `Esc` | ✕ |

You start with **10 coins** and four carrot seeds — enough to get the first harvest in.

**You never have to walk to anything.** Point at a plot — anywhere on the bed, at any
distance — and it tells you what it is and exactly how grown its fruit is, as a percentage
floating over the plant. Click or tap to plant, water or harvest it. Stalls work the same
way: tap the Seed Shop from across the field and it opens.

Walking is still there if you want it. When you're stood next to something, that wins for
`E` — a cursor resting somewhere else on screen is passive and won't hijack the key. The
ring and the percentage still follow your cursor, so you can inspect a far plot while
standing elsewhere, and a click always acts on exactly what you clicked.

### Playing on a phone

**Getting it there.** `serve.py` listens on every interface and prints the address to type
on your phone — same Wi-Fi, no deployment, no account:

```
  On this Mac   http://localhost:8123

  On your phone (same Wi-Fi):
                http://192.168.x.x:8123
```

If the phone times out, macOS is firewalling Python: System Settings → Network → Firewall →
Options. Once it loads, **Add to Home Screen** installs it fullscreen — there's a web app
manifest and an icon, so it opens without browser chrome and looks like an app.

**How it feels there.** The layout switches on a coarse-pointer check, not just width, so a
narrow desktop window keeps the desktop UI instead of sprouting thumb-sized buttons. On a
phone you get an on-screen stick, a big ✋ button, 48px hit targets, a single-row top bar,
and safe-area insets so nothing hides under a notch or home indicator.

One finger orbits the camera, **two fingers pinch to zoom**, and a tap tends a plot. The
tap detector ignores anything that travelled more than 10px or involved a second finger, so
looking around and pinching never fire an action by accident. Tap-to-tend does most of the
work, which makes the stick optional.

### The loop

1. Pick a seed from the hotbar and click or tap a bare soil plot to plant it.
2. Crops get thirsty at 40% grown (💧 appears). Tap to water — that **doubles** growth
   speed for the rest of the crop. An un-watered crop doesn't die, it just crawls along
   at 35% speed.
3. When a crop sparkles (✨) tap it to harvest for coins.
4. Trees and vines are never harvested — you pick their fruit and the plant stays put,
   growing another crop on a much shorter cycle.
5. Spend coins on better seeds, more soil plots, animals that speed up the whole garden,
   charms, and decorations.

### The crops

**258 varieties.** The seed shop alone stocks 30. Levels come from lifetime earnings and
unlock a new variety at nearly every level, so there's usually something new to plant.

Prices climb **steeply**: each seed-shop tier costs roughly **2.4×** the one before it, and
each magic-tree tier about **2.6×**. Sell prices track cost at a steady ~2.8× (~2.6× for
rares), so the margin stays healthy while the numbers escalate fast.

| Crop | Unlocks | Cost | Sells | Grows in |
| --- | --- | --- | --- | --- |
| 🧅 Onion | L1 | 3 | 9 | 14s |
| 🥕 Carrot | L1 | 7 | 20 | 22s |
| 🧄 Garlic | L2 | 12 | 34 | 26s |
| 🥬 Lettuce | L2 | 17 | 48 | 32s |
| 🫘 Green Beans | L2 | 26 | 74 | 29s |
| 🍓 Strawberry | L3 | 42 | 118 | 45s |
| 🥔 Potato | L3 | 68 | 190 | 50s |
| 🫐 Blueberry | L4 | 65 | 185 | 54s |
| 🍅 Tomato | L4 | 100 | 280 | 62s |
| 🌾 Wheat | L4 | 130 | 365 | 58s |
| 🌽 Corn | L5 | 240 | 670 | 75s |
| 🫑 Bell Pepper | L5 | 390 | 1,090 | 80s |
| 🥦 Broccoli | L6 | 380 | 1,060 | 86s |
| 🌻 Sunflower | L6 | 580 | 1,600 | 95s |
| 🎃 Pumpkin | L7 | 1,400 | 3,900 | 120s |
| 🎋 Bamboo | L7 | 2,100 | 5,900 | 128s |
| 🥒 Cucumber | L8 | 2,200 | 6,100 | 136s |
| 🍆 Aubergine | L8 | 3,400 | 9,400 | 150s |
| 🍍 Pineapple | L9 | 8,200 | 22,500 | 180s |
| 🍈 Honeydew | L9 | 12,500 | 34,000 | 200s |
| 🍉 Watermelon | L10 | 20,000 | 55,000 | 250s |

**Perennials** are trees and vines. You never harvest the plant itself — it grows once,
holds its plot forever, and bears a fresh crop of fruit on a much shorter cycle. Water it
each time round.

| Perennial | Unlocks | Cost | Fruit sells | To maturity | Re-fruits every |
| --- | --- | --- | --- | --- | --- |
| 🍇 Grape Vine | L6 | 900 | 620 | 200s | 70s |
| 🍎 Apple Tree | L9 | 12,000 | 8,200 | 300s | 110s |
| 🍒 Cherry Tree | L11 | 34,000 | 24,000 | 320s | 120s |
| 🌰 Chestnut Tree | L11 | 48,000 | 34,000 | 330s | 125s |
| 🍊 Orange Tree | L12 | 60,000 | 42,000 | 340s | 130s |
| 🍋 Lemon Tree | L12 | 95,000 | 67,000 | 350s | 135s |
| 🥥 Coconut Palm | L13 | 150,000 | 105,000 | 380s | 145s |
| 🥭 Mango Tree | L14 | 400,000 | 280,000 | 400s | 150s |
| 🍐 Pear Tree | L15 | 900,000 | 640,000 | 420s | 160s |

Eleven more are sold only at the **Magic Tree** and never appear in the seed shop. They cost
more, take far longer, and pay far better:

| Rare crop | Unlocks | Cost | Sells | Grows in |
| --- | --- | --- | --- | --- |
| 🌵 Star Cactus | L3 | 2,000 | 5,200 | 150s |
| 🌸 Moonbloom | L4 | 5,600 | 14,600 | 185s |
| 🍄 Glow Cap | L5 | 15,600 | 40,000 | 200s |
| 🌈 Rainbow Chard | L6 | 43,000 | 112,000 | 240s |
| ⭐ Star Fruit | L7 | 120,000 | 310,000 | 260s |
| 🌶️ Ember Pepper | L8 | 330,000 | 860,000 | 290s |
| 💎 Crystal Bloom | L9 | 920,000 | 2,400,000 | 330s |
| 🍇 Void Grape | L10 | 2,600,000 | 6,800,000 | 380s |
| 🪷 Sun Lotus | L11 | 7,200,000 | 18,700,000 | 400s |
| ❄️ Frost Lily | L12 | 20,000,000 | 52,000,000 | 430s |
| 🌳 World Tree | L14 | 56,000,000 | 40,000,000 (perennial) | 420s |

Moonbloom, Glow Cap, Ember Pepper, Crystal Bloom, Sun Lotus, Frost Lily and the World Tree cast their own light, so a plot of them
is worth planting for the look alone.

Profit per second climbs hard up the tiers — an onion returns about 0.4 coins/sec, a
watermelon 140, a Void Grape about 1,680. Rares always out-earn the regular crop that
unlocks alongside them, but they cost roughly ten times as much up front.

### The mythic tiers

Beyond the Magic Tree sit two more places, and between them **120 further plants**. These
aren't hand-authored — 120 near-identical blocks would be unreadable — they're *generated*
from their index in [`js/data.js`](js/data.js). The hue walks the colour wheel by the golden
angle so no two neighbours look alike; shape, emoji and name parts advance on co-prime
strides so the combinations never fall into a visible pattern. All of them glow.

- **🌟 Super Magic Tree** (level 12) — **100 plants**, `Astral Bloom` through `Azure Fern`,
  150M up to 1.88T, each ~1.10x the last. Browsed 20 at a time across five tabs.
- **🌌 Enchanted Realm** (level 15) — **20 named seeds** past the gate, `Aetherbloom` to
  `Wyrmroot`, 5T up to 731T, each ~1.30x the last.
- **🐲 Dragon Cave** (level 17) — a firelit hollow with treasure spilling out of the mouth.
  **25 hoard-grade plants**, `Cinderseed` to `Ouroboros Fruit`, **4Q up to 19D**, each 6x
  the last.
- **🏰 Magic Mansion** (level 21) — a lamp-lit house west of the fence whose windows breathe
  as though someone were moving about inside. **60 house plants** — the widest catalogue in
  the game — `Parlour Fern` to `Nursery Palm`, **50D up to 7.98Spd**, each ~2.2x the last.
- **♾️ Infinity Void** (level 24) — a black sphere inside slowly turning rings, out east,
  with a galaxy of motes falling inward. **12 impossibilities**, `Null Seed` to
  `Infinity Flower`, **20Spd up to 977Nd**. Nothing in the game costs more.
- **🔮 Magic Market** — the Farmers Market's counterpart: one *rare* seed at 40% off,
  rotating every three minutes on the same clock-derived schedule.
- **💫 Super Magic Market** — the same again, drawing from the hundred mythic plants.

All three markets run through one shared implementation; they differ only in which
shelf they draw from.

Adding a tier is one `generateTier({...})` call — count, base cost, multiplier, margin and
grow range. Everything else picks it up.

### Big numbers

The economy runs well past a trillion, so figures are abbreviated on the short scale:

| | | | | | | |
| --- | --- | --- | --- | --- | --- | --- |
| **K** thousand | **M** million | **B** billion | **T** trillion | **Q** quadrillion | **Qu** quintillion | **S** sextillion |
| **Se** septillion | **O** octillion | **N** nonillion | **D** decillion | **Ud** undecillion | **Dd** duodecillion | **Td** tredecillion |
| **Qad** quattuordecillion | **Qid** quindecillion | **Sd** sexdecillion | **Spd** septendecillion | **Od** octodecillion | **Nd** novemdecillion | **V** vigintillion |

Precision shrinks as the leading figure grows (`5.5Q`, `88S`, `19D`, `7.98Spd`, `977Nd`) so
a price stays about four characters wide. The ladder runs past decillion because the
Mansion and the Void need it — the Dragon Cave alone already tops out at 19D.

These are doubles, not exact integers — JavaScript only counts precisely to about
9 quadrillion. Past that the last digits of a balance drift, which is invisible at four
significant figures. The only visible consequence is at the extreme: if you're sitting on
decillions, a 20-coin carrot genuinely won't move the counter. By then you're farming
things worth 10²⁸ apiece, so it doesn't come up in practice.

### Charms

**31 permanent upgrades**, one of each. Every one is a real hook rather than flavour text —
the effect fields in `CHARMS` are summed in one place in `main.js`, so adding a charm is a
data change and nothing else. Twelve distinct axes:

| Axis | What it does |
| --- | --- |
| `boost` | growth speed |
| `value` | multiplier on every sale |
| `luck` | double-harvest chance (capped at 90%) |
| `water` | seeds plant already watered |
| `seedSave` | chance a planting keeps its seed (capped 75%) |
| `thirstEase` | speed an un-watered crop keeps, instead of the 35% crawl |
| `regrow` | perennials re-fruit faster |
| `dealOff` | extra discount at all three markets (capped 75%) |
| `plotOff` | soil plots cheaper (capped 60%) |
| `digBack` | bigger shovel refund (capped 90%) |
| `treeSpeed` | your own tree restocks faster |
| `treeBatch` | extra free seeds per restock |

Twenty-six are sold at the **Magic Tree**, cheapest first — 🌫️ Morning Dew (1.2K) through
🏛️ Grand Deed (150M), taking in the Seed Pouch, Keen Sickle, Haggler's Badge, Sturdy Spade,
Bird Scarer, Compost Heap, Rain Cloud, Night Beacon, Land Deed, Woven Basket, Sand Timer,
Cornucopia, Green Thumb, Moon Calendar, Golden Scales, Four-Leaf Clover, Deep Spring and
Merchant's Ledger along the way.

**Five flagships are sold at their namesake**, each at the top of that shop's first page:

| Charm | Where | Cost | Effect |
| --- | --- | --- | --- |
| 🌟 Super Sapling Charm | Super Magic Tree (L12) | 3B | +100% growth, +50% sales |
| 🌌 Realm Sigil | Enchanted Realm (L15) | 200B | +150% growth, +100% sales, +10% luck |
| 🐲 Dragon Heart | Dragon Cave (L17) | 50Q | +300% growth, +200% sales, +15% luck, keeps 1 seed in 4 |
| 🗝️ Mansion Key | Magic Mansion (L21) | 800D | +500% growth, +400% sales, +20% luck, +3 tree gifts |
| ♾️ Void Shard | Infinity Void (L24) | 400Spd | +1000% growth, +900% sales, +25% luck, keeps 1 seed in 3 |

### Animals

Fifteen animals, on three distinct qualities rather than all being growth speed:

| Animal | Cost | Max | Quality |
| --- | --- | --- | --- |
| 🐇 Rabbit | 150 | 4 | +6% growth speed |
| 🐔 Chicken | 400 | 4 | +12% growth speed |
| 🦆 Duck | 700 | 4 | +5% on every sale |
| 🐝 Bee Hive | 1,200 | 4 | +8% on every sale |
| 🐐 Goat | 2,200 | 3 | +18% growth speed |
| 🐈 Cat | 4,500 | 2 | +3% chance of a double harvest |
| 🫏 Donkey | 2,500 | 2 | +25% growth speed |
| 🐕 Sheepdog | 9,000 | 3 | +5% chance of a double harvest |
| 🐑 Sheep | 11,000 | 3 | +30% growth speed |
| 🐄 Cow | 14,000 | 2 | +45% growth speed |
| 🦉 Owl | 85,000 | 2 | +12% on sales, +6% double harvest |
| 🦙 Llama | 38,000 | 2 | +20% on every sale |
| 🦚 Peacock | 260,000 | 2 | +35% on sales, +4% double harvest |
| 🦄 Unicorn | 9M (L13) | 1 | +60% growth, +60% sales, +8% double harvest |
| 🐉 Dragon | 900M (L17) | 1 | +100% growth, +50% sales, +10% double harvest |

Speed stacks with the charms; sale value multiplies every harvest; the double-harvest
chance adds to the Lucky Charm's and is capped at 90%. The Animal Pen and your inventory
both show the running totals — *"Growth ×2.00 · sales ×2.13 · 19% double harvest"*.

### Your things

Press **B** or the 🎒 button for an inventory of everything you own — every seed with its
count and what it's worth, which charms are active and your current growth multiplier, and
your animals, decorations, level and lifetime earnings.

### Settings

⚙️ picks the **animation style**, which changes how plants grow in and how much the world
moves around you:

| Style | Growth curve | Idle motion |
| --- | --- | --- |
| 🌊 Smooth | eased S-curve, no overshoot | gentle bob, normal ambience |
| 🤸 Bouncy | springs past full size (to ~1.11x) then settles | double bob, 1.45x ambience |
| 🍃 Calm | near-linear, no flourish | completely still, quarter ambience |

Calm doubles as a reduced-motion option. The sound toggle lives here too.

### Your own magic tree

For **1,000,000 coins** (level 10+) the Magic Tree sells you a **Magic Sapling**. It plants
itself west of the bed and from then on stocks **2–4 free seeds every two minutes** — no
coins, no questions. Gold baubles appear in its canopy, one per gift waiting, and the whole
tree brightens when there's something to collect. Tap it to take the lot.

Gifts are weighted by `1/√cost`, so cheap seeds are the everyday drop and something like a
Void Grape turns up rarely. Only things you've already unlocked can appear, so it never
hands you a seed you can't use.

Stock accrues while you're away and is **capped at 14 items** — enough that a break is
rewarded, not so much that a day off hands you hundreds of seeds. The restock clock keeps
its phase across reloads rather than resetting each time you open the game.

### Soil plots

The bed is 7x7 — **49 plots**. You start with the middle nine and buy the other **40** from
the carpenter, each costing about 1.75x the last: 2K for the tenth, rising to 6T for the
forty-ninth. Unclaimed plots are turfed over with a little "for sale" peg, and the bed
fills outward from the centre so it always looks deliberate.

### Tools

The carpenter's Tools tab sells four one-off items:

| Tool | Cost | Unlocks | What it does |
| --- | --- | --- | --- |
| 🪏 Shovel | 2,500 | L4 | dig up a plant you no longer want |
| 🚿 Sprinkler | 40,000 | L6 | water every thirsty plot at once |
| 🧺 Harvest Basket | 180,000 | L8 | harvest every ripe plot at once |
| 🌾 Seed Drill | 750,000 | L10 | sow the selected seed in every empty plot |

Own any of the last three and an **⚡ button** appears (or press **F**). One press runs
every step you have the tool for, in the order a person would work: **harvest, then sow,
then water** — harvesting first so the drill has empty plots to fill. It reports what it
did: *"⚡ harvested 20 · sowed 34 · watered 15"*. This is what makes a 49-plot garden
manageable by hand.

The **🪏 Shovel** works differently — it's a toggle. Turn it on (or press **G**) and tapping
a plant digs it up instead of tending it, handing back **half the seed price**.

It's a mode rather than a gesture, because tapping already plants, waters and harvests —
and a long-press or a modifier key wouldn't survive the jump between mouse and touch. The
button lights up while it's armed and the prompt changes to `🪏 Dig up Apple Tree · +6K
back`, so you can't dig by accident. The refund deliberately doesn't count toward lifetime
earnings, so clearing a plot can't push you up a level.

Mostly you'll want it for perennials, which otherwise hold their plot forever.

### Stations

- **🌱 Seed Shop** — buy seeds. New varieties unlock as you level up.
- **🐔 Animal Pen** — fifteen animals, and not all of them do the same thing.
- **🔨 Carpenter** — three tabs: **soil plots** to expand the bed, **tools**, and
  **twelve decorations** (scarecrow, toadstool ring, bench, lanterns, bird bath, pond,
  sundial, parasol, tractor, statue, marquee, grand fountain) that are purely cosmetic.
  Each has a reserved spot outside the bed, so they never land on top of each other.
- **🧺 Farmers Market** — one seed type is 40% off at a time, rotating every 3 minutes.
  The rotation is derived from the clock rather than stored, so it keeps turning while
  you're away and survives a reload. Consecutive rotations always land on a different
  seed, so the deal visibly changes.
- **🌳 Your Tree** — appears once you buy the Magic Sapling. Free seeds, no coins.
- **🔮 Magic Market** — a rotating 40%-off deal on one rare seed.
- **💫 Super Magic Market** — the same, on the hundred mythic plants (level 12).
- **🌟 Super Magic Tree** — 100 mythic plants (level 12).
- **🌌 Enchanted Realm** — 20 seeds beyond the gate (level 15).
- **🐲 Dragon Cave** — 25 hoard-grade plants (level 17).
- **🏰 Magic Mansion** — 60 house plants, the widest catalogue (level 21).
- **♾️ Infinity Void** — 12 final impossibilities (level 24).
- **✨ Magic Tree** — the rare-goods shop. Two tabs: eleven rare seeds you can't get
  anywhere else, and six permanent charms. The tree shudders and throws off sparks each
  time you buy something.

---

## How the growing works

Plants aren't swapped between a few fixed stages — each one is built **once** in its
mature form and then continuously animated from the plot's real growth progress, every
frame. Stand and watch a plot and you can see the fruit physically swelling.

Each moving piece of a plant registers a *part* with a window of the crop's life:

| Part | Window | What it does |
| --- | --- | --- |
| seedling | 0 → 5%, fades out by 38% | a mound and a shoot, so a fresh plot isn't bare |
| leafy base | 8% → 62% | pushes up out of the soil and fills out |
| the fruit | 42% → 100% | swells from nothing to full size |

Crops with `bush:false` — lettuce, sunflower, chard, the rares — have no generic base, so
their own geometry grows across almost the whole life (14% → 96%) instead.

Produce also **ripens in colour**: everything using the crop's body colour starts pale
green and drifts to its real colour from 55% onward, so a tomato reddens and a pumpkin
turns orange as it fills out. Growth is eased (smoothstep) at both ends, so nothing starts
or stops abruptly.

Because the speed is tied to each crop's `growSec`, a 14-second onion pops up briskly while
a watermelon's fruit takes well over two minutes to swell — slow enough to be ambient, fast
enough to notice if you stand still.

The whole thing costs well under a millisecond per frame for the whole bed, and it does
*less* work than the old approach because meshes are never rebuilt mid-life. Timings are
all in the `addPart` calls in [`js/crops.js`](js/crops.js).

## Day, night and rain

The garden runs a **four-minute day/night cycle** and gets a **shower once per cycle**,
lasting 42 seconds. Crops grow **20% faster while it's raining**, on top of watering rather
than instead of it — a watered crop in the rain runs at 2.0 × 1.2 = 2.4×.

Everything in [`js/sky.js`](js/sky.js) is a pure function of absolute epoch time, and
nothing about the weather is saved. That's deliberate: growth is derived from timestamps so
a garden keeps growing with the tab shut, and the weather has to be reconstructible for any
moment — past or future — or the two disagree the instant you come back.

### Why rain isn't a multiplier

The obvious implementation is to fold `1.2` into the global growth multiplier while it
rains. That's wrong here, and visibly so. Progress is computed as a function of
`now - planted`, so raising the multiplier rewrites the **entire history** of every crop:
the moment a shower starts, every plant in the garden jumps forward, and when it stops they
all snap backward.

Instead the *time axis* is warped. `growTime(t)` maps wall-clock to accumulated growth
time, where a millisecond of rain is worth 1.2, and growth is measured as the difference
between two points on that warped axis:

```js
growTime(t) = cycles × (DAY_MS + 0.2 × RAIN_MS) + into + 0.2 × wetSoFar
```

It's monotonic, so crops never run backwards; closed-form, so three days offline costs one
multiply rather than a thousand loop iterations; and exact, because past growth is already
baked into the earlier point and can't be retroactively changed.

The shower's *timing* varies per cycle (hashed from the cycle index, so it's deterministic
without being regular) but its *duration* is fixed — that's what keeps the closed form
available, since any whole cycle contributes exactly `RAIN_MS` of rain.

`isRaining()` deliberately keys off the same hard window that pays the bonus, while
`rainAt()` adds soft 4-second edges used only for fading the visuals in and out, so the HUD
can never claim a bonus the crops aren't getting.

Visually: sky, fog, sun colour, sun arc and hemisphere light blend across four palettes
(day → dusk → night, then washed grey by rain), lanterns brighten after dark, and rain is
1,100 recycled line-segment streaks kept centred on the camera.

## Other behaviour worth knowing

- **Offline growth.** Crops keep growing while the tab is closed, capped at 8 hours.
  Progress is computed closed-form from timestamps rather than ticked, so it's exact
  regardless of how long you were away.
- **Autosave** to `localStorage` every 5 seconds, plus on tab-hide and unload.
- **Reset:** open the browser console and run `GARDEN.wipe()`.

---

## Layout

```
serve.py            dev server (http.server + no-cache headers)
index.html          markup + import map
css/style.css       HUD, modals, responsive rules
js/main.js          bootstrap, game loop, interactions, economy
js/world.js         scene, terrain, stalls, magic tree, decor, ambience
js/player.js        character rig, movement, third-person orbit camera
js/garden.js        the plot grid: growth maths, fruit cycles, mesh swapping, particles
js/sky.js           day/night cycle + rain, as pure functions of the clock
js/crops.js         per-crop meshes + the continuous growth animation
js/ui.js            HUD, shops, toasts, WebAudio sound
js/save.js          persistence, offline time, levelling
js/data.js          crops, animals, decor, plots, tuning constants
js/format.js        compact number + time formatting (940 / 1.5K / 1.04M / 2.4B)
js/mathq.js         dormant — see below
vendor/three.module.js   Three.js r160 (MIT)
```

Tuning lives in [`js/data.js`](js/data.js) — crop prices, grow times, animal boosts,
level thresholds, market discount and rotation period, magic-tree cooldown. Changing the
game's balance shouldn't require touching any other file.

Adding a crop is two edits: an entry in `CROPS` (plus its unlock level in `SHOP_UNLOCKS`),
and a `case` in the `switch` in [`js/crops.js`](js/crops.js) that builds its ripe form.
Everything else — shop listing, hotbar, the growth animation, harvest, save — picks it up
automatically; you only ever model the finished plant.
Two optional flags are worth knowing: `scale` sizes the mature plant, and `bush:false`
suppresses the generic leaf bush for crops whose ripe form is the whole plant (lettuce,
sunflower, chard and the like) so they don't end up buried in foliage.

### The dormant question engine

This started life as a times-tables game where every action was gated by a multiplication
question. That's been removed — planting, watering and harvesting are now immediate.

[`js/mathq.js`](js/mathq.js) is left in place but is no longer imported anywhere. It's a
self-contained adaptive question engine: it tracks per-table skill as a moving average and
weights questions toward whichever tables the player keeps missing. Nothing else depends
on it, so it can be deleted outright — or re-wired if you ever want gated actions back,
including with a different subject, since the only contract it needs is
"ask a question, return whether it was right".

### Debug handle

`window.GARDEN` exposes `state`, `world`, `player`, `garden`, `ui`, plus:

- `GARDEN.step(frames)` — advance the simulation by hand (useful when `requestAnimationFrame`
  is throttled, e.g. in a background tab or an automated test).
- `GARDEN.wipe()` — clear the save and reload.

---

## Performance

~490 draw calls and ~24k triangles for the full scene with all decorations placed —
comfortable on integrated graphics and tablets. Grass is instanced; shadows are a single
2048² cascade from the sun.

With all 49 plots planted with glowing mythic crops it sits at ~424 draw calls and 24k
triangles. A fully decorated endgame garden — 49 leafy carrots, all twelve decorations and
sixteen animals — is the heaviest case at **1,169 draw calls and 44k triangles**; the empty
bed with the same decorations is 777, so the crops themselves are most of it. Still
comfortable on a desktop, and the obvious lever if a phone struggles is instancing the
fence and flowers.

**Crop lights are budgeted.** Many crops hang a `PointLight` on their fruit, and 49 of them
would be 49 dynamic lights — which a forward renderer really will not thank you for. Only
the six nearest the camera are lit at a time; the rest keep their emissive material, so
they still read as glowing, they just stop lighting their neighbours. Measured with a full
bed: 68 lights in the scene, 12 actually active.

If you ever need more headroom, the cheapest wins are instancing the fence posts and the
flower clusters, which together account for well over a hundred draw calls.

## Licence

Three.js is MIT (see the header in `vendor/three.module.js`). The game code is yours.
Gameplay is an original implementation inspired by timestables.com's 3x3 Garden; no
assets or code from that site are used.
