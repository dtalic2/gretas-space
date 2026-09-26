# 🥥 Coconut Cove

Your own little tropical island in a warm blue sea. There's no hurry and no
danger. You fish off the dock, swim in the lagoon, dive for pearls, and make
friends with the animals who live here.

**▶ Play it: https://dtalic2.github.io/gretas-space/tropical-island-3d/**

---

## Things to do

- **🎣 Fishing.** Face the water and press **E** to cast. When the bobber dips
  and a big **!** pops up, press **E**. Then press **E** again while the needle
  is in the green. There are 11 catches to fill your journal:
  - reef fish in the lagoon (Clownfish, Blue Tang, Parrotfish)
  - big deep-sea fish from the ocean beaches (Red Snapper, Mahi-mahi, Swordfish)
  - Glow Squid, which only bite at night
  - the odd Old Boot
  - the legendary **Golden Fish**
- **🏊 Swimming.** Walk into the water and you float. With a snorkel from Kai,
  hold **Dive** to swim down to the lagoon floor for seaweed and pearls. Keep
  an eye on your breath bar.
- **🐾 Animal friends.** Pet each one once a day and bring their favourite food.
  Three hearts makes you best friends, and something special happens:

  | | Loves | Best friends |
  |---|---|---|
  | 🐶 Coco the dog | pats | follows you everywhere, even swimming |
  | 🦜 Pip the parrot | 🥭 mangoes | rides on your shoulder and chats |
  | 🐒 Momo the monkey | 🍌 bananas | tags along with you |
  | 🐢 Shelly the sea turtle | 🌿 seaweed | lets you **ride on her back** |
  | 🦀 Pinch the crab | 🐟 fish | scuttles after you (walk, don't run, or Pinch hides) |
  | 🐬 Splash the dolphin | 🐟 fish | swims and leaps beside you |

- **🛖 Kai's Tiki Shack.** Sell fish, shells, starfish, pearls and coconuts for
  coins. Buy a Snorkel, a Pro Fishing Rod, a Ukulele (your friends dance when
  you play), a Sun Hat, a Flower Lei or Sunglasses.
- **Relax.** Nap in the hammock, or sleep in your hut at night to wake up at
  dawn. At night the tiki torches glow and the stars come out.

The banner at the top always suggests something to do next, and the arrow under
it points the way. **📔** opens your journal: friends, fish and treasures found.

## Controls

| | Keyboard / mouse | Touch |
|---|---|---|
| Move | **joystick** (drag it with the mouse) or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | **joystick**, bottom left |
| Look · zoom | drag the scene · scroll | drag · pinch |
| Pick · pet · fish · talk | <kbd>E</kbd> | **E** |
| Jump · dive | <kbd>Space</kbd> (hold to dive) | ⤒ / 🤿 (hold to dive) |
| Run | <kbd>Shift</kbd> | 🏃 |
| Ukulele · journal · help | <kbd>U</kbd> · <kbd>J</kbd> · <kbd>H</kbd> | 🎸 · 📔 · ❔ |

## Running it

Nothing to install and nothing to build. It has to be served over HTTP, though:

```bash
python3 tropical-island-3d/serve.py
```

## How it is put together

As in the other 3D games here, there are no model, texture or sound files.
The island comes from one height function, everything you see is built from
primitives, and every sound is synthesised.

| File | What lives there |
|---|---|
| [`js/econ.js`](js/econ.js) | Every number: fish and their prices, shop items, animals and their favourite foods, speeds. |
| [`js/terrain.js`](js/terrain.js) | `height(x, z)`: the island, the lagoon, the reef ring and the deep. Also the sea shader and foam. |
| [`js/world.js`](js/world.js) | The dock, hut, shack and hammock; palms, fruit, shells, seaweed, oysters and coral; torches. |
| [`js/animals.js`](js/animals.js) | Coco, Pip, Momo, Shelly, Pinch, Splash, and the gulls. |
| [`js/fishing.js`](js/fishing.js) | Cast → wait → bite → reel → catch. |
| [`js/player.js`](js/player.js) | Walking, jumping, swimming, diving, turtle-riding, and the camera. |
| [`js/quests.js`](js/quests.js) | The suggestions in the banner. |
| [`js/ui.js`](js/ui.js) | All the DOM: HUD, joystick, shop, journal. |
| [`js/main.js`](js/main.js) | The rules that tie it together. |

Progress saves itself. Debugging: `__cc` is on `window`, and `__cc.sim(30)` runs
thirty seconds of game without drawing.
