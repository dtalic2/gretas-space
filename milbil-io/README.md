# 🟪 Milbil.io

paper.io, with milbils. You walk a milbil around a round black island, where
the glowing milbils stand out. Walk out of your land and you leave a trail
behind you. Come back in and the trail, and
everything inside it, becomes your land. Cut through another milbil's trail to
catch it. But if anyone touches *your* trail before you're home, you're caught.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-io/**

No build step and no dependencies. Run it locally with:

```bash
python3 milbil-io/serve.py      # http://localhost:8130
```

Tap **Add to Home Screen** and it opens full screen like an app.

---

## How it plays

1. **Pick your milbil** on the start screen: one of Greta's five drawings
   (**Chomp**, **Hattie**, **Scoop**, **Petal** and **Sunny**) or one of the 21
   drawn milbils from Milbil Café and Milbil GO. Your land is your milbil's
   colour. The **Rainbow** milbil gets rainbow land.
2. **Steer.** Your milbil waits on its little patch of land until you first
   steer, then it never stops walking.
   - **Phone or tablet:** drag. Put your finger down anywhere and slide it the
     way you want to go, like paper.io. Keep your finger down and keep
     steering: your milbil turns whichever way you slide, for as long as you
     hold on. The way it heads is measured from a point that trails just behind
     your finger, so it turns as soon as your finger changes direction, and a
     small slide back is enough to turn round. A ring shows that point, with a
     knob leaning the way you're steering. Let go and your milbil keeps walking
     the same way. A second finger is ignored.
   - **Computer:** your milbil walks towards the mouse pointer. The arrow keys
     and WASD work too.
3. **Fill in land.** Step out of your land and you leave a trail. Walk back in
   and the trail becomes land, along with everything it closes off, even other
   milbils' land. `+0.42%` floats up to show how much you got.
4. **Catch milbils.** Walk across another milbil's trail while it's out and
   it's caught: it pops, and its land disappears. 💥 counts how many you've
   caught.
5. **Don't get caught.** You're caught if:
   - another milbil walks across your trail before you're home,
   - you walk into your own trail,
   - you bump into a milbil while you're out and it's at home (or it's bigger
     than you and you're both out), or
   - somebody fills in all of your land.

   Then you see how you did: the most land you had, milbils caught, your best
   place on the leaderboard and how long you lasted. Your bests are saved.

The edge of the island is a wall: you slide along it. Land against the edge
can't be closed off with it, so walk your loop all the way round.

The leaderboard in the top corner shows the five milbils with the most land,
and you if you're not one of them. The milbil in first place wears a 👑. You get
a cheer at 1%, 5%, 10%, 25%, 50% and 75% of the island (and at all of it),
and when you go into first place. The map in the bottom corner shows the whole island, with you as
the white dot. ⏸ pauses (so does Escape or P, and so does switching away from
the game).

## The other milbils

Ten other milbils play on the island, and they play the way people play
paper.io: step out, walk a box-shaped loop, and come back in. Greta's five
drawings are always there (the other four, if you're playing as one of them),
and drawn milbils picked at random each game make up the rest. When one is caught it comes back a few seconds later somewhere else with
a fresh patch of land. Every so often each one has a think:

- **Could somebody reach my trail before I get home?** Then it hurries home,
  the shortest way round its own trail.
- **Is somebody's trail close by?** Then it goes and cuts it.

On the start screen you choose how they treat you:

| | They chase your trail | Your trail | Lasts* |
| --- | --- | --- | --- |
| 😊 **Friendly** | Never | They walk round it | about 3¾ minutes |
| 🙂 **Normal** | About a third of them, if it's within 7 cells | They walk round it unless they're chasing you | about 1¾ minutes |
| 😈 **Sneaky** | All of them, from up to 18 cells away | They walk straight across it | about 35 seconds |

\*How long a careful robot player lasted on average, over 40 games each
(Friendly games were stopped at 5 minutes, so it's really longer). They
always chase and catch each other.

## Numbers

All in `js/data.js`.

| | |
| --- | --- |
| The island | a circle with a radius of 78 cells: 19,116 cells |
| Your first patch of land | 21 cells, about 0.11% |
| Walking speed | 6.5 cells a second, the same for everyone |
| Tightest turn | about 1.5 cells round |
| On screen | 20 cells across the shorter side |
| A caught milbil comes back | after 2½ to 5 seconds |

## The milbils

The island is black so the milbils glow on it, with a glowing purple line
round its edge. Trails glow in their milbil's colour.

Drawn milbils are drawn the way Greta draws them: a tall box with a line
across the middle, stick arms and stick legs, plus a hat or a feature or two.
They're the same 21 kinds as in Milbil Café and Milbil GO (`js/milbil.js` is
copied from Milbil Café). On the island each one gets a glow in its own colour
(`js/sprites.js`).

Greta's five drawings are the same glowing pictures as in Milbil Café, with
the insides of their bodies filled in with the island's black. On the black
island they look like neon signs, and on top of coloured land their dark
bodies keep the glowing lines easy to see. On the start screen and the
"caught" card they sit on black tiles too, so they glow there as well.

When two milbils on the island would have land of nearly the same colour, the
second one gets a different colour, so everyone's land is easy to tell apart.

## Code

| File | What's in it |
| --- | --- |
| `js/data.js` | Every number, the three kinds of other milbils, and everyone you can play as |
| `js/world.js` | The island: land, trails, filling in, catching and bumping. Doesn't touch the page |
| `js/bots.js` | How the other milbils play |
| `js/input.js` | Steering: dragging (Touch Events, so phones can't cancel a drag halfway), the mouse and the keys |
| `js/draw.js` | Drawing the island, the land as smooth shapes standing up off the ground, trails, milbils, the mini-map |
| `js/sprites.js` | Turns each milbil into a small picture for the board |
| `js/milbil.js` | Draws a milbil as SVG (from Milbil Café) |
| `js/colors.js` | Land colours, and rainbow land |
| `js/main.js` | Start-up, the start screen, the game loop, the leaderboard and the "caught" card |
| `js/state.js` | Saving your milbil, settings and bests |
| `js/audio.js` | Little sounds, made on the spot |

How filling in works: the island is a grid of cells, and each one has an owner
and maybe somebody's trail. When you step back onto your land, your trail cells
become yours, then a flood fill starts from just outside your land and spreads
through every cell that isn't yours. Any cell it can't reach is closed off, so
it's yours too. Milbils walk smoothly, but when one moves corner to corner it
steps through a side cell first, so a trail never has a diagonal gap someone
could slip through.

The cells are only how the game keeps track of land. It doesn't draw them as
squares: each milbil's land is drawn as one shape whose outline runs through
the middles of the cells' edges (this is called marching squares). Stair-steps
become straight slopes, corners are cut off, and one cell on its own is a
little diamond. Neighbouring land is cut along the same lines, so two lands
always meet with no gap, and where three lands meet, one colour is laid
underneath so no ground shows through.

The game saves to `localStorage`. In the browser console, `ISLAND.world` is
everything on the island and `ISLAND.you` is you.

The game loads nothing from other websites. The lettering uses the fonts
already on your device.
