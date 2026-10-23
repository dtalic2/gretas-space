# 🎒 M-I-L-B-I-L Lunchbox Simulator

You pack the school lunchboxes. Every morning one milbil hands you **their own
lunchbox**, **their lunch money** and **a note** saying what they'd like in it.
Three shops are fighting over that lunch money, and their prices change every
single day. At lunchtime three judges mark the box out of ten each, so you walk
home with up to **30 points** — and whatever change you didn't spend.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-lunchbox/**

No build step and no dependencies. Run it locally with:

```bash
python3 milbil-lunchbox/serve.py      # http://localhost:8132
```

---

## One lunchbox a day

1. **Read the note.** Every milbil has the same likes and dislikes for ever —
   Sprouty always loves green things, Toothy never wants anything soft. The only
   thing that changes is the one extra thing they ask for that morning.
2. **Shop around.** Tap a price to buy that food and drop it straight into the
   box. Tap anything in the box to put it back and get the money back.
3. **Close the lid.** Munch, Nurse Pip and Tidy each mark it out of ten.
4. **Choose tomorrow.** Stay with the same milbil — their tip grows every day in
   a row — or pack for somebody else, with a different lunchbox and different
   likes.

Nothing is timed. You can stare at the prices all afternoon if you want to.

## The three shops

They all sell most of the same food, and they all want to be the one in the
lunchbox.

| Shop | Prices | Health | What milbils think |
| --- | --- | --- | --- |
| 🏷️ **Bill's** | about 60% of Billy's | one heart worse | "All a bit cheap" — a small knock off the tip |
| 🛒 **Billy's** | the ordinary price | as listed | they don't notice either way |
| 🌿 **Lebelibs** | about 170% of Billy's | one heart better | "Proper fresh food" — a little extra on the tip |

Every morning each shop shifts its prices by up to 15% either way and puts one
food on **half price** 🏷️. The cheapest price for each food gets a **BEST**
badge. Bill's doesn't stock the fancy things (sushi, blueberries, snap peas,
smoothies, boiled eggs, soup) and Lebelibs won't sell you chocolate bars,
pretzels, pizza, hot chocolate or crackers.

Cheapest isn't always best. Chomp loves a big bag from Bill's. Royal Milbil
won't be seen eating anything out of one, and Brainy only really wants
Lebelibs.

## The judges

Three milbils sit down with the box at lunchtime. Ten marks each, so **30
points** at most.

| Judge | Asks | Marks out of ten |
| --- | --- | --- |
| 😋 **Munch** | Did they like it? | Every line on the note. The thing they asked for that morning is worth the most. |
| 🩺 **Nurse Pip** | Is it good for them? | Nothing but the health score — the average health of everything in the box, out of 100. |
| 🎀 **Tidy** | Is it a proper lunch? | 4 for filling every space, 4 for four different food groups, 2 for not packing the same thing twice. |

Points are the score you keep for ever, and they're what unlocks new milbils.
They never get spent.

## Coins

- **The change is yours.** Whatever lunch money you don't spend you keep — as
  long as the lunchbox earned at least one star. Hand over an empty box and the
  family would quite like their money back.
- **The tip** is the milbil's full tip multiplied by your marks out of 30, so
  18/30 pays 60% of it.
- **Bonuses** go on top of the tip: a healthy box (+15%) or a super healthy one
  (+35%), your healthiest box yet (+25%), four food groups (+20%), every space
  filled (+10%), each bit of kit you own, each sticker, and 8% for every day in
  a row with the same milbil, up to 80%.

Coins buy kit and stickers. That's all they're for, so spend them.

## Allergies

Freckles is allergic to nuts. One nut and the lunchbox comes home with the lid
still on: **0 out of 30**, no tip, and three very disappointed judges. Anything
with nuts in it is flagged in red on the shelf when you're packing for a milbil
who can't have them.

## Your packing kit

