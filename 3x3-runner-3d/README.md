# 3x3 Runner 3D

A fully 3D times-tables endless runner for the browser, inspired by the **3x3 Runner**
game on timestables.com. Milo the clever dog races down three busy lanes. Dodge the
traffic and barriers, and when a question comes up, run through the gate with the
right answer. Pick the wrong gate and you crash.

Built with **Three.js** (WebGL). There's no build step, nothing to install and no
dependencies to fetch: the engine is vendored into `vendor/`, so the whole game runs
offline from the folder. The only network request is the Google Font, and the game
falls back to a system font without it.

---

## Running it

It has to be served over HTTP (ES modules won't load from `file://`).

```bash
python3 3x3-runner-3d/serve.py        # http://localhost:8125
```

`serve.py` is `http.server` with no-cache headers added (browsers cache ES modules hard,
so edits wouldn't show up on reload otherwise). It also prints the LAN address to open
on a phone. Any static host works for deployment.

---

## How it plays

| Action | Keyboard | Touch |
| --- | --- | --- |
| Change lane | `←` `→` / `A` `D` | swipe left / right, or ◀ ▶ |
| Jump | `↑` / `W` / `Space` | swipe up, or ▲ |
| Slide (or slam down mid-air) | `↓` / `S` | swipe down, or ▼ |
| Pause | `P` / `Esc` | ⏸ |
| Start / run again | `Enter` | PLAY |

On a touch screen you can swipe anywhere, and quick flicks count too. There are also
on-screen buttons: ◀ ▶ for your left thumb and ▼ ▲ for your right. They're switched on
automatically on touch devices and can be turned off in Settings. Long-press menus,
pinch zoom and double-tap zoom are blocked so they can't interrupt a run.

- **Name your dog.** The first time the game opens it asks what your dog is called. You
  can type a name, pick a suggestion or roll the 🎲. Every dog can have its own name.
  Rename one by tapping the name plate on the home screen, or by tapping your dog again
  in *Dogs*. The name appears on the dog, in the countdown ("GO, REX!"), in cheers, on the
  results card and in the rivals table.

- **Answer gates.** Every 120–210 m a question such as `7 × 8` appears, with three
  colour-coded arches ahead. Run through the one with the right answer. There are no
  obstacles in the run-up, so you have a few seconds to think; the bar under the question
  shows how far away the gate is. The questions can be read aloud (Settings).
- **Obstacles.** You jump low barriers and cones and slide under high bars. Cars and taxis
  have to be dodged or jumped over, and you can run along their roofs. Buses and lorries
  can only be dodged. Some cars drive towards you. Hitting the side of something while
  changing lanes bounces you back without a crash.
- **Streaks & score.** Distance scores points. Each right answer is worth 50 points plus
  a speed bonus for answering within 2.5 s. Every 3 right answers in a row raises the
  multiplier, up to ×5.
- **Power-ups.** 🧲 Coin Magnet · ✖️2 Double Coins · 🛡️ Shield (survives one crash or
  wrong answer) · 🚀 Rocket (fly over everything collecting sky coins). You can upgrade
  each one five times so it lasts longer.
- **Boosts.** Buy these before a run and switch them on from the home screen: ⏩ Head
  Start and 🛡️ Starting Shield. 💖 Second Chance is a spare life.
- **Crashed?** Answer a bonus question to keep running (once per run), or spend a Second
  Chance.
- **Dogs.** Milo the Beagle, then Pip the Pug (level 3), Biscuit the Corgi (5), Dotty
  the Dalmatian (8), Kiko the Shiba Inu (11), Blizzard the Alaskan Malamute (15) and
  Sunny the Golden Retriever (20). Three more are won in the Challenge: Lulu the Poodle
  (master 3 tables), Frank the Dachshund (6) and Dash the Greyhound (all 12).
- **🏅 Multiplication Challenge.** Choose one table and run through all twelve of its
  facts in random order, one after another, while the road speeds up faster than in a
  normal run. You have three hearts, and a wrong gate or a crash costs one. You earn
  ⭐ for 7 right, ⭐⭐ for 10 and ⭐⭐⭐ for all 12, with bonus coins the first time you
  reach each star. Three stars masters the table, and mastered tables win the challenge
  dogs. Boosts and rockets are left out so every attempt is the same test.
- **Outfits.** 16 items in four slots (hats, glasses, neck, back), bought with coins.
  You can preview them on your dog before buying.
- **Missions & daily quests.** Three missions are active at a time, and a new one takes
  each finished one's place. There are also three daily quests, the same for everyone on
  a given date, and a login reward that grows over a 7-day streak.
- **Rivals.** Seven rival dogs have scores to beat, from Sausage the Dachshund and
  Bruno the Pug up to Professor Paws. As you close in on a rival's score they turn up
  running on the pavement beside you, taunting you, and you overtake them live.
- **Times tables.** Choose any mix of 1–12 in *Times Tables*. The questions lean towards
  the tables you get wrong most often, and the screen shows how well you know each one.

The town cycles through three areas: a downtown high street, a suburb with houses and
hedges, and a park.

---

## Code map

| File | What's in it |
| --- | --- |
| `js/data.js` | All tunable content: speeds, dogs, outfits, power-ups, missions, rivals |
| `js/world.js` | Renderer, sky shader, lighting, road, and the endless scenery segments |
| `js/entities.js` | Obstacle, coin, power-up and gate builders, plus the row `Spawner` |
| `js/game.js` | One run: physics, collisions, gates, power-ups, rivals |
| `js/dog.js` | Dog builder (every breed from one parametric model), outfits, run cycle |
| `js/mathq.js` | Adaptive question engine and believable wrong answers |
| `js/progress.js` | XP/levels, missions, daily quests, login rewards |
| `js/ui.js` | Menu panels, toasts, HUD pop-ups |
| `js/audio.js` | Synthesised sound effects, music loop, spoken questions |
| `js/main.js` | Boot, screens, camera, input, frame loop |

Progress is saved in `localStorage` (`tt-runner-3d-v1`). If storage is blocked the game
still plays; it just doesn't remember anything between visits.

For performance, each scenery segment and each obstacle is merged into one mesh per
material, which keeps a typical frame at a few hundred draw calls.
