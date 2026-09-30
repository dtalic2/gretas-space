# 🌻 M-I-L-B-I-L Garden

A 3D farming and trading game. You're a milbil farmer with **4 plots of land and 10
coins**. Grow crops, send them to market, and price them against the other farmers
to win the shoppers. Then spend what you earn on more land, sheds and greenhouses
for exotic fruit.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-garden/**

Built with **Three.js**, which is vendored in `vendor/`. No build step and nothing
to install. Run it locally with:

```bash
python3 milbil-garden/serve.py      # http://localhost:8126
```

---

## The world

The whole farm is a 3D world you can look around:

- **Your farm:** wooden beds inside a white fence. Crops grow as little 3D models:
  carrots poke out of the soil, corn grows tall, tomatoes climb stakes, and mango,
  star fruit and coconut grow into trees. Land you don't own yet is grass with a
  for-sale peg.
- **The market square:** Bramble 🦊, Old Mo 🐻, Posy 🐰 and Hank 🦝 each stand behind a
  striped stall. The sign above each stall shows today's prices, and crates on the
  counter show what they have left. Your stall is at the front, in your milbil's
  colour. Little shoppers wander between the stalls, and one hurries to yours when
  you make a sale.
- **Your buildings:** sheds, the barn, the glass greenhouse and the Tropical Dome
  appear in the yard with a pop when you buy them. Sprinklers spin in the corners
  of the field, the scarecrow stands at the back, and your painted sign goes up
  by your stall.
- **Your milbil runs where you send it.** Tap the ground and it runs there (a
  ring marks the spot), or steer it with **WASD** / the arrow keys; hold Shift to
  walk. The camera follows it. When you leave it alone it goes back to pottering
  round the field after a while.
- **Your stall** is a proper wooden market stand: a pitched roof in your milbil's
  colour, bunting, a painted front, shelves of jars at the back, a bell, a
  "Greta's Stall" board on the roof, and a chalkboard out front listing today's
  prices.
- **The sky follows the market day:** from a pink sunrise through bright day and
  golden hour to a pink dusk, when the lamps and cottage windows light up. Clouds
  drift, butterflies flutter and the chimney smokes.

| Action | Mouse | Touch |
| --- | --- | --- |
| Plant, harvest, open a stall | click | tap |
| Spin the view | drag | drag one finger |
| Zoom | scroll wheel | pinch |
| Move the view | right-drag | drag two fingers |
| Run somewhere | click the ground | tap the ground |
| Steer your milbil | WASD / arrow keys (Shift walks) | — |
| Run to your stall | 🏃 **My stall** button, or tap the stall | same |
| Jump the camera to the farm, market or yard | 🌾 🏪 🏗️ buttons | same |

Floating tags over each bed show how long is left, and ✨ when a crop is ready.
The **Sell**, **Land**, **Build**, **Storage** and **News** buttons slide up a
sheet with those screens. On a phone the view moves up so you can still see the
world above the sheet. Tapping a stall, a for-sale plot or a building opens the
right sheet too.

## Your stall keeper

The first time your milbil runs to your stall, you meet the **stall keeper**, a
milbil in a green apron who stands on a crate behind your counter. **You name
them** (🎲 suggests one) and pick their colour. After that their name goes on
your stall's board ("Greta's Stall, with Bun") and in the Sell screen.

The keeper:

- says hello when you arrive, with news: "Hi Greta! 3 sold today! 🎉", or a
  reminder to bring crops if the stall is empty
- hops, cheers and rings the bell when something sells
- turns to watch your milbil when it's nearby

Tap the keeper while you're at the stall, or use 🏷️ in the Storage screen, to
rename them. Starting a new farm keeps both your milbil and your keeper.

Tapping any stall sends your milbil running to it. At your own stall the keeper
greets you and the Sell screen opens. At a rival's stall the rival says
something in character; Bramble brags about his cheapest price and Posy shows
off her dearest. Rival stalls open the Sell screen too, so you can compare
prices.

## Your milbil

On your first visit you make your milbil, the farmer you play as. Give it a
**name** (up to 14 letters) and pick its **colour** (10), **hat** (straw hat, cap,
beanie, flower crown, sprout, crown or none), **eyes** (round, happy, sparkly,
sleepy, wink) and an **extra** (glasses, freckles, bow or scarf). You can't skip
naming it. 🎲 picks a random name and ✨ *Surprise me* randomises the whole look.

Your milbil and its name appear in the top corner, in the farm's title
("Greta's Farm"), on your market stall next to the rivals' stalls, and in the
market news when Bramble undercuts you. Tap your milbil any time, or use
🎨 *Change my milbil* in the Storage tab, to change it. Starting a new farm keeps
your milbil.

## The loop

1. **Plant.** Pick a seed from the bar and tap soil. Each seed costs coins.
2. **Harvest.** Ripe crops sparkle ✨. Tap them (or 🧺 Harvest all) to move them into
   **storage**. When storage is full you can't harvest, so build sheds.
3. **Sell.** In the 🏪 Market tab, send crops from storage to your **stall** and set
   a price. Your stall has a limited number of spaces.
4. **Grow.** Buy land from other farmers, and build sheds, a barn, a bigger stall,
   sprinklers, a scarecrow, a sign, and greenhouses for exotic fruit.

A **market day** lasts 60 seconds. At the end of each day you get a sales report.
Then prices move, rivals restock, and new land goes up for sale.

## Pricing against the competition

Every shopper has a price they're willing to pay, somewhere between 75% and 135%
of the day's **guide price**. Each shopper buys from the **cheapest stall they can
afford**, with a little randomness, so a stall that's 1 coin dearer still makes the
odd sale.

For every crop you're selling, the Market tab shows:

- the **guide price** and whether it went up ▲ or down ▼ today
- every rival stall selling that crop, with its price and how many it has left
- your price, with −5 / − / + / +5 buttons and quick picks: **Match lowest**,
  **Undercut**, **Guide price**, and **Premium** (only when nobody else is selling)
- a **forecast** of how fast you'll sell at that price. It replays 300 sample
  shoppers against today's stalls.
- your profit per crop after the seed cost

The **price board** lists every crop's seed cost, guide price, cheapest rival and
number of shoppers. Tap a row to price-check a crop before you grow it.

Prices follow supply and demand. If shoppers went home empty-handed yesterday, the
guide price rises. If stalls were left full, it falls. Prices always drift back
toward normal over time, and the number of shoppers grows each day as the town
grows.

### The rivals

| Farmer | Style |
| --- | --- |
| 🦊 Bramble | Undercutter. Every 8 seconds he reprices to 1 coin under the cheapest stall, **including yours**. He never goes below ~72% of the guide price. |
| 🐻 Old Mo | Steady. Sells at the guide price all day. |
| 🐰 Posy | Premium. Small batches at 12–30% over guide. She's the only rival with a hothouse. |
| 🦝 Hank | Wild. Picks a price anywhere from 80% to 130% of guide. |

Rivals bring a set amount to market each morning, so once they sell out, the dearer
stalls get their turn.

## Crops

| Crop | Seed | Grows | Guide price | Needs |
| --- | --- | --- | --- | --- |
| 🥬 Lettuce | 2 | 15s | 5 | — |
| 🥕 Carrot | 3 | 22s | 8 | — |
| 🥔 Potato | 5 | 30s | 12 | — |
| 🌽 Corn | 8 | 40s | 19 | — |
| 🍅 Tomato | 12 | 50s | 28 | — |
| 🍓 Strawberry | 18 | 60s | 42 | — |
| 🍆 Eggplant | 26 | 75s | 60 | — |
| 🎃 Pumpkin | 40 | 90s | 90 | — |
| 🍉 Watermelon | 60 | 110s | 135 | — |
| 🍍 Pineapple ✦ | 90 | 120s | 230 | Greenhouse |
| 🥝 Kiwi ✦ | 110 | 130s | 285 | Greenhouse |
| 🥭 Mango ✦ | 140 | 150s | 360 | Greenhouse |
| 🥥 Coconut ✦ | 220 | 180s | 560 | Tropical Dome |
| ⭐ Star Fruit ✦ | 340 | 210s | 880 | Tropical Dome |
| 🍈 Golden Melon ✦ | 520 | 240s | 1,400 | Tropical Dome |

**Exotic fruit ✦** costs more to grow: expensive seeds, long grow times, and a
greenhouse first. In return it sells for much more, and only one rival (if any)
competes with you for it.

## Land

The 🗺️ Land tab lists plots the other farmers are selling today. Each offer is
tagged *bargain*, *fair* or *pricey*, and it disappears at the end of the day. Hank's
prices swing the most, and Posy never sells cheap. The **council** always has one
plot for sale, at 50% over a fair price. Each plot costs about 28% more than the
last, and a farm can hold up to 30.

## Buildings

| Building | Cost | Effect |
| --- | --- | --- |
| 🛖 Tool Shed | 30, ×1.9 each (max 6) | +15 storage |
| 🏚️ Big Barn | 450 | +60 storage |
| 🎪 Bigger Stall | 45, ×2.2 each (max 4) | +12 stall spaces |
| 🧑‍🌾 Scarecrow | 80 | 15% chance of a double harvest |
| 💦 Sprinklers | 140 | everything grows 30% faster |
| 🪧 Painted Sign | 160 | shoppers will pay up to 6% more to buy from you |
| 🏡 Greenhouse | 260 | unlocks Pineapple, Kiwi, Mango |
| 🌴 Tropical Dome | 1,600 | unlocks Coconut, Star Fruit, Golden Melon |

## Code

- `js/data.js` holds every number: crops, rivals, buildings, plot prices.
- `js/game.js` holds the state, farming, and the market simulation (no DOM).
- `js/milbil.js` draws your milbil as an SVG (for the menus) and lists the looks you can pick.
- `js/milbil3d.js` builds the same milbil in 3D.
- `js/world.js` holds the 3D scene: layout, sky, picking, running, speech bubbles, the stall keeper, and keeping the world in step with the game.
- `js/models3d.js` has every 3D model (crops, stalls, rivals, buildings, scenery), built from simple shapes.
- `js/kit.js` has the shape and material helpers. `js/camera.js` is the orbit camera.
- `js/main.js` holds the menus and sheets, including the milbil editor.

The game saves to `localStorage` every few seconds. Crops keep growing while you're
away because growth uses real timestamps, but the market only runs while the game
is open.
