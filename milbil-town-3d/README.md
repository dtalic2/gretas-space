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
   homes. The 👥 bar in the corner fills as they are put to work, so a full bar
   means the next workshop needs a home first. A cottage houses two, a mushroom burrow four, a sky tower seven, and
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

## Four islands

Home is not the only island up there. Three more hang in the sky nearby, greyed
out until you claim them from the 🗺 map (or <kbd>I</kbd>, or by tapping one):

| | Opens at | Costs | Room |
|---|---|---|---|
| 🏠 **Home** | — | — | 158 spots |
| 🏝 **Mossy Rock** | level 5 | 🪙 2,500 | 59 spots |
| 🏝 **Windy Spit** | level 8 | 🪙 9,000 | 67 spots |
| 🏝 **Star Shelf** | level 12 | 🪙 30,000 | 87 spots |

Claiming one throws a rope bridge across from home, colours it in, scatters its
shore with rocks and bushes, and sends some of your milbils over to look around.
After that it is simply more town: fields, workshops and homes all work there,
the barn and the helipad still serve the lot, and the population is shared. The
price never changes, so there is no hurry — an island you cannot afford yet just
sits there looking inviting.

## Two ways to look at it

The 👁 button (or <kbd>V</kbd>) drops the camera out of the planning view and
down into the town at milbil height. Dragging turns your head instead of
shoving the island about, a stick appears bottom-left to walk with (<kbd>WASD</kbd>
on a keyboard), and the HUD steps back out of the way. Tap it again to climb out.

Everything else is there whether you look at it or not: birds circling, butterflies
over the fields, fireflies after dark, other islands hazy on the horizon, wind and
birdsong by day, crickets at night, and a sky that actually changes colour from the
horizon up. The visitors glow at night, because they were drawn in neon.

## Three towns

⚙️ → **Your towns**, or the 🗂 button, or <kbd>T</kbd>. You can keep three towns
on the go and swap whenever you like: the ones you are not playing sit exactly
as you left them and carry on from that moment when you come back — crops and
workshop queues included, up to the usual eight hours. Each town can be renamed,
saved to its own file, or deleted; the one you are in cannot be deleted out from
under you.

**Upgrading from an older build never loses the game you had going.** The first
time this version opens, it finds the old single save, copies it into the first
town, and then leaves the original key alone forever — it shows up in the picker
as the 🛟 safety copy, which can be restored into any free slot. Nothing in the
game ever writes to it.

## Where your progress lives

The town saves itself into **the page you opened, in the browser you opened it
in** — every few seconds, and again when you leave. Nothing goes to a server, so:

- The Pages link above and a local `serve.py` are different places, and keep
  different towns. So are your phone and your laptop.
- Private windows, and some in-app viewers that show a page inside another page,
  throw browser storage away when you close them. The game notices and says so.

So the ⚙️ panel can hand you the town as a file: **Save to a file** downloads
`milbil-town-YYYY-MM-DD.json`, **Load a save file** takes one back, and there is
a text box underneath for copying it somewhere by hand when a file is awkward
(phones, mostly). Loading replaces the town you are in, so it asks first.

For a town that sticks around, open the Pages link in a normal browser tab —
or add it to your home screen, where it runs fullscreen with its own storage.

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
- **The shore is not buildable.** The outer ring of every island is grass, rocks
  and bushes, and it stays that way.
- **The visitors are real drawings.** `art/` holds the characters, cut out of a
  photo of the originals with the black turned transparent so the neon still
  glows. To add more, run the cutter over a photo of them and add a line each to
  `CHARACTERS` in `js/data.js`:

  ```sh
  python3 tools/cutout.py ~/drawings.png --cols 4 --rows 2 --names bill,swish,bullet,kriss
  ```

  It finds the dark card inside each grid cell, so cells that are not drawings
  are skipped, and prints the lines to paste. Renaming a character is that same
  one line.

## Getting around

| | |
|---|---|
| Phone | Drag to pan, pinch to zoom, twist with two fingers to turn |
| Mouse | Drag to pan, wheel to zoom, right-drag or shift-drag to turn |
| Keys | <kbd>WASD</kbd> pan or walk · <kbd>Q</kbd>/<kbd>E</kbd> turn · <kbd>+</kbd>/<kbd>−</kbd> zoom · <kbd>V</kbd> walk around · <kbd>B</kbd> build · <kbd>I</kbd> islands · <kbd>T</kbd> towns · <kbd>H</kbd> help · <kbd>M</kbd> mute · <kbd>Esc</kbd> close |

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
js/island.js      the four islands: land, shore, paths, tile maths
js/econ.js        the rules: planting, cooking, orders, XP. No DOM, no three.js
js/save.js        the three towns, the starting town, catching up after a nap
js/models.js      every mesh, built from boxes and balls
js/world.js       the islands and their bridges, sky, clouds, day/night
js/town.js        keeps the 3D town in step with the saved state
js/milbils.js     the residents, and where they wander
js/visitors.js    the drawn characters on the helipad, and the helicopter
js/wildlife.js    birds, butterflies and fireflies
js/camera.js      drag, pinch, twist, tap — and the walk-around mode
js/ui.js          chips, sheets, bubbles, toasts
js/main.js        boot, wiring, the frame loop
art/              the visitors, as transparent PNGs
tools/cutout.py   turns a photo of neon drawings into more of them
vendor/           three.js r160
```

`js/econ.js` is deliberately free of rendering and DOM, so the rules can be
tested on their own and offline catch-up is the same code as the live tick.
