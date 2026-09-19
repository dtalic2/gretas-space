# 🏡 Milbil Town — 3D

A floating island, a barn, a helipad and three milbils.

Milbils are small, round, and never happier than when there is something to do.
You give them fields to plant, workshops to run and homes to live in; they give
you a town that keeps working while you are not looking. Visitors land on the
helipad wanting things, and the visitors are Greta's drawings.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-town-3d/**

---

## The loop

1. **Plant.** Tap an empty field 🟩, pick a crop, wait. Wheat takes 20 seconds and
   its seed is always free; starfruit takes half an hour and pays 165 a crop.
   When the bubble turns into a ✓, tap the field to harvest it.
2. **Make.** Build a workshop and it turns crops into things worth far more:
   wheat → bread, berries → cake, fluff → a milbil plush. Queue up to four
   recipes; they cook one after another and wait on the shelf until you collect.
3. **Mail.** Visitors land on the helipad 🚁 — Petal, Chomp, Hattie, Sunny and
   Scoop, who are Greta's drawings cut straight out of the page. Each one waits
   next to the pad with a list; mail it and the helicopter takes them away.
   Delivering pays about 1.6× what the barn pays for the same goods, plus the XP
   that moves the town up a level. This is the whole economy — selling raw crops
   is what you do when the barn is full.
4. **Grow.** Every workshop needs free milbils to run it, and milbils come from
   homes. A cottage houses two, a mushroom burrow four, a sky tower seven, and
   Cloud Manor twelve with a very serious front door.

Levels unlock everything: crops, workshops, homes and the pretty things
(lanterns glow at night, which is most of the point).

| Level | What opens up |
|---|---|
| 2 | Crumb Bakery 🥐 — bread |
| 3 | Sunberries 🫐, Mushroom Burrow 🍄 |
| 4 | Dew Press 🧃 — juice and cookies |
| 5 | Corn 🌽, Fountain ⛲, Post Balloon 🎈 |
| 6 | Sky Tower 🗼, Fluff Pen 🐑, Berry Cake 🍰 |
| 7 | Moonleaf 🍃 |
| 8 | Cosy Loom 🧣, Moon Tonic 🍶, Milbil Statue 🗿 |
| 9 | Cloud Manor 🏰, Sun Kitchen 🍲 |
| 10 | Starfruit ⭐, Milbil Plush 🧸 |
| 12 | Star Jelly 🍮 |

## Things worth knowing

- **It runs on real time, closed or open.** Crops ripen and workshops keep
  cooking while the game is shut, up to eight hours' worth. Plant the slow crops
  before bed.
- **The barn is small on purpose.** 60 spaces to start. Upgrade it, or sell the
  surplus — a full barn means a harvest has nowhere to go.
- **Fields get pricier the more you own**, so a big farm is a real decision
  rather than a formality.
- **Everything can be moved.** Tap a building, then ✋ Move it. Fields and
  decorations can also be sold back for half.
- **The shore is not buildable.** The outer ring of the island is grass, rocks
  and bushes, and it stays that way.
- **The visitors are real drawings.** `art/` holds the five characters, cut out
  of a photo of the originals with the black turned transparent so the neon
  still glows. To add another: drop a PNG in `art/` and add a line to
  `CHARACTERS` in `js/data.js`. Renaming them is the same one line.

## Getting around

| | |
|---|---|
| Phone | Drag to pan, pinch to zoom, twist with two fingers to turn |
| Mouse | Drag to pan, wheel to zoom, right-drag or shift-drag to turn |
| Keys | <kbd>WASD</kbd> pan · <kbd>Q</kbd>/<kbd>E</kbd> turn · <kbd>+</kbd>/<kbd>−</kbd> zoom · <kbd>B</kbd> build · <kbd>H</kbd> help · <kbd>M</kbd> mute · <kbd>Esc</kbd> close |

Tapping anything finished — a ripe field, a workshop with goods on the shelf —
collects it straight away. Tapping anything else opens its panel.

## Running it locally

```sh
python3 serve.py          # http://localhost:8125, and prints your phone's address
```

It needs a server rather than opening `index.html` directly, because the game is
ES modules. `serve.py` also sends no-cache headers, so edits show up on reload.

Add it to a phone home screen and it runs fullscreen like an app.

## What is in here

```
index.html        the shell: HUD, panels, cards
css/style.css     cream panels over a bright sky, finger-sized first
js/data.js        every number in the game — crops, recipes, buildings, levels
js/island.js      the shape of the ground: land, shore, paths, tile maths
js/econ.js        the rules: planting, cooking, orders, XP. No DOM, no three.js
js/save.js        localStorage, the starting town, catching up after a nap
js/models.js      every mesh, built from boxes and balls
js/world.js       island, sky, clouds, the day/night cycle
js/town.js        keeps the 3D town in step with the saved state
js/milbils.js     the residents, and where they wander
js/visitors.js    the drawn characters on the helipad, and the helicopter
js/camera.js      drag, pinch, twist, tap
js/ui.js          chips, sheets, bubbles, toasts
js/main.js        boot, wiring, the frame loop
art/              the five visitors, as transparent PNGs
vendor/           three.js r160
```

`js/econ.js` is deliberately free of rendering and DOM, so the rules can be
tested on their own and offline catch-up is the same code as the live tick.
