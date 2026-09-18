# Milbil Worms

Two teams of **Milbils** — the glowing, square-bodied, lopsided-eyed creatures
from the original sketch — start on opposite ends of a map that blows apart.
Take turns. Pick a weapon. Wipe the other lot out.

It is *Worms*, played by Milbils: destructible terrain, wind, an arc you have to
read, friendly fire, crates, rising water at the end. Plain Canvas 2D in the
browser — no build step, no install, no dependencies, and it runs offline.

---

## Running it

It needs to be served over HTTP (ES modules will not load from `file://`).

```bash
python3 milbil-worms/serve.py
```

Then open <http://localhost:8126>. `serve.py` is `http.server` with no-cache
headers added, which matters while you are editing: browsers cache ES modules
hard, so with a plain `python3 -m http.server` a change to `js/weapons.js` often
will not show up on reload and it looks like your edit did nothing. It also
prints the LAN address to type on a phone.

Any static host works for deployment — `npx serve`, nginx, GitHub Pages, S3.

It also builds to a single self-contained `.html`, for anywhere that can host a
page but not a folder of ES modules:

```bash
node milbil-worms/build-artifact.mjs      # -> dist/milbil-worms.html, ~140 KB
```

That is the only thing in the project with a build step, and it is optional.
esbuild is fetched on demand by `npx`, so there is nothing to install and no
`package.json`.

---

## How it plays

A turn is **30 seconds**. Walk, pick a weapon, aim, fire. Then it is their go.

| Action | Phone | Desktop |
| --- | --- | --- |
| Aim and power | drag anywhere on the map | drag, or **↑** / **↓** |
| Fine aim | **▲** **▼** beside FIRE | **↑** **↓** |
| Fire | let go, or hold **FIRE** | hold **Space** and let go |
| Walk | **◀** **▶** | **A** **D** or **←** **→** |
| Jump | **⤒** | **Enter** |
| Weapons | 🎒 | **Tab**, or **1**–**0** |
| Zoom | pinch, or **⤢** for the whole board | wheel, or **Z** |
| Look around | drag with two fingers | right-drag |
| Pause / help / mute | ⏸ ? 🔊 | **P** **H** **M** |

**One aiming model for thumbs and mice**: your Milbil aims at wherever you are
pointing, and how far away you point is how hard it throws. Drag out, watch the
arc swing, let go. There is no separate set-the-angle-then-set-the-power step —
that is the part of the classic artillery control scheme that does not survive
contact with a touchscreen.

Four things make that work with a thumb rather than a mouse:

- **Power is measured on the screen, not in the world.** A full-power drag is
  about a third of the short side of the display — one comfortable thumb
  movement — whether you are zoomed in on one ledge or looking at the whole
  board. A world-distance rule makes full power unreachable when zoomed in and
  trivial when zoomed out.
- **There is a dead zone around the Milbil.** Two pixels of wobble an inch from
  the barrel is forty degrees of aim; inside the ring the angle simply holds
  still, and only the power follows your finger.
- **The arm eases toward your finger instead of snapping to it**, so a touch
  point that jitters does not produce a visibly twitching barrel. Letting go
  fires exactly where the finger was, not where the eased arm had got to.
- **A drag that never leaves the dead zone does not fire.** Neither does a tap.
  A fumble should cost nothing.

For the shots that need to be exact, **▲** and **▼** next to FIRE dial the angle
a third of a degree at a time (hold them and they accelerate), the readout beside
them shows the elevation, and then holding **FIRE** charges the power. Each side
also keeps the angle it fired at last, and the faint tick on the power ring is
where the last shot went off — so "same again, a bit harder" is two taps and a
hold rather than a fresh guess.

The dotted arc shows how the shot *starts out*. **Wind** does the rest, and the
bar at the top of the screen says which way it is pushing and how hard. Set the
aim guide to **Full arc** in the menu if you would rather see the whole thing, or
**Off** if you want it honest.

**Pinch out as far as you like and you get the whole board** — the zoom floor is
whatever fits 1700×950 on your screen, not an arbitrary number — or tap **⤢** to
snap between the whole board and where you were. Zoomed out that far, names come
off the Milbils and the pool of team colour under each one stops shrinking, so
you can still read the board at a glance. The zoom stays where you put it, turn
after turn, and everything past the edge of the world hazes off into the dark.

Three weapons want a target *before* you fire — Homing Blip, Air Strike and
Teleport. Tap the map to place it, then fire.

### Things that will kill you

Falling a long way. The water. A team-mate's rocket — **friendly fire is on**,
for you and for the computer.

Anything with a fuse hands the turn back for a moment once it is thrown: the
prompt turns into **RUN!** and you can still walk and jump (but not fire) until
it goes off. Dropping dynamite at your own feet with no way to walk away is not
a weapon, it is a mistake — so grenades give you two seconds and dynamite gives
you three and a half. The computer runs too.

### Crates

A crate parachutes in on most turns. Walk into it: **weapon crates** restock the
scarce things, **health crates** patch up 30.

### Sudden death

Nine rounds in, every Milbil still standing drops to 25 health and the water
starts climbing eight pixels a turn. Games end.

---

## The armoury

