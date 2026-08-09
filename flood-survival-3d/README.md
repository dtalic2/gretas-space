# 🌊 High Water — Flood Survival 3D

Ten dollars, ten days of rain, and a valley that goes under.

You live on a shelf of high ground above a river that came over its banks on
Monday. Over ten days the water rises past the marsh, past the junk pile, past
the road, and finally past **Cedar Ridge — the highest natural ground in the
valley at 8.4 m**. The surge comes in at **10.9 m**. There is nowhere to simply
stand and wait it out.

You start with **$10**, which buys a bag of nails. So first you build a business.

**▶ Play it: https://dtalic2.github.io/gretas-space/flood-survival-3d/**

---

## The loop

1. **Gather.** Reeds, clay, scrap and driftwood are free — hold <kbd>E</kbd> at a
   site. Your satchel holds 16 and a full one slows you down.
2. **Sell.** At your stall, turn raw material into what the valley is desperate
   for: sandbags, buckets, paddles, reed capes, life rings, hand pumps.
   Neighbours walk up and buy — but only if something finished is on the shelf.
   Reinvest in a **Handcart** ($55), then a **Workshop** ($150): more benches,
   better prices, more customers.
3. **Build.** Buy timber from Marv's depot — a barge, so it floats and stays
   reachable all game — then hold <kbd>E</kbd> at one of two sites:

   | | Cost | You get |
   |---|---|---|
   | 🏠 **Raise the House** | ~$500 | Stilts → deck → walls → **roof platform at 13.0 m**. Dearer, but you keep your home, and at stage 2 your stall moves up onto the deck and stays open when the pad floods. |
   | ⛵ **Build a Boat** | ~$400 | Keel → ribs → planking → mast. Cheaper and faster. She floats off the slip and you go with her, but the valley keeps everything else. |

   You probably cannot afford both.

The catch is the schedule. **The low ground floods first**: the reed marsh goes
under around day 3, the junk pile day 4, the clay pit day 5, the woods day 7,
your own homestead day 8. Whatever you did not carry out is gone. An hour of
gathering on day 2 is worth more than a day of it on day 8.

Deep water costs stamina. Run the bar out mid-swim and the current takes you back
to your tent — and everything in your satchel with it.

## Controls

| | Keyboard | Touch |
|---|---|---|
| Move | <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows | left stick |
| Look, zoom | drag · scroll wheel | drag · pinch |
| Run | hold <kbd>Shift</kbd> | **RUN** |
| Use a place | <kbd>E</kbd> | **E** |
| Gather, build | hold <kbd>E</kbd> | hold **E** |
| Climb the ladder, board the boat | <kbd>C</kbd> | **⬆** |
| Your plan and the flood table | <kbd>Tab</kbd> | 📋 |
| Instructions | <kbd>H</kbd> | ⚙️ |

The amber line at the top of the screen is always your next job, and the arrow
under it points at where to do it.

## Running it

Nothing to install and nothing to build — it is plain ES modules and one copy of
three.js. It needs to be served over HTTP, though, because browsers won't load
modules off `file://`:

```bash
python3 flood-survival-3d/serve.py
```

That prints a `localhost` address plus the LAN address to use from a phone on the
same Wi-Fi. It also sends no-cache headers, without which an edit to a module
often won't show up on reload.

## How it is put together

No engine, no build step, no asset files. Everything is generated at runtime:
the terrain from a height function, the water from a shader, the props from boxes
and cylinders, the rain and thunder from oscillators and filtered noise.

| File | What lives there |
|---|---|
| [`js/econ.js`](js/econ.js) | **Every balance decision.** Prices, recipes, project costs, stamina, speeds. Imports nothing — read it as the design document. |
| [`js/terrain.js`](js/terrain.js) | One analytic `height(x, z)`. The mesh, the player's feet, the shoreline and every prop read it, so nothing can disagree about where the ground is. |
| [`js/water.js`](js/water.js) | The flood level as a pure function of the day, and one big shader plane that samples a height texture to decide per pixel whether a spot is under water — which is what gives a pixel-exact shoreline for free. |
| [`js/weather.js`](js/weather.js) | Sky, sun arc, palettes, GPU-animated rain, lightning. All derived from the day counter. |
| [`js/world.js`](js/world.js) | Props, buildings, villagers, the floating depot. |
| [`js/player.js`](js/player.js) | Character, walk/swim animation, orbit camera with building occlusion. |
| [`js/state.js`](js/state.js) | The whole save: one plain serialisable object. |
| [`js/business.js`](js/business.js) | Craft benches and the customers who walk up. |
| [`js/ui.js`](js/ui.js) | All the DOM. Knows nothing about three.js. |
| [`js/main.js`](js/main.js) | Renderer, clock, interaction rules, win and lose. |

Two things are deliberately single-sourced, because they are the ones that would
quietly lie to the player if they weren't:

- **Platform heights.** `PROJECTS.house.stages[].stand` is the only place they
  live. The meshes are built to it, the flood gauge measures against it, and the
  ending is decided by it. Write the number twice and the plans start promising a
  metre the deck does not have.
- **Flood level.** `floodAt(day)` is pure, so the water, the weather, the depot's
  prices and the "goes under day N" table can never drift out of step, and a save
  is just the day counter.

Progress autosaves to `localStorage` every few seconds. **⚙️ → Restart** wipes it.

Debugging: `__hw` is on `window`. `__hw.state.day = 9.9` is the fastest way to
see the end of the game.
