# 📚 Milbil Books

Make your own comic books, starring milbils. Pull the panels on a page to the
size you want, put milbils in them, give them speech bubbles, and draw anything
you like in any colour. The pages number themselves. When a book is finished,
tap **✓ Done** and it goes on the shelf in the **Library** — and you can open it
up and **✏️ Edit** it again whenever you like.

**▶ Play it: https://dtalic2.github.io/gretas-space/milbil-books/**

No build step and no dependencies. Run it locally with:

```bash
python3 milbil-books/serve.py      # http://localhost:8135
```

---

## Two tabs

| | | |
| --- | --- | --- |
| ✏️ | **Create** | Start a new book, or carry on with one you're making. |
| 📚 | **Library** | Every finished book, on a shelf. Tap one to read it; ✏️ Edit to change it. |

## Making a book

**✨ Start a new book** asks three things — what it's called (🎲 thinks of a title
for you), who made it, and what colour the cover is — and who's on the cover.
Then the book opens with its first page ready: one panel at the top, already
picked up so its corner dots are showing.

Along the top are the pages: the cover, then page 1, 2, 3… and **＋** to add
another. Tap the page you are on to move it, copy it or throw it away. Along the
bottom are the tools.

| | Tool | |
| --- | --- | --- |
| 👆 | **Move** | Tap a panel, a milbil or a bubble to pick it up. |
| ✏️ | **Draw** | A pen. Any colour, any thickness. |
| 🧽 | **Rubber** | Rubs out drawing — and only drawing. |
| 🔲 | **Panel** | A new panel, in the biggest gap on the page. |
| 👾 | **Milbil** | Somebody to go in a panel. |
| 💬 | **Words** | A speech bubble, or a caption box. |

↩️ and ↪️ at the top undo and redo anything at all.

### Panels

The boxes on a page. A page is a grid of 12 squares across by 16 down, and a
panel covers some of them, so whatever you do the page stays tidy.

- **Change its size** by dragging any of the four blue dots on its corners. A
  faint grid appears while you drag so you can see where it will snap to.
- **Move it** by dragging the middle.
- **Panels never overlap.** Drag one into another and it stops at the edge,
  as big as it can be.
- **🎨 Colour**: plain, sky, outside, beach, indoors, a starry night (Greta's
  glowing milbils look best on that one), snow, sunshine, pink, lilac, mint, or
  see-through.

New pages can start blank or from eight layouts — one big panel, two, three in a
stack, one big and two small, four squares, six like a real comic.

### Milbils

Tap **👾 Add a milbil** in the middle of an empty panel (or 👾 on the toolbar) and
pick somebody. **If the panel is too small for everybody in it, it grows** — as
far as the panels round it allow — and says so. Make a panel tiny, put Chomp in
it, and it stretches to fit him; put Sunny in next to him and it widens again. If
there's no panel on the page at all, one is made just the right size.

A second milbil stands the same height as the first. If there's no gap wide
enough, everybody shuffles along to make room, taking their speech bubbles with
them.

Pick a milbil up to **💬 Talk**, **↔️ Turn** them round, make them **➕ bigger**
or **➖ smaller** (or drag the pink dot), bring them to the **⏫ Front**, or take
them out. Drag one into a different panel and they move into it, words and all.

**36 milbils** to choose from: Greta's own five drawings — Chomp, Hattie, Petal,
Scoop and Sunny — and everybody from Milbil Café, MilMATHS, the Ningy-Ningy
Canteen and Milbil.io, drawn exactly the way those games draw them.

### Words

Pick a milbil and tap **💬 Talk**, type what they say, and pick a bubble:

| | | |
| --- | --- | --- |
| 💬 | **Talk** | An oval with a tail pointing at whoever is talking. |
| 💭 | **Think** | A cloud, with little puffs trailing back to them. |
| 💥 | **Shout** | A spiky yellow burst. |
| 📜 | **Caption** | A box with nobody talking: "Meanwhile, at the beach…" |

…and small, middle or big writing. A new bubble goes above the milbil if there is
room, beside them if not, and never on top of another bubble. The tail always
points at the speaker, wherever either of them is dragged. Tap a bubble twice to
change the words.