Ten of them. Unlimited ammo on the first two; everything else is per team, per
match, and crates are the only way to get more.

| | Ammo | Damage | What it does |
| --- | --- | --- | --- |
| 🚀 **Bazooka** | ∞ | 45 | The honest one. Wind pushes it the whole way. |
| 💣 **Grenade** | ∞ | 50 | Bounces, then cooks for three seconds wherever it ends up. |
| 🧨 **Cluster Bomb** | 2 | 26 + 5×24 | Cracks open on impact and rains five bomblets. |
| 🎯 **Homing Blip** | 1 | 52 | Pick a spot first. It will find it, wind or no wind. |
| 🔫 **Scatter Gun** | 2 | 2×27 | Two barrels, no arc, no wind. Point it and mean it. |
| ⚡ **Zap Beam** | 2 | 34 | Tower surplus. Instant, and cuts through everything in line. |
| 🧱 **Dynamite** | 1 | 80 | Dropped at your feet. Four seconds to be somewhere else — and you get them. |
| ✈️ **Air Strike** | 1 | 5×30 | Pick a column. One pass, five bombs, no take-backs. |
| 🌟 **MEGA MILL** | 1 | 135 | One per match. It rearranges the map and everyone on it. |
| 🌀 **Teleport** | 1 | — | Blink anywhere. The only thing that does not end your turn. |

---

## The other side

The computer solves its shot the way you do — guess an arc, see where it lands,
adjust — except it does it four hundred times in one frame against a copy of the
real projectile integrator: same gravity, same wind, same terrain. Which makes it
far too good, so the last thing it does is throw the answer away by a few
degrees. **That deliberate error is the entire difficulty setting.**

| | Angle error | Thinking time |
| --- | --- | --- |
| Wobbly | ±0.10 rad | 1.1s |
| Sharp | ±0.045 rad | 0.85s |
| Deadly | ±0.014 rad | 0.6s |

It picks its weapon before it solves, because what is in the bag changes what
shot is worth trying: a clear line at short range wants the Scatter Gun, no line
of sight at all wants the Homing Blip, two of you standing together wants the
cluster. It scores a candidate arc by how close it lands *and* by what else is
near the landing point — a shot that would catch one of its own, or itself, in
the blast scores worse than a miss. And if nothing scores well it shuffles along
the ground and looks again, twice, before taking the shot anyway.

It also plays with a delay on purpose. An instant shot reads as a cheat even when
it is fair, and watching the arm swing round is half the tension.

---

## How it is put together

```
js/neon.js         stroke primitives — a neon line is four blurred passes, not one
js/art.js          the creature itself, traced in a 100x100 design box
js/terrain.js      the ground: generation, craters, collision, the lit edge
js/themes.js       four maps' worth of colour
js/sky.js          parallax plates and the stuff drifting through the air
js/weapons.js      the armoury, as data
js/projectiles.js  one integrator, and what each `kind` does when it lands
js/game.js         teams, turns, damage, camera — nothing else moves a Milbil
js/ai.js           the other side
js/render.js       one frame, in the order that makes an explosion look lit
js/fx.js           sparks, smoke, shake, floating numbers
js/audio.js        synthesised blips, no files to load
js/input.js        one aiming model for thumbs and mice
js/ui.js           HUD and panels
js/main.js         boot, sprite baking, loop
```

Four things are worth knowing if you come back to this.

**The ground is kept four ways at once.** A `Uint8Array` of one byte per world
pixel answers "can I stand here?" hundreds of times a frame; a mask canvas holds
the shape for compositing; a paint canvas wears the strata and scorch marks; a
half-resolution rim canvas holds the lit edge, and a seventh-resolution copy of
that is the bloom. A crater updates the byte array and the mask immediately and
then flags the terrain dirty — the expensive half happens once a frame however
many bombs went off in it, so a cluster bomb costs what one rocket costs.

**Erosion is eight blits, not a pixel loop.** The lit edge is the mask minus the
mask eroded by five pixels, and eroding is just intersecting the mask with itself
shifted in eight directions. At half resolution that is eight `drawImage` calls.

**Nothing blits more than the camera can see.** Drawing the whole 1700×950 plate
when a phone is looking at a fifth of it is the difference between 60fps and 15:
the browser samples every source pixel even where the result lands off screen.
Terrain, bloom, rim and both parallax plates all take the visible rectangle.

**Milbils are baked, not drawn.** Idle, walk, air and hurt cycles are rendered
once per team at boot, because a neon stroke is four shadow-blurred passes and a
Milbil is thirty strokes. The one thing that cannot be baked — the arm holding
the weapon, which points wherever you are aiming — is four short paths, stroked
live.

---

## Where the Milbils came from

The same sketch as Milbil Tower (`claude/milbils-laser-tower-game-v2pkwd`): a wonky square body with the
top-left corner folded over, a small upright eye on the left, a big leaf-shaped
eye on the right, a cyan grin across two square teeth, one arm thrown up
mid-wave, two bent legs. Here the palette is rotated per team — **GLOW** keeps
the sketch's own colours, **FLUX** is the same creature 172° round the wheel —
and each side wears a little antenna in its team colour, so across a whole map
you read sides before you read faces.

The Zap Beam is tower surplus.
