# 🏨 Milbil Hotel

A hotel for the visitors from Milbil Town.

Milbil Town is full of guests and none of them have anywhere to sleep. You have
a lobby, two little rooms and a bell on the desk. Check them in, send them up
in the lift, and they pay you when they leave. Spend it on more rooms, more
floors, a café, a bubble spa and a pool on the roof.

Every guest is one of Greta's five drawings — Petal, Chomp, Hattie, Sunny and
Scoop — cut out of the page and walking about with a suitcase.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-hotel/**

---

## The loop

1. **Check in.** Guests walk in off the pavement and wait in the lobby. The
   bubble over each one shows the room they want, their wish, and how much
   patience they have left. Tap them (or open 🛎️ Lobby) and they take the lift
   up to a free room of that kind — or a nicer one, which pays 20% extra.
2. **Get paid.** When the stay is over they leave coins on the pillow. Tap the
   🪙 over the room.
3. **Tidy up.** The room needs a tidy before the next guest can have it. Tap the
   🧹 — or hire housekeepers, and rooms tidy themselves.
4. **Build.** 🛠 Build has everything:
   - **Rooms** — where guests sleep. Fancier ones take longer and pay far more.
   - **Areas** — rooms nobody sleeps in. Most guests have a wish (a hot
     breakfast, a bubble bath, a dance); grant it and they pay 50% more.
   - **Outside** — a garden (guests wait longer), a bus stop (guests come
     faster), a neon sign (+10% on every stay), the rooftop pool, and a helipad
     where the Milbil Town helicopter lands, and guests who fly in pay double.
   - **Hotel** — new floors (three more spaces each, up to 12 floors), a bigger
     lobby, and housekeepers.

Nobody waits for ever: a guest whose room is not free gives up after a couple
of minutes and goes home. That is the only way to lose anything.

| Level | What opens up |
|---|---|
| 1 | Cosy Room 🛏️ |
| 2 | Bunk Room 🪜, Café ☕, Front Garden 🌷 |
| 3 | Flower Room 🌸, Games Room 🎲, Bus Stop 🚌, Housekeepers 🧹 |
| 4 | Bubble Spa 🛁, Neon Sign ✨ |
| 5 | Moon Suite 🌙, Library 📚, Rooftop Pool 🏊 |
| 6 | Music Room 🎹, Helipad 🚁 |
| 7 | Star Suite ⭐ |
| 8 | Ballroom 🪩 |
| 10 | Cloud Penthouse ☁️ |

## The guests

Petal, Chomp, Hattie, Sunny and Scoop each have a favourite room or wish, and
ask for it now and then. 📖 Guests keeps count of who has stayed.

## Things worth knowing

- **Stays run on real time, closed or open.** Come back to coins on the pillows.
- **There is a day and a night.** After dark every room lights up, and the neon
  sign glows.
- **Saving.** The hotel saves itself in the browser you play in. ⚙️ can save it
  to a file (`milbil-hotel-YYYY-MM-DD.json`) and load it back, or copy it as
  text, to carry it to another device.
- **The drawings.** `art/` is a copy of the town's cut-out characters. Renaming
  one, or adding another, is a line in `CHARACTERS` in `js/data.js`.

## Getting around

| | |
|---|---|
| Phone | Drag to move up, down and along; pinch to zoom |
| Mouse | Drag to move, wheel to zoom |
| Keys | <kbd>WASD</kbd> move · <kbd>+</kbd>/<kbd>−</kbd> zoom · <kbd>B</kbd> build · <kbd>L</kbd> lobby · <kbd>G</kbd> guest book · <kbd>H</kbd> help · <kbd>M</kbd> mute · <kbd>Esc</kbd> close |

## Running it locally

```sh
python3 serve.py          # http://localhost:8126, and prints your phone's address
```

It needs a server rather than opening `index.html` directly, because the game
is ES modules.

## What is in here

```
index.html        the shell: HUD, panels, cards
css/style.css     cream panels over a bright sky (the town's look)
js/data.js        every number — rooms, areas, extras, prices, levels, guests
js/econ.js        the rules: arrivals, check-in, pay, tidy, building. No DOM, no three.js
js/save.js        the starting hotel, saving, save files
js/models.js      every mesh, built from boxes and balls, and the merger that bakes them
js/hotel.js       the building in 3D, the lift, and the guests walking about
js/world.js       sky, sun, ground, clouds, stars, day and night
js/camera.js      drag, pinch, wheel, tap
js/ui.js          panels, cards, toasts
js/main.js        boot, wiring, markers, the frame loop
art/              the drawn characters, as transparent PNGs
vendor/           three.js r160
```
