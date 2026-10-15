# ☕ Milbil Café

Blooket's Café game, with milbils as the customers. Milbils come in hungry for
breakfast. You serve them, answer questions to restock your food, and spend what
you earn on new food, upgrades and a fancier café. It has the same nine foods as
Blooket Café, at the same prices, and the same look: chunky lettering, bright
buttons, and four coloured answer boxes.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-cafe/**

No build step and no dependencies. Run it locally with:

```bash
python3 milbil-cafe/serve.py      # http://localhost:8128
```

Tap **Add to Home Screen** and it opens full screen like an app.

---

## Two ways to play

On the start screen you pick:

- **🌈 Free play.** No clock. Your café is saved, so you can keep building it up
  over days. This is how the game played before time mode.
- **⏱️ Time mode.** Pick **2, 3, 5, 7, 10 or 15 minutes** and race ten other milbil
  cafés. Everyone starts from nothing: just Toast and $0. After **3, 2, 1, Go!**
  the clock counts down in the corner of the café. It also shows on the question
  screen and in the shop, and ticks through the last 10 seconds. When it hits
  zero, **whoever has the most cash wins**. Spending is how your café grows, but
  money you've spent doesn't count at the end, so stop shopping near the finish.

A race is a separate café. It never touches your free-play save.

### The end of a race

When the time's up you get:

- **The podium:** 1st, 2nd and 3rd, with each café's milbil and cash.
- **Your review**, every time, wherever you came: your place out of 11, your
  cash, how far you were from the place above (or "You won!"), and how the game
  went: milbils served, questions right, foods on your menu and café level.
- **Your best** for that length of race, saved, with 🏅 when you beat it.
- **See all 11 places** for the full leaderboard, then **🔁 Play again** or
  **🏠 Start screen**.

⚙️ Settings has **🏁 Finish the race now**, which ends it early and still shows
the podium and your review.

## How it plays

1. **Serve.** Up to three milbils wait in the café at a time, each with a speech
   bubble showing its order. **Tap a milbil** to serve it everything you have. You
   get paid for each serving straight away. Once the whole order is served, the
   milbil says *Yum!* and leaves, and another comes in. Customers never run out of
   patience.
2. **Restock.** Each food sits on a plate with a number showing how many servings
   are left. When you run low, tap **Restock Food** (or press Space) and answer a
   question. A right answer adds **5 servings of every food on your menu**. A wrong
   answer shows you the right one. Either way **the next question comes up by
   itself**, so you can keep restocking for as long as you like. Tap **Back to the
   café** when you've got enough. Your cash shows at the top while you answer.
3. **Auto-serve.** Tap **🤖 Auto-serve** next to Restock Food (or on the question
   screen, or press A) and milbils get served without tapping them, even while
   you're answering questions. It serves one milbil about every half a second,
   only hands out food that was ordered, and serves milbils whose whole order is
   ready first. Tap it again to turn it off. It stays on or off next time you play.
4. **Shop.** Open it any time, like a Blooket live game. It has three tabs: Food,
   Café and Abilities.

You start with **Toast** and 5 servings of it. On your first game, hints show you
what to do next: serve, restock, then buy Cereal.

### Questions

On the start screen (and in ⚙️ Settings) you choose what the restock questions are:

- **Times tables.** Pick any of 1 to 12. The default is 2, 5 and 10.
- **Adding**, up to 20.
- **Take away**, within 20.
- **Mix them up.** All three.

Every question has four answers: the right one and three wrong ones that look
right, such as the next fact along, an answer one off, or the digits swapped.
On a computer, keys 1 to 4 pick an answer, Space skips to the next question, and
Escape goes back to the café.

## The menu

These are Blooket Café's foods, unlock costs, upgrade costs and prices. Each food
has five levels and goes on a new colour of plate at each one: white, light
blue, emerald, violet, then gold.

| Food | Unlock | Lv 2 | Lv 3 | Lv 4 | Lv 5 | Sells for (Lv 1 → Lv 5) |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Toast | free | $300 | $5,250 | $42,500 | $130,000 | $2 · $53 · $525 · $1,750 · $3,500 |
| Cereal | $5 | $1,500 | $26,250 | $212,500 | $650,000 | $18 · $263 · $2,625 · $8,750 · $17,500 |
| Yogurt | $10 | $4,500 | $78,750 | $637,500 | $1,950,000 | $53 · $788 · $7,875 · $26,250 · $52,500 |
| Breakfast Combo | $50 | $9,000 | $157,500 | $1,275,000 | $3,900,000 | $105 · $1,575 · $15,750 · $52,500 · $105,000 |
| Orange Juice | $200 | $15,000 | $262,500 | $2,125,000 | $6,500,000 | $175 · $2,625 · $26,250 · $87,500 · $175,000 |
| Milk | $500 | $22,500 | $393,750 | $3,187,500 | $9,750,000 | $263 · $3,938 · $39,375 · $131,250 · $262,500 |
| Waffle | $2,000 | $31,500 | $551,250 | $4,462,500 | $13,650,000 | $368 · $5,513 · $55,125 · $183,750 · $367,500 |
| Pancakes | $5,000 | $42,000 | $735,000 | $5,950,000 | $18,200,000 | $490 · $7,350 · $73,500 · $245,000 · $490,000 |
| French Toast | $7,500 | $54,000 | $945,000 | $7,650,000 | $23,400,000 | $630 · $9,450 · $94,500 · $315,000 · $630,000 |

A newly unlocked food comes with 5 servings, so you can serve it right away.
Customers order 1 to 3 different foods from your menu, 1 to 3 of each.

The foods are drawn with little faces, the way Blooket draws them. They're our
own drawings (`js/food.js`), not Blooket's art.

## Café levels

A café upgrade makes **everything** sell for more, and redecorates the café.

| Level | Cost | Everything sells for | Look |
| --- | ---: | --- | --- |
| 1 | — | ×1 | Cosy Corner (wooden floor) |
| 2 | $2,500 | ×1.5 | Seaside Blue |
| 3 | $250,000 | ×2 | Garden Green, with plants |
| 4 | $2,500,000 | ×2.5 | Starlight, with fairy lights |
| 5 | $25,000,000 | ×3 | Solid Gold |

## Abilities

These have Blooket's names and prices. Unlike Blooket, you can use each one as
often as you like, at the same price every time. So there's no Run It Back,
which in Blooket buys back abilities you've used. Using Happy Customers, Trash
the Food or Health Inspection again while it's still going adds more time
instead of starting over. In Blooket some of them are aimed at other players.
Here they hit the other cafés in town.

| Ability | Cost | What it does |
| --- | ---: | --- |
| 💵 Paycheck Bonus | $500 | Adds 25% to your cash |
| 📦 Supply Crate | $1,000 | 20 more servings of every food on your menu |
| 😊 Happy Customers | $2,500 | Every milbil pays double for 30 seconds |
| 🗑️ Trash the Food | $5,000 | A café you pick earns nothing for 20 seconds |
| 🧾 TAXES!!! | $7,500 | Every other café pays you 10% of its cash |
| 🔍 Health Inspection | $10,000 | A café you pick is shut for 30 seconds |

## The leaderboard

In Blooket you race the rest of the class. Here you race ten other milbil cafés.
Five are run by Greta's own drawings (**Chomp**, **Hattie**, **Scoop**, **Petal**
and **Sunny**) and five by drawn milbils (**Royal**, **Wizzle**, **Starry**,
**Sporty** and **Cosy**). 🏆 in the top bar shows your place, and tapping it
shows everyone's cash. Like Blooket, the leaderboard counts the cash you're
holding, so a big shopping trip can drop you down a few places for a while.
The other cafés never use abilities on you.

**In free play** the other cafés earn at about your pace, a little slower when
they're well ahead and a little faster when they're well behind, so it stays a
race however far you've got.

**In time mode** every other café really plays. It starts with Toast and $0,
earns from the foods it has, and buys whichever upgrade pays best, as long as
there's time left for it to pay for itself. Each milbil has its own speed, so
they don't speed up when you do. Play well and you'll beat them. Chomp and
Hattie are the quickest, and Cosy is the slowest. Scoop, Sunny, Wizzle and
Sporty keep shopping too close to the end and finish with less cash than they
could have. Each race, every café is up to 12% quicker or slower than usual,
so no two races are the same.

The speeds were set by playtesting with a robot that answers every question
right in 3 seconds and taps a milbil about twice a second. In a 2-minute race,
with no shopping in the last 30 seconds, it came 1st with $27,047, ahead of
Chomp's $15,158, and the slowest café had $3,955. A slower player, or one who
keeps spending until the end, will usually land somewhere in the middle.

## The milbils

Customers are drawn the way Greta draws milbils: a tall box with a line across
the middle, stick arms and stick legs, plus a hat or a feature or two. There are
21 drawn kinds, the same ones as in Milbil GO. **Petal** and **Sunny**, two of
Greta's own drawings, come in now and then too. You're the chef, a milbil in a
chef's hat and apron.

## Code

| File | What's in it |
| --- | --- |
| `js/data.js` | Every number: the menu, plates, café levels, abilities, rivals, customers |
| `js/food.js` | The nine foods, drawn as SVG |
| `js/milbil.js` | Draws a milbil as SVG (from Milbil GO, plus a chef's hat and apron) |
| `js/cafe.js` | The café floor: customers walking in, orders, serving, Auto-serve, the plates |
| `js/quiz.js` | Restock Food: questions one after another, Correct / Incorrect, and the Auto-serve switch |
| `js/questions.js` | Makes questions and believable wrong answers |
| `js/shop.js` | The shop and what each ability does |
| `js/rivals.js` | The other cafés, how they earn and shop, and the leaderboard |
| `js/race.js` | Time mode: the countdown, the clock, the podium and your review |
| `js/game.js` | Your save while playing, money, stock, and a tiny event bus |
| `js/state.js` | Loading and saving |
| `js/audio.js` | Little sounds, made on the spot |
| `js/main.js` | Start-up, the start screen, settings, hints and the game loop |

The game saves your free-play café, settings and best race results to
`localStorage` every few seconds. A race in progress isn't saved, so reloading
the page ends it. In the browser console, `CAFE.cash(n)` adds money for
testing, `CAFE.endRace()` runs a race's clock out, and `CAFE.wipe()` starts
again.

The lettering is Titan One and Nunito from Google Fonts. Offline, it falls back
to a rounded system font.
