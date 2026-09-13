# Milbil Tower

A 5×5 board, a control tower, and a laser. **Milbils** — the glowing, square-bodied,
lopsided-eyed creatures from the original sketch — hop onto the far row and work
their way toward you. Shoot them before they get there.

Plain Canvas 2D in the browser. No build step, no install, no dependencies — it is
a static folder that runs offline.

---

## Running it

It needs to be served over HTTP (ES modules will not load from `file://`).

```bash
python3 milbil-tower/serve.py
```

Then open <http://localhost:8125>.

`serve.py` is `http.server` with no-cache headers added, which matters while you
are editing: browsers cache ES modules hard, so with a plain `python3 -m http.server`
a change to `js/types.js` often will not show up on reload and it looks like your
edit did nothing.

Any static host works for deployment — `npx serve`, nginx, GitHub Pages, S3.

It also builds to a single self-contained `.html`, for anywhere that can host a
page but not a folder of ES modules:

```bash
node milbil-tower/build-artifact.mjs        # -> dist/milbil-tower.html, ~64 KB
```

That is the only thing in the project with a build step, and it is optional —
`serve.py` runs the source as-is, which is still how to develop it. esbuild is
fetched on demand by `npx`, so there is nothing to install and no `package.json`.

---

## How it plays

| Action | Desktop | Phone |
| --- | --- | --- |
| Aim | move the mouse | hold and drag |
| Fire | click, or **Space** | lift your finger |
| Workshop | **B** or 🛠️ | 🛠️ |
| How to play | **H** or ? | ? |
| Pause | **P** | — |

On a phone the board is under your finger, so aiming and firing are split: drag to
line the beam up, and it fires when you lift off. The dashed line shows exactly
where the shot will go, and anything it would hit gets a spinning lock-on ring.

**Round 1 has one Milbil. Round 2 has two. Round 12 has twelve.** Clear them all to
move on. What changes as the rounds climb is not just the count but the *mix* —
tougher variants unlock and gradually crowd out the plain ones.

Milbils walk on at the far row and hop about, drifting toward the tower. One that
hops off the **near row** reaches the tower and takes a shield. Lose all your
shields and the Milbils have the tower — but your coins and upgrades survive, and
you restart that same round.

Line two Milbils up in a single beam for a bonus. With the Piercer fitted, the
beam carries on through them.

---

## The Milbils

A typical Milbil pays **30 coins**. Everything else is priced off how much trouble
it actually is to hit.

| | Coins | Zaps | What it does |
| --- | --- | --- | --- |
| **Milbil** | 30 | 1 | The classic. Hops about and waves at you. |
| **Zippy Milbil** | 55 | 1 | Hops more than twice as often, and smaller. |
| **Blinky Milbil** | 80 | 1 | Fades most of the way out between hops — no lock-on ring while it is faint. |
| **Chonk Milbil** | 120 | 3 | Big and slow, but it soaks three zaps. |
| **Shifty Milbil** | 180 | 1 | Feels the crosshair settle on it and bolts sideways. |
| **MEGA MILBIL** | 600 | 12 | Every fifth round. Enormous. |

Each is the same drawing with its colour wheel rotated, so they all read as
family. The field guide behind the **?** button fills in as you meet them.

---

## The workshop

Coins have exactly one use: the tower. Twelve ladders in three groups, priced so
the first rung lands within a round or two and the top rung is a genuine project
(everything, maxed, is about 57,000 coins — roughly 1,900 typical Milbils).

**Laser** — the shot itself.

| | Does |
| --- | --- |
| **Charge Coil** | Recharges faster — 0.62s down to 0.26s per shot. |
| **Beam Focus** | A fatter beam, so near misses start counting as hits. |
| **Overcharge** | More damage per zap, up to 4. Chonks stop being a chore. |
| **Piercer** | The beam carries on through up to 4 Milbils instead of stopping at the first. |
| **Twin Beam** | Fires a fan of 3, then 5. The count is always odd, so one beam still goes exactly where you aim — an upgrade must never make aiming worse. |

**On impact** — what happens where the beam lands.

| | Does |
| --- | --- |
| **Chain Zap** | A popping Milbil throws a spark at up to 3 standing too close. Arcs are one hop deep, so a crowded board cannot cascade into itself. |
| **Stun Coil** | Anything that survives a zap is frozen for up to 1.8s. A Milbil that has stopped dancing is one you know will still be there next shot. |
| **Combo Amp** | Raises the multi-kill bonus from 25 to 100 coins per extra Milbil. |

**Tower** — the thing you are defending.

| | Does |
| --- | --- |
| **Tower Plating** | Up to 6 shields, and every lost shield repaired on purchase. |
| **Deflector** | Throws up to 3 Milbils a round back to the far row instead of taking a shield. The count left shows in the HUD. |
| **Damper Field** | Milbils hop up to 27% more slowly across the whole board. |
| **Tracer Array** | Stops Blinky Milbils fading out on you — first to faint, then fully visible. |

Shields refill at the start of every round, so they are a within-round resource:
they measure how badly one round went, not how the run is going. That is why
there is a Deflector rather than a repair kit — repairing something that is about
to be handed back full would buy nothing.

---

## How it is put together

```
js/neon.js        stroke primitives — a neon line is four blurred passes, not one
js/milbil-art.js  the creature itself, traced in a 100x100 design box
js/types.js       the roster, payouts, and how a round's mix is built
js/board.js       5x5 geometry and the baked grid
js/game.js        hopping, aiming, firing, rounds, shields
js/render.js      one frame
js/fx.js          sparks, shards, floating numbers, screen shake
js/upgrades.js    the workshop ladders
js/state.js       coins and upgrades in localStorage
js/ui.js          HUD and panels
js/audio.js       synthesised blips, no files to load
js/main.js        boot, input, loop
```

Two things are worth knowing if you come back to this.

**Nothing neon is drawn live.** Every Milbil's dance cycle is baked into eight
offscreen frames at boot, and so are the grid, the tower legs, the barrel and the
shield pips. Drawing them properly each frame ran at 21fps with a full board;
baking them put it back at 60. What is still stroked live is only the charge ring,
the aim line and the lock-on rings.

**Sprites are sized per variant.** A MEGA is nearly twice the width of a Zippy, so
baking every variant at the MEGA's resolution would waste tens of megabytes on a
phone for nothing. `spritePx()` sizes each one to the board square it will actually
occupy, and they are re-baked only if a resize changes the board by more than a
quarter.
