# 🫧 Milbil GO

Half Pokémon GO, half 3x3 Garden. Walk around for real, with your phone's GPS
putting you on a map of the streets around you. Find milbils and catch them,
then grow a 3x3 garden with seeds you buy from the shops you walk to.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-go/**

No build step and no dependencies. Run it locally with:

```bash
python3 milbil-go/serve.py      # http://localhost:8127
```

Phones only give GPS to `https` pages (or `localhost`). Over plain-http Wi-Fi
from your computer the game can only use its joystick. To walk around for real,
play it from GitHub Pages, which is https. Tap **Add to Home Screen** and it
opens full screen like an app.

---

## How it plays

You start as a **Common Milbil**: a plain milbil with every extra feature taken
off. On your first walk, three milbils are waiting right next to you.

1. **Walk.** The map follows you. Drag with one finger to turn it, pinch to zoom,
   and tap the compass to point north again.
2. **Catch milbils.** Milbils pop up around the map, and new ones appear every few
   minutes. When one is inside your ring, tap it and **swipe the bubble up** at it.
   The coloured ring shrinks and grows. Land the bubble while the ring is small
   for a *Great!* or *Excellent!* throw, which is more likely to hold. The ring's
   colour shows how hard the milbil is to catch, from green to red. A milbil can
   break free, and sometimes it runs away.
3. **Play as them.** Every milbil you catch goes in your 📖 **Milbil Book**. Tap one
   to play as it. Your avatar on the map changes, and you get its perk.
4. **Grow.** Your 🌱 **Garden** opens from anywhere. Plant seeds, water them when
   they get thirsty 💧 (they grow twice as fast after that), and pick them when
   they sparkle ✨. Picked crops go in your basket.
5. **Shop.** You have to walk to these. Tap any shop on the map to look inside
   from wherever you are, but you can only buy or sell once you're close.

| Shop | What it's for |
| --- | --- |
| 🧺 Market | Sell your harvest |
| 🌱 Seed Shop | All 40 seeds from 3x3 Garden: 26 crops and 14 fruit trees and vines |
| ✨ Magic Tree | 11 rare seeds, 34 charms, and the Magic Sapling |
| 🐾 Animal Shop | All 21 animals, from the Rabbit to the Dragon |
| 🔨 Carpenter | Soil to grow your garden from 3x3 to 5x5, tools, and decorations |

You can buy **anything you have the coins for**. Nothing needs a level.

In 3x3 Garden, the Magic Tree and Animal Pen stock was almost never available.
Here **nothing is ever out of stock**, and on the map Magic Trees and Animal
Shops are almost as common as Seed Shops.

You start with 10 coins and 4 carrot seeds. Catching a milbil also pays coins,
so you can't end up stuck with nothing.

👀 **Nearby** lists the milbils and shops around you, with arrows to walk toward.
If GPS isn't available, ⚙️ **Settings** switches to a joystick (arrow keys or
WASD work too on a computer).

🚸 The start screen reminds players to look up while they walk, stay with a
grown-up, and never go somewhere they shouldn't to catch a milbil.

## The milbils

Milbils are drawn the way Greta draws them: a tall box with a line across the
middle, stick arms and stick legs. Each kind is a Common Milbil plus a feature or
two. The five legendaries are **Greta's own drawings** (from
`milbil-town-3d/art/`).

| Rarity | Milbils | Coins per catch |
| --- | --- | --- |
| Common | Common Milbil, Sprouty, Freckles, Snooze, Giggle | 5 |
| Uncommon | Farmer Milbil, Sporty, Cosy, Bowtie, Brainy, Toothy, Party | 15 |
| Rare | Blossom, Scoopy, Floaty, Starry, Wizzle | 40 |
| Epic | Royal Milbil, Golden Milbil, Rainbow Milbil, Boo | 120 |
| Legendary | Petal, Chomp, Hattie, Sunny, Scoop | 500 |

Each one has a perk while you play as it, such as faster crops, better prices,
a bigger catch ring, more coins from catches, or money off in shops. **Boo**
comes out mostly at night. Each catch also gives XP, and a new kind gives a bonus.
Your level is just a badge, because nothing is locked behind it.

## How the world works

Nothing about the map is stored or downloaded. It's all worked out from latitude,
longitude and the clock (`js/geo.js`):

- The world is a grid of cells. Each ~95 m cell may hold one shop, which is
  always in the same spot for everyone. That gives about 10–15 shops within 250 m
  of anywhere.
- Each ~60 m cell may get one wild milbil every five minutes. It turns up a little
  after its window opens and wanders off 2–4 minutes later. Every cell runs on its
  own phase, so they don't all change at once. A caught milbil is remembered until
  it would have left, so it can't come back.
- Reloading never rerolls anything, and milbils keep coming and going while the
  game is shut.

The map is OpenStreetMap's own street tiles, falling back to OpenStreetMap
France's. Neither needs an API key or an account. Both ask for light use and a
credit on screen, which is fine for a family game. If lots of people ever play
it, switch to a tile service with a key. The map is tipped back with a CSS 3D
transform to give the angled look. You, the milbils and the shops are a flat layer on top, placed with
the same projection maths, so they stand upright and are easy to tap. If no
tiles load, you play on a grassy field instead.

Crops grow from real elapsed time, including while the game is shut (up to 8
hours). Growth is added up as it goes rather than worked out from the planting
time. That way, swapping to a milbil with a growth perk only speeds crops up
from that moment on.

## Code

| File | What's in it |
| --- | --- |
| `js/data.js` | Every number: crops, charms, animals, tools, shop types, milbil species and perks, spawn rates |
| `js/geo.js` | Mercator maths, distances, and where shops and milbils are |
| `js/map.js` | The tilted tile map, sprite projection, and turn/zoom gestures |
| `js/milbil.js` | Draws a milbil as SVG from its features |
| `js/catch.js` | The swipe-a-bubble catching game |
| `js/garden.js` | Crop growth, thirst and watering |
| `js/gardenview.js` | The garden screen, Tend-all, and your Magic Sapling |
| `js/shops.js` | The five shops |
| `js/book.js` | Milbil Book, Bag, Nearby, and Settings |
| `js/state.js` | Saving, and adding up every bonus you own |
| `js/main.js` | Start-up, GPS, the joystick, and the game loop |

The game saves to `localStorage` every few seconds. In the browser console,
`MILBIL.teleport(lat, lng)`, `MILBIL.walk(eastMetres, northMetres)` and
`MILBIL.coins(n)` are there for testing, and `MILBIL.wipe()` starts again.
