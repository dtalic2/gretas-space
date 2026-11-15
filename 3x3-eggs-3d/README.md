# Egg Heist 3D

A times-tables game built on the same idea as **3x3 Eggs** on timestables.com:
giants sleep beside their nests, you creep up, take an egg, and run home before
they catch you. Every egg hatches into an animal, and the only way to crack one
open is to answer a times-tables question.

It is a plain static folder — HTML, CSS and ES modules, with three.js vendored
in `vendor/`. No build step, no network, no accounts.

## Running it

```bash
python3 serve.py
```

Then open http://localhost:8136. The server exists only to send no-cache headers
(browsers cache ES modules hard, so without it an edit to `js/world.js` looks
like it did nothing) and to print the address to type on a phone on the same
Wi-Fi. From the project root, `.claude/launch.json` has it as **egg-heist**.

## How it plays

1. **Pick a character and a biome**, and tick the tables you want to practise.
2. **Creep to a nest.** The giant beside it is listening, not looking. Noise
   comes from how fast you move — sprinting is loud, crouching is quiet, and
   standing near a tree or rock muffles you. The ring over the giant's head
   fills as it starts to stir.
3. **Press E to take an egg.** That always wakes it, and now it is chasing you.
4. **Get back inside the pen.** Giants stop at the fence. Being caught outside
   costs you the egg in your hands and nothing else, so a bad raid is never
   worth restarting over.
5. **Stand on the stump and press E to hatch.** Answer the question and the egg
   opens. A wrong answer just asks again; after two it shows you the answer to
   type, and the fact comes back sooner next time.
6. **Animals live in your pen and earn coins every minute.** Coins buy boots,
   quiet socks, a bigger basket, luck, and three more biomes — and every
   purchase costs one more question.

There are 64 animals across five rarities, and the rarer ones come from the
better-guarded nests in the later biomes.

### Controls

| | |
|---|---|
| Move | `W A S D` / left stick |
| Sprint | `Shift` / 💨 |
| Creep | `Ctrl` or `C` / 🤫 |
| Jump | `Space` / ⤒ |
| Steal & hatch | `E` / `E` button |
| Look | drag anywhere |
| Pause, sound | `Esc`, `M` |

## The files

| file | what is in it |
|---|---|
| `js/main.js` | boot, scene, input, the loop, and what a raid is |
| `js/world.js` | the four biomes, the pen, nests, eggs, cover |
| `js/guardian.js` | the giants: hearing, waking, chasing, giving up |
| `js/player.js` | movement, noise, the camera, carrying eggs |
| `js/profiles.js` | **the cast** — one object per character |
| `js/animals.js` | the 64 species and the little 3D critters |
| `js/mathq.js` | which fact to ask next, and the per-fact record |
| `js/state.js` | the save file, upgrades, what a character is worth |
| `js/ui.js` | HUD, overlays, the number pad |
| `js/audio.js` | every sound, synthesised at runtime |

## Dropping in the Clip Club art

The six characters are **stand-ins**, drawn in code so the game is playable
today. Each one is a single object in `js/profiles.js` and nothing else in the
game reads its fields, so replacing one is a one-line change.

When you have the screenshots:

1. Cut each character out on a transparent background, standing, facing the
   camera — about 320×420 works well.
2. Save it as `assets/profiles/<id>.png`, using the profile's own `id`
   (`pip.png`, `mo.png`, `bee.png`, `tuck.png`, `wren.png`, `dot.png`).
3. In `js/profiles.js`, change that profile to:

   ```js
   mode: 'card', art: 'assets/profiles/pip.png',
   ```

   and give it the real name and blurb while you are there.

`mode: 'card'` renders the character as a cut-out that always faces the camera,
with the same walk bounce, the same controls and the same everything else.
`mode: 'rig'` is the built-from-boxes version that ships now. Characters can be
mixed — one can be a cut-out while the others stay as rigs.

The `trait` block is the only part that touches play: `speed` scales how fast
the character runs, `sneak` above 1 makes them quieter, and `carry` adds egg
slots. `at` is how many species you must have collected before the character
unlocks (`0` means available from the start).
