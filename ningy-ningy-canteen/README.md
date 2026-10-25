# 🚚 Ningy-Ningy Canteen

You start a canteen, and the canteen is a truck: the **Ningy-Ningy truck**,
with its name on a sign on the roof. Every morning you buy food at
**Billy's Supermarket**, pick your own prices, then drive around Milbil Town.
Wherever you park, the milbils having lunch there notice the truck and a
**queue collects** at your hatch. Each one reads your menu board and either
orders or walks off. Take their order, hand it over, and they pay.

**▶ Play it: https://dtalic2.github.io/gretas-space/ningy-ningy-canteen/**

No build step and no dependencies. Run it locally with:

```bash
python3 ningy-ningy-canteen/serve.py      # http://localhost:8133
```

---

## A day at the canteen

1. **Shop.** You start the day parked at Billy's with whatever money you made
   yesterday ($20 on day 1). Food comes in packs, and anything you don't sell
   stays in the truck for tomorrow.
2. **Set your prices.** The 📋 menu board, 50c at a time.
3. **Drive.** Lunch runs from 11:00 to 2:00. Tap a place on the map to drive
   there. The red number on each place is how many milbils there haven't had
   lunch yet. Driving takes time, so pick well.
4. **Serve.** The milbil at the hatch says what they want. Tap that food on the
   counter to hand it over; when they've got everything, they pay — sometimes
   with the exact money, sometimes with a note, and you see the change.
5. **Go somewhere else** once everyone's eaten, or back to Billy's if you're
   running out.

At 2:00 you get the day's report: who you served, who walked off and why, what
you sold, and your profit.

Parked, a minute on the clock is a second of real time; a whole lunch is three
minutes. The clock stops while you're looking at the map, the supermarket or
the menu board — but not while you're driving.

## Billy's Supermarket

Every price is a multiple of 50c, so the sums stay easy. Billy's shows the
price of **one** of each thing, so you can see straight away that milbils
expect double. Some things only come in packs, and the pack price is shown
underneath.

| Food | Billy's price, for one | Comes in | Milbils expect |
| --- | --- | --- | --- |
| Ice Block | 50c | a packet of 4, $2.00 | $1.00 |
| Spring Rolls (6-pack) | $2.00 | one 6-pack at a time | $4.00 |
| Lamb Kofta | $1.00 | one at a time | $2.00 |
| Beef Bowl | $1.50 | one at a time | $3.00 |
| Veggie Bowl | $1.50 | one at a time | $3.00 |
| Avocado Sushi | $1.00 | one at a time | $2.00 |
| Regular Pizza | $2.50 | one at a time | $5.00 |
| Mushroom Pizza | $2.50 | one at a time | $5.00 |
| XL Pizza | $3.00 | one at a time | $6.00 |
| Juice | 50c | a pack of 4, $2.00 | $1.00 |
| Pop Cake 🔒 | 50c | one at a time | $1.00 |
| Portable Waffle 🔒 | $2.00 | one at a time | $4.00 |

**Deals.** Every day Billy's puts two to four things on a deal: never
everything, and only things it sells one at a time, so the saving is the same
on every one you buy. A deal says how much you save on each one — "Save 50c on
each Beef Bowl" — rather than a percentage. Deals don't change what milbils
expect to pay: that's always worked out from the normal price.

**Unlocking.** Serve 10 milbils and Billy's starts selling you **Pop Cakes**
(50c each). Serve 30 and you can get **Portable Waffles** ($2 each).

You can put a pack back the same day for your money back, as long as all of it
is still in the truck.

## Prices and milbils

You pick your own prices on the 📋 menu board, 50c at a time. Milbils think a
fair price is about **double** what Billy's normally charges for one. Each milbil has their own limit, a bit above fair, and it wobbles a
little from day to day:

| Your price compared to fair | What milbils do |
| --- | --- |
| 🤩 three-quarters or less | They **spend lots**: they keep adding things to their order until they've nearly run out of money. |
| 😀 a bit under fair | They **spend more**: often one or two extra things. |
| 😀 fair | Buy what they want: something to eat, maybe a juice, maybe a treat. |
| 😐 up to a fifth more | Most still buy, but they **buy less** — just the main thing, no extras. |
| 😬 up to nearly half as much again | Lots of them **walk off**. |
| 😡 more than that | Almost nobody buys. |

The face next to each price on the counter and the menu board is what the
average milbil thinks. Low prices make milbils spend more money with you, but
you make less on each thing, and you sell out sooner. At fair prices a milbil
spends about $2.80; with everything 50c cheaper, about $3.60 on three or four
things. Fair prices still make the most profit.

