# 🏰 Middle Island

Shipwrecked on a wild island in the Middle Ages. Gather, build houses, survive
the nights, and grow a village until you can raise a castle.

A storm throws your ship onto the rocks. You crawl up the sand with an axe and a
few loaves of bread. The island has thick woods, a stony hill with iron at the
top, berry bushes round a flat meadow, and wolves that come out after dark.

**▶ Play it: https://dtalic2.github.io/gretas-space/middle-island-3d/**

---

## Your character

Before you land, you make your castaway. Choose a name, Lord or Lady, and a
skin tone, then a hairstyle (short, long, ponytail, braids, curly or bald) and
hair colour. Add a beard if you like, and something on your head: a hood, a
straw hat, a feather cap or a helmet. Then pick colours for your tunic,
trousers and cape. 🎲 picks everything at random. The **crown** unlocks once
you build the Castle Keep. Press <kbd>C</kbd> or tap 👤 to change your look at
any time. The choices are in [`js/looks.js`](js/looks.js).

## The loop

1. **Gather.** Hold <kbd>E</kbd> by a tree (🪵 wood), a rock (🪨 stone), an orange-flecked
   rock on the hilltop (🔩 iron), a berry bush or the ripples by the shore (🍞 food).
   Trees fall over, rocks crumble, and everything grows back after a while.
2. **Build.** Press <kbd>B</kbd>, pick a building, walk to where you want it (a green
   ghost shows the spot; <kbd>R</kbd> turns it), press <kbd>E</kbd> to place it, then hold
   <kbd>E</kbd> to hammer. It rises out of the ground as you work. Anything standing
   in the way is cleared, and you keep the wood or stone.
3. **Survive.** Hunger goes down all the time, and you eat on your own when you
   have food. At night your warmth drops unless you're by a fire or a house.
   Wolves prowl in the dark. They won't go into firelight, and a swing
   (<kbd>Space</kbd>) sends them off. Sleep in a hut or cottage to skip to morning.
4. **Grow a village.** Each Timber Cottage brings two settlers. They walk about
   the village, gather wood and stone for you, bring in ripe wheat, help hammer
   new buildings, and eat a little each day.

| | Cost | What it does |
|---|---|---|
| 🔥 Campfire | 4 wood | Warmth and light; wolves keep away |
| 🕯️ Torch Post | 2 wood | A little light for a path |
| 🛖 Straw Hut | 12 wood | Sleep through the night |
| 🌾 Wheat Farm | 8 wood, 2 food | Grows wheat to harvest for bread |
| 🏡 Timber Cottage | 20 wood, 12 stone | Half-timbered, two storeys. +2 settlers |
| 🪣 Stone Well | 14 stone, 4 wood | Drink to heal; farms grow faster |
| ⚒️ Blacksmith | 18 wood, 18 stone, 4 iron | Forge an iron axe, pickaxe, sword and net |
| 🌬️ Windmill | 24 wood, 16 stone | Sails turn; more bread per harvest |
| 🗼 Watchtower | 20 wood, 10 stone | A big fire up high; wolves stay well away |
| ⛪ Chapel | 20 wood, 36 stone, 2 iron | Bell tower and stained glass. +2 settlers |
| 🏰 Castle Keep | 60 wood, 80 stone, 15 iron | Four towers and flags. You win! |

The parchment banner at the top always says what to do next, and the little
arrow under it points the way.

## Controls

| | Keyboard | Touch |
|---|---|---|
| Walk | <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows | left stick |
| Run | hold <kbd>Shift</kbd> | **RUN** |
| Look, zoom | drag · scroll | drag · pinch |
| Gather, build, use | hold <kbd>E</kbd> | hold **E** |
| Fight wolves | <kbd>Space</kbd> | ⚔️ |
| Build menu | <kbd>B</kbd> | 🔨 |
| Turn a building | <kbd>R</kbd> | ⟳ |
| Change your look | <kbd>C</kbd> | 👤 |
| Help | <kbd>H</kbd> | ❔ |

## Running it

Nothing to install and nothing to build. It's plain ES modules plus one copy of
three.js, but it has to be served over HTTP:

```bash
python3 middle-island-3d/serve.py
```

That prints a `localhost` address, plus a LAN address you can open on a phone
on the same Wi-Fi.

## How it is put together

There are no model, texture or sound files. The island comes from one height
function. Every house, tree, wolf and sheep is built from boxes, cones and
cylinders with flat shading. All the sound, including the little lute tune, is
made from oscillators and filtered noise.

| File | What lives there |
|---|---|
| [`js/econ.js`](js/econ.js) | **Every balance decision:** costs, yields, day length, hunger, wolves. Imports nothing, so it reads as the design document. |
| [`js/terrain.js`](js/terrain.js) | The single `height(x, z)`, the island mesh, the sea and its foam line. |
| [`js/models.js`](js/models.js) | Every building, tree and creature, built from primitives, plus `mergeStatic()`, which folds a finished building into about a dozen draw calls. |
| [`js/world.js`](js/world.js) | Resource nodes, placing buildings, construction (a clipping plane climbs the building as you hammer), lights, warmth, collisions. |
| [`js/creatures.js`](js/creatures.js) | Wolves, sheep, and the settlers walking round the village. |
| [`js/sky.js`](js/sky.js) | Sun, moon, stars, clouds, and the day/night palette. |
| [`js/quests.js`](js/quests.js) | The steps from shipwreck to castle, and where the arrow points for each one. |
| [`js/looks.js`](js/looks.js) | The character creator's options: colours, hairstyles, beards and hats. |
| [`js/player.js`](js/player.js) | You, your tools, and the camera. |
| [`js/state.js`](js/state.js) | The save: one plain object in `localStorage`. |
| [`js/ui.js`](js/ui.js) | All the DOM. Knows nothing about three.js. |
| [`js/main.js`](js/main.js) | Renderer, clock and the rules that tie it together. |

Progress saves itself every few seconds. **❔ → Start a new island** wipes it.

Debugging: `__mi` is on `window`. `__mi.state.t = 0.8` jumps to nightfall,
`__mi.state.res.wood = 999` is exactly what it looks like, and `__mi.sim(30)`
runs thirty seconds of game without drawing.