| Kit | Cost | What it does |
| --- | --- | --- |
| 🧻 Paper Napkin | 🪙 150 | A folded napkin tucked under the lid. Tidy. Milbils tip 6% more. |
| 🧊 Ice Pack | 🪙 400 | Keeps the cold things cold, so you can pack milk, yogurt, smoothies, pasta salad and sushi. Tips go up 8%. |
| 🥄 Fork and Spoon | 🪙 800 | No more eating pasta salad with your fingers. Tips go up 8%. |
| 💌 Little Note | 🪙 1,400 | A tiny "have a lovely day!" drawn on the back of a receipt. Tips go up 12%. |
| 🫙 Thermos Flask | 🪙 2,200 | Keeps soup, pizza and hot chocolate warm until lunchtime. Tips go up 10%. |
| 🎒 Padded Cool Bag | 🪙 5,000 | The whole lunchbox rides to school in a padded bag. Tips go up 20%. |

The 🧊 Ice Pack and the 🫙 Thermos Flask aren't just tips — they're the only way
to pack cold and warm food at all.

**Stickers** go on the lid, three at a time, and each one you own adds 3% to
every tip: ⭐ Gold Star and 💖 Heart (200), 🌈 Rainbow and 🦕 Dinosaur (450),
🚀 Rocket and 🐱 Cat (900), 🦄 Unicorn (1,800), 👑 Crown (3,000).

## The milbils

| Milbil | Unlocks at | Spaces | Lunch money | Tip | Loves | Would rather not |
| --- | --- | --- | --- | --- | --- | --- |
| Sprouty | from the start | 3 | 90 | 55 | green things, 🥕 veg | Chocolate Bar |
| Chomp | from the start | 4 | 140 | 70 | 🥪 main, cheesy things, food from Bill's | green things |
| Giggle | from the start | 3 | 105 | 60 | 🍪 treat, sweet things | 🥕 veg |
| Toothy | ⭐ 40 | 4 | 165 | 85 | crunchy things | soft things |
| Snooze | ⭐ 100 | 4 | 190 | 95 | soft things, warm things | crunchy things |
| Freckles | ⭐ 180 | 4 | 215 | 110 | 🍎 fruit, juicy things | **nuts — allergic!** |
| Brainy | ⭐ 280 | 5 | 260 | 135 | 🥕 veg, 🍎 fruit, food from Lebelibs | 🍪 treat |
| Sporty | ⭐ 400 | 5 | 300 | 155 | 🧃 drink, Boiled Egg | chocolatey things |
| Petal | ⭐ 540 | 5 | 350 | 180 | 🍎 fruit, sweet things | salty things |
| Cosy | ⭐ 700 | 5 | 400 | 210 | warm things, soft things | cold things |
| Sunny | ⭐ 880 | 5 | 455 | 240 | juicy things, 🧃 drink | cheesy things |
| Wizzle | ⭐ 1,080 | 6 | 520 | 275 | Tomato Soup, warm things | Crackers |
| Hattie | ⭐ 1,300 | 6 | 590 | 315 | cheesy things, 🧀 snack | Water Bottle |
| Scoop | ⭐ 1,540 | 6 | 660 | 355 | cold things, sweet things | warm things |
| Royal Milbil | ⭐ 1,800 | 6 | 800 | 460 | Sushi Rolls, Strawberries, food from Lebelibs | food from Bill's, Crackers |
| Golden Milbil | ⭐ 2,080 | 6 | 1100 | 700 | 🍎 fruit, 🥕 veg, sweet things | — |

Chomp, Petal, Sunny, Hattie and Scoop are Greta's own drawings. The rest are
drawn by the game, the way Greta draws milbils: a tall box with a line across
the middle, stick arms, stick legs and a bright glowing outline.

## The food

Prices below are what each shop charges on an ordinary day. The real ones move
every morning.