**Taken aback.** When a milbil walks up and reads your board, anything on it
that costs more than *they* would ever pay makes them gasp and jump — "😲 $5.00
for a Beef Bowl?!" Then they either walk off, or grumble and buy something
else. Only the fussier ones mind a price that's a little high; put something up
to a lot more than fair and nearly everyone gasps. The day's report says how
many were taken aback.

A milbil also walks off if you've **sold out** of what they wanted, if they
**can't afford** anything on the board, or if they wait in the queue **too
long**.

## Lunch money

There are 48 milbils, and each one turns up with a different amount of money
every day: anything from **$1 to $10**, and **$5 on average**. Most milbils
have the lower amounts — $2, $3 or $4 is the most common, and half of them have
$4.50 or less — while about one in four has more, anything up to $10. Those few
are what pull the average up to $5.

A milbil with $1 can only buy something that costs $1 or less, however much they'd
like a Beef Bowl.

- **Saving.** Some mornings a milbil keeps a bit back for tomorrow 🐷. They tell
  you at the hatch ("Has $5.50 · keeping $1.50 for tomorrow") and won't spend
  it today. Waffle lovers save up when they can't quite afford one.
- **Making more.** Overnight every milbil gets new money for tomorrow, on top
  of whatever they saved (but never more than $10 all together). A few earn a
  bit extra too — washing the car, walking the neighbour's dog — and the day's
  report tells you who.

Anything a milbil doesn't spend or save goes on lunch somewhere else.

## Milbil Town

| Place | Who's there | They like |
| --- | --- | --- |
| 🏫 Milbil School | Sprouty, Giggle, Toothy, Freckles, Chomp, Doodle, Pickle, Bubbles, Zippy, Squeak, Dot | Ice Blocks, Pop Cakes, Spring Rolls |
| 🌳 Bilberry Park | Petal, Snooze, Bobbin, Puddle, Clover, Honey, Twig, Nibbles | Ice Blocks, Waffles, Juice |
| 🏖️ Ningy Beach | Sunny, Scoop, Fizz, Marzi, Splash, Shelly, Coral, Surfy | Ice Blocks, Juice — and sometimes only something cold |
| ⚽ Sports Field | Sporty, Tumble, Gus, Zig, Bounce, Dash, Kicks, Sprint | Beef Bowls, Lamb Koftas, Juice, XL Pizzas |
| ⛲ Town Square | Hattie, Royal Milbil, Cosy, Biscuit, Penny, Tinker, Lulu, Bramble | Sushi, Veggie Bowls, Waffles |
| 📚 The Library | Brainy, Wizzle, Quill, Hush (the library ghost), Owlet | Sushi, Juice |
| 🛒 Billy's Supermarket | nobody eats here | — |

Three days in four a milbil has lunch at their usual place; the fourth they turn
up somewhere else. The 📖 book shows where everyone is today, what they love,
and how much money they've got.

Chomp, Petal, Sunny, Hattie and Scoop are Greta's own drawings. The rest are
drawn by the game, the way Greta draws milbils.

## The Ningy-Ningy truck

| Upgrade | Cost | What it does |
| --- | --- | --- |
| ⛱️ Shady Umbrella | $10 | Milbils wait half as long again before giving up. |
| 🎵 Canteen Jingle | $15 | Milbils hear you coming and walk over twice as fast. |
| 🚀 Turbo Engine | $25 | Drive nearly twice as fast. |
| 💡 Fairy Lights | $40 | Milbils will pay 15% more before a price feels too high. |

The chalkboard on the side of the truck, next to the hatch, always shows how
much food you've got left to sell. It counts things you can hand over — an ice
block, a 6-pack of spring rolls, a juice — so a packet of 4 ice blocks adds 4.
The number goes yellow at 3 or fewer and the board goes red when you're out.

You can repaint the truck for free whenever you like. If you ever run out of
both money and food, Granny Ningy gives you $10 to get going again.

## Code

- `js/data.js` — every number: food, prices, places, milbils, upgrades.
- `js/state.js` — the save, money in cents, the day's deals and every
  milbil's lunch money (worked out from the day number, so it holds still if
  you close the game and come back), and the overnight sums.
- `js/orders.js` — what a milbil orders, or why they walk off.
- `js/town.js` — the map, the roads and the route the truck takes.
- `js/truck.js` — the truck, big and small.
- `js/food.js` — the food, drawn flat in SVG.
- `js/milbil.js` — drawing milbils. Copied from the Lunchbox Simulator.
- `js/ui.js` — sheets, toasts and sounds. Copied from the Lunchbox Simulator.
- `js/main.js` — the day: the queue, the hatch, driving, the sheets.

The game saves to `localStorage` as you play. Close it in the middle of lunch
and you come back parked in the same place at the same time; the queue will
have wandered off, but they'll come straight back over.