### Drawing

Pick **✏️ Draw** and draw anywhere on the page — inside the panels, outside them,
over everything.

- **Colour**: the four you used last are right there; the big button opens
  eighteen more, plus 🌈 for any colour at all.
- **Thickness**: the slider, with a dot beside it showing exactly how thick the
  line will be on the page.
- **✨ Glow pen**: draws in light, a bright line with a coloured haze round it —
  the same look as Greta's milbils.
- **⬇️ Behind**: draws *behind* the milbils and bubbles, for skies, grass and
  houses. **⬆️ In front** draws on top of everything.

The **🧽 Rubber** has its own size, rubs out drawing in front and behind, and
never touches milbils or words. **🧹 Rub out the lot** clears a page's drawing in
one go (and ↩️ brings it back).

### Page numbers

Every page has its number at the bottom, and so does the page strip. Add a page,
move one, copy one or throw one away and the numbers sort themselves out. The
cover has no number; it has your name instead.

## Done, the Library, and Edit

**✓ Done** checks the title and who made it, then sends the book to the Library:
the cover spins across the screen onto the shelf. (A book with no title is called
"Greta's Book" — whoever made it.)

In the Library, tap a book to read it — swipe, tap the edges or use the arrows to
turn the page — and after the last page comes **The End**. 🔊 reads the whole
book out loud, lighting up each bubble as it goes.

**✏️ Edit this book** is always along the bottom of the reader (and under every
book on the shelf). It opens the book straight back up. It stays on the shelf
while you change it, and ✓ Done puts it back.

Books you haven't finished wait in Create under **Books you're making**.

---

## How it is built

Plain ES modules, no framework, no build step, nothing loaded from anywhere
else. Greta's drawings and the Chewy font for the titles are in this folder.

```
milbil-books/
├── index.html
├── manifest.json        installable, works offline once loaded
├── icon.svg
├── serve.py             local server with no-cache headers
├── art/                 Greta's drawings: Chomp, Petal, Sunny, Hattie, Scoop
├── fonts/               Chewy, for book titles (Apache 2.0)
├── css/style.css
└── js/
    ├── cast.js          the 36 milbils
    ├── milbil.js        drawing milbils (shared with MilMATHS and Milbil Café)
    ├── model.js         books, pages, panels: the grid, growing, making room
    ├── bubbles.js       measuring words, and drawing the four kinds of bubble
    ├── ink.js           pen, glow pen and rubber
    ├── view.js          drawing a page, at any size
    ├── editor.js        Create: picking up, dragging, the tools, undo
    ├── reader.js        the Library's reader, and reading aloud
    ├── store.js         where books are kept
    ├── ui.js            sheets, cards, toasts, sound, confetti
    └── main.js          the two tabs, new books, Done
```

**One page, every size.** A page is 1200 × 1600 units and everything on it is
measured in those, then drawn in percentages of the page, with text sized in
hundredths of the page's width. The thumbnail in the page strip, the cover on
the shelf, the editor and the full-screen reader are all the same code drawing
the same page. Drawing is kept as lines rather than pictures, so it is redrawn
crisply at every size too.

**Where books are kept.** In the browser's own database (IndexedDB) on the
device, never sent anywhere. localStorage is shared between every game on
dtalic2.github.io and only holds about five megabytes between all of them; a
few books with drawings in could fill it. Your name, the sound and your pen are
in localStorage under `milbil-books-v1`.

### Checking it

Played end to end in a real browser, on a phone-sized screen with a mouse and on
an iPad-sized screen with touch: a panel resized from each corner; a panel made
tiny and then grown by three milbils in turn; three milbils squeezed into one
short panel; a milbil dragged into another panel; talk, think, shout and caption
bubbles; pen, glow pen, drawing behind, rubber and undo; pages added from a
layout, copied, moved, thrown away and brought back; the cover's title and
colour changed; ✓ Done, the Library, the reader, The End and ✏️ Edit; and a
reload in the middle, which comes back to the same page of the same book. Also
looked at on a desktop, a phone turned sideways, a 320-pixel phone, and with the
browser pretending it is too old for container units.
