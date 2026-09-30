# 🌻 M-I-L-B-I-L Garden

A farming and trading game. You're a milbil farmer with **4 plots of land and 10
coins**. Grow crops, send them to market, and price them against the other farmers
to win the shoppers. Then spend what you earn on more land, sheds and greenhouses
for exotic fruit.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-garden/**

No build step and no dependencies. Run it locally with:

```bash
python3 milbil-garden/serve.py      # http://localhost:8126
```

---

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

## Your stall keeper

A milbil wants to mind your market stall. In the Market tab, tap **Name them** to
give them a name (🎲 suggests one) and pick their colour. They then sit at the
top of your stall and chat about how it's going: "Send me some crops to sell!",
"3 sold today! 🎉", and a "Ka-ching! 🔔" and a hop whenever something sells.
Rename them with 🏷️ there or in the Storage tab. Starting a new farm keeps both
your milbil and your keeper.

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
- your price, with −50 / −5 / − / + / +5 / +50 buttons and quick picks: **Match lowest**,
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
- `js/milbil.js` draws your milbil as an SVG and lists the looks you can pick.
- `js/main.js` holds the UI, including the milbil editor.

The game saves to `localStorage` every few seconds. Crops keep growing while you're
away because growth uses real timestamps, but the market only runs while the game
is open.