| Food | Group | Words | Health | Bill's | Billy's | Lebelibs | Needs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cheese Sandwich | 🥪 Main | soft, cheesy | ♥♥♥ | 13 | 22 | 37 | — |
| Jam Sandwich | 🥪 Main | soft, sweet | ♥♥ | 12 | 20 | 34 | — |
| Chicken Wrap | 🥪 Main | soft | ♥♥♥♥ | 18 | 30 | 51 | — |
| Pasta Salad | 🥪 Main | cold | ♥♥♥♥ | 20 | 34 | 58 | 🧊 Ice Pack |
| Sushi Rolls | 🥪 Main | cold, green | ♥♥♥♥♥ | — | 55 | 94 | 🧊 Ice Pack |
| Tomato Soup | 🥪 Main | warm | ♥♥♥♥ | — | 45 | 77 | 🫙 Thermos |
| Pizza Slice | 🥪 Main | warm, cheesy | ♥♥ | 29 | 48 | — | 🫙 Thermos |
| Apple | 🍎 Fruit | crunchy, sweet | ♥♥♥♥♥ | 7 | 12 | 20 | — |
| Banana | 🍎 Fruit | soft, sweet | ♥♥♥♥♥ | 7 | 11 | 19 | — |
| Grapes | 🍎 Fruit | sweet, green, juicy | ♥♥♥♥♥ | 11 | 18 | 31 | — |
| Tangerine | 🍎 Fruit | sweet, juicy | ♥♥♥♥♥ | 10 | 16 | 27 | — |
| Strawberries | 🍎 Fruit | sweet, juicy | ♥♥♥♥♥ | 16 | 26 | 44 | — |
| Blueberries | 🍎 Fruit | sweet | ♥♥♥♥♥ | — | 38 | 65 | — |
| Carrot Sticks | 🥕 Veg | crunchy | ♥♥♥♥♥ | 6 | 10 | 17 | — |
| Cucumber Slices | 🥕 Veg | crunchy, green, juicy | ♥♥♥♥♥ | 6 | 10 | 17 | — |
| Cherry Tomatoes | 🥕 Veg | juicy | ♥♥♥♥♥ | 9 | 15 | 26 | — |
| Snap Peas | 🥕 Veg | crunchy, green | ♥♥♥♥♥ | — | 24 | 41 | — |
| Sweetcorn Cup | 🥕 Veg | sweet | ♥♥♥♥ | 17 | 28 | 48 | — |
| Crackers | 🧀 Snack | crunchy, salty | ♥♥ | 5 | 9 | — | — |
| Cheese Cubes | 🧀 Snack | cheesy | ♥♥♥ | 10 | 16 | 27 | — |
| Boiled Egg | 🧀 Snack | soft | ♥♥♥♥♥ | — | 15 | 26 | — |
| Popcorn | 🧀 Snack | crunchy, salty | ♥♥♥ | 11 | 18 | 31 | — |
| Pretzels | 🧀 Snack | crunchy, salty | ♥♥ | 11 | 19 | — | — |
| Trail Mix | 🧀 Snack | crunchy, sweet, nuts | ♥♥♥♥ | 17 | 28 | 48 | — |
| Water Bottle | 🧃 Drink | — | ♥♥♥♥♥ | 5 | 8 | 14 | — |
| Juice Box | 🧃 Drink | sweet, juicy | ♥♥ | 8 | 14 | 24 | — |
| Milk Carton | 🧃 Drink | cold | ♥♥♥♥ | 10 | 16 | 27 | 🧊 Ice Pack |
| Berry Smoothie | 🧃 Drink | sweet, cold | ♥♥♥♥ | — | 36 | 61 | 🧊 Ice Pack |
| Hot Chocolate | 🧃 Drink | warm, sweet, chocolatey | ♥ | 18 | 30 | — | 🫙 Thermos |
| Cookie | 🍪 Treat | sweet, crunchy | ♥ | 10 | 17 | 29 | — |
| Yogurt Pot | 🍪 Treat | soft, sweet, cold | ♥♥♥♥ | 12 | 20 | 34 | 🧊 Ice Pack |
| Chocolate Bar | 🍪 Treat | sweet, chocolatey | — | 14 | 24 | — | — |
| Cupcake | 🍪 Treat | sweet, soft | — | 19 | 32 | 54 | — |
| Brownie | 🍪 Treat | sweet, soft, chocolatey | — | 24 | 40 | 68 | — |

## Code

- `js/data.js` — every number: food, prices, shops, milbils, judges, kit.
- `js/state.js` — the save, and today's shop prices (worked out from the day
  number, so they hold still if you close the game and come back).
- `js/box.js` — drawing the lunchbox, and all the marking.
- `js/food.js` — the food, drawn flat in SVG.
- `js/milbil.js` — drawing milbils. Copied from Milbil Café.
- `js/ui.js` — sheets, toasts and sounds. Copied from Milbil Cooking.
- `js/main.js` — the screens and the day.

The game saves to `localStorage` after every change, including the half-packed
lunchbox, so closing it in the middle of the shop doesn't lose your morning.
