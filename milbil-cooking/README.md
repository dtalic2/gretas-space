# 🍳 Milbil Cooking

You're a milbil chef with a little café. Hungry milbils come in and order food.
Follow the recipe one step at a time: drag each ingredient down from the shelf
onto the counter, then swipe to chop, mash, stir and squeeze. Serve it right and
they pay you. You start with just Toast: buy new food that sells for more and
more, and spend your coins on tables, ordering machines and new restaurants,
from a **Little Café** or a **Drive-Through** to the **Milbil Palace**.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-cooking/**

No build step and no dependencies. Run it locally with:

```bash
python3 milbil-cooking/serve.py      # http://localhost:8129
```

Tap **Add to Home Screen** on a phone and it opens full screen like an app.

---

## Your sign

When you first open your café you make its sign. **Type your restaurant's name**
(🎲 suggests one, like *The Hungry Milbil* or *Greta's Kitchen*), then pick:

- **A font:** Rounded, Blocky, Swirly, Diner, Cartoon, Marker, Pixel, Neon, Fancy or Spooky
- **A colour** for the writing, including gold and rainbow
- **A background:** the restaurant's own colour, eight plain colours, a chalkboard,
  wood, glowing neon, candy stripes, polka dots, gold or rainbow

The sign hangs over the dining room and changes as you choose. Long names
shrink and wrap onto two lines to fit. Tap the sign (it has a ✏️) or use
⚙️ Settings → **Restaurant sign** to change it any time. Leave the name empty and
it says "Greta's Little Café", and changes to whichever restaurant you're in.

The fonts are in `fonts/`, so they look the same on every phone and tablet and
work offline. They're free fonts from Google Fonts (Bungee, Pacifico, Lobster,
Chewy, Permanent Marker, Press Start 2P, Monoton, Abril Fatface and Creepster),
with each one's licence beside it.

## How it plays

1. **A customer comes in** and sits at a free table. A red **!** means they're
   ready to order. Tap them to see what they want, and tap **🍳 Cook it!**
2. **The kitchen** shows the recipe card at the top, a shelf of ingredients, and
   the counter. The step you're on is highlighted:

   > Nachos with Guacamole
   > 1. Pour the nachos into the bowl
   > 2. Mash the avocado
   > 3. Chop the onion
   > 4. Serve together!

3. **Drag the ingredient down** onto the counter to use it. You drag the nacho
   bag down to pour the nachos in. The shelf always has a few things that don't
   belong, so read the step. Tapping a card just shows you which way to drag it.
4. **Then swipe** to do the step. A tool shows you how, and a bar fills up:

   | Step | What you do |
   | --- | --- |
   | Pour, add | Nothing more. Dragging it in is enough |
   | Chop, squeeze | Swipe down |
   | Mash, grate, roll | Swipe up and down |
   | Spread, shake | Swipe side to side |
   | Stir, blend, fry, boil | Swipe round and round, anywhere on the counter |
   | Cook (pancakes, burgers, eggs…) | Wait for the sizzle, then swipe up to flip |
   | Toast | Swipe down to push the lever, then wait for it to pop |

5. **Tap 🍽️ Serve.** If you followed every step in the right order with nothing
   extra, your chef carries it out and the customer pays. If anything went wrong
   (the wrong ingredient, something too early, too much of something, or a step
   missed), you're told what and the dish goes in the bin. **Try again.** Pressing
   Serve before you've finished just tells you the next step.

Stuck on a step for a few seconds? The right ingredient on the shelf starts to glow.
🗑️ starts the dish again, and 🏠 goes back to the restaurant without losing it.

Customers keep coming in while you cook. Serve quickly (within 45 seconds of
ordering) for a ⭐ tip of a fifth of the price, or a tenth within 90.

Milbils like the fancy stuff. Each dish on your menu is **twice as likely** to be
ordered as the next cheaper one, so the dearest thing you sell comes up about
half the time and the cheap ones still turn up now and then.

Now and then one of **Greta's own drawings** (Petal, Chomp, Hattie, Sunny or Scoop)
comes in as a ⭐ **VIP** and pays double. They're the cut-out pictures from
`milbil-town-3d/art/`.

## Buying food

You start with **Toast**. 📖 **Menu** shows what you sell and every dish you can
buy, with its recipe. Each new dish sells for more than the last, in round steps
that go up and up, and costs the next step to buy. You can buy any dish you have
the coins for.

| Dish | Sells for 🪙 | Costs 🪙 |
| --- | --- | --- |
| Toast | 3 | you start with it |
| Fruit Salad | 5 | 10 |
| Nachos with Guacamole | 10 | 20 |
| Jam Toast | 20 | 50 |
| Yogurt | 50 | 100 |
| Berry Smoothie | 100 | 200 |
| Hot Chocolate | 200 | 500 |
| Pancakes | 500 | 1,000 |
| Garden Salad | 1,000 | 2,000 |
| Hot Dog | 2,000 | 5,000 |
| Ice Cream Sundae | 5,000 | 10,000 |
| Tacos | 10,000 | 20,000 |
| Spaghetti | 20,000 | 50,000 |
| Cheeseburger | 50,000 | 100,000 |
| Waffles | 100,000 | 200,000 |
| Strawberry Milkshake | 200,000 | 500,000 |
| Fried Rice | 500,000 | 1,000,000 |
| Pepperoni Pizza | 1,000,000 | 2,000,000 |
| Fruit Tart | 2,000,000 | 5,000,000 |
| Chicken Curry | 5,000,000 | 10,000,000 |
| Ramen | 10,000,000 | 20,000,000 |
| Birthday Cake | 20,000,000 | 50,000,000 |

## Restaurants

Buy **any restaurant you have the coins for**, in any order, and move between the
ones you own from 🛠️ Upgrade → **Restaurants**. Your tables and machines come with
you. When you move, anyone still waiting goes home and the doors open again.

| Restaurant | Cost 🪙 | Room for |
| --- | --- | --- |
| Little Café | you start here | 3 tables |
| Corner Bistro | 500 | 5 tables |
| Drive-Through | 2,000 | 6 cars |
| Family Restaurant | 10,000 | 7 tables |
| Grand Diner | 100,000 | 9 tables |
| Milbil Palace | 1,000,000 | 12 tables |

**The Drive-Through** has no tables. Milbils drive up in cars and queue along a
winding lane. They order at the speaker as they pull in, so every order goes
straight into the 🧾 **Orders** list and customers arrive quickly. When the food is
ready it goes out of your window in a takeaway bag, the car drives off, and
everyone behind moves up.

## Upgrades

🛠️ **Upgrade** has three tabs: **Food** (the next dishes to buy), **Restaurants**,
and **Tables & machines**. A red **!** on Menu or Upgrade means you can afford
something.

- **Tables.** You start with 2. Each one lets another customer in at once. They
  cost 🪙20, 100, 500, 2,000, 5,000… A restaurant only has room for so many, and
  shows as many of yours as fit. You can also tap the dashed **+ Table** spot on
  the floor.
- **Ordering machines** (🪙100, 10,000, 1,000,000). Customers order on the machine
  as they walk in, so you don't have to go and take their order. Once you have
  one, a **🧾 Orders** button appears at the bottom (and in the kitchen) listing
  every order. Tap one and the kitchen is set up for it. Each extra machine
  brings customers in faster.

## Style

Everything is drawn flat in SVG: one or two tones per shape, a white shine, a
soft shadow and no outlines, on soft coloured cards. A cooked ingredient is
drawn as a "look" (pieces, slices, a blob, a drizzle, a spread…) that stacks onto
the dish, and the menu pictures are made the same way from the whole recipe. So
the dish you make looks like the one on the menu. Milbils are drawn the way
Greta draws them, with the same code as Milbil GO.

## Code

| File | What's in it |
| --- | --- |
| `js/data.js` | Every number: ingredients, actions and their gestures, the 22 recipes and their prices, restaurants, table and machine prices, how much milbils prefer dear food, sign fonts, colours and backgrounds |
| `js/food.js` | Ingredient icons, how cooked food looks on a dish, plates and bowls, stations (board, pan, pot, blender, toaster) and tools |
| `js/kitchen.js` | Dragging from the shelf, swipe detection, cooking each step, and checking the dish when you serve it |
| `js/restaurant.js` | The dining room (customers walking in, ordering, eating; your chef carrying food out) and the Drive-Through (cars queueing, the bag out of the window) |
| `js/milbil.js` | Draws a milbil as SVG, including your chef's hat and apron |
| `js/main.js` | Start-up, the menu, orders, upgrades and settings, and the game loop |
| `js/sign.js` | Your restaurant's sign, fitting it to the wall, and the sign maker |
| `js/state.js` | Saving, and spending and earning coins |
| `js/ui.js` | Sheets, pop-up cards, toasts and sounds |

The game saves to `localStorage` after every sale and purchase. Customers in the
room aren't saved: after a reload the doors open again. In the browser console,
`COOK.coins(1000)` adds coins for testing and `COOK.wipe()` starts again.
