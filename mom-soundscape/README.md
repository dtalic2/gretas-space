# ❤️ Mom Soundscape

Make your own sound buttons. Tap the big red **Record** button and say
something, sing, or make a funny noise. Give it a name, a colour and a picture,
and it becomes a button. Tap the button and you hear that sound again, as many
times as you like. Tap lots of buttons and they all play together.

**▶ Play it: https://dtalic2.github.io/gretas-space/mom-soundscape/**

No build step and no dependencies. Run it locally with:

```bash
python3 mom-soundscape/serve.py      # http://localhost:8131
```

Tap **Add to Home Screen** and it opens full screen like an app.

Recording needs the microphone, so the first time you record, the browser asks
whether it may use it. Tap **Allow**. Browsers only allow the microphone on a
secure page, so it works on the GitHub Pages link above and on `localhost`, but
not on `http://` plus your computer's address from a phone.

---

## How it plays

1. **Record.** Tap the red **Record** button and make your sound. Bars show
   how loud it is. Tap **Stop** when you're done. Recording stops by itself
   after a minute.
2. **Name it.** Type a name (leave it empty and it's called *Sound 1*,
   *Sound 2* and so on), then pick:
   - **A colour:** pink, red, orange, yellow, green, teal, blue, purple, brown
     or night
   - **A picture:** one of 36, from ❤️ and 😂 to 🐶, 🦄, 🚀 and 💩
   - **A voice:** how it sounds when it plays (see below)
   - **Play it over and over:** it keeps going round until you tap it again

   The big button at the top shows what it'll look like. Tap it to listen.
   Picking a voice plays it in that voice straight away. **Record again**
   swaps in a new recording and keeps the name and look. **Throw away** needs a
   second tap, so a good recording isn't lost by accident.
3. **Save.** It's a button now. Tap it to hear it. While it plays it bounces
   and fills up from left to right. Tap it again to stop it early.

Lots of buttons can play at the same time, which is how you make a
soundscape: put a looping sound underneath and tap others over the top.
**Stop** at the top stops everything.

On a computer the first ten buttons have number keys (**1** to **9**, then
**0**), shown in their corners. **R** records, **Space** stops recording, and
**Escape** stops every sound.

## Voices

| | |
| --- | --- |
| 🙂 **Normal** | Just as it was recorded |
| 🐭 **Squeaky** | 1.6 times as fast, so it's higher and quicker |
| 🐻 **Deep** | 0.62 times as fast, so it's lower and slower |
| 🤖 **Robot** | Multiplied by a 50 Hz wave, with a very short echo that makes it ring like metal |
| 🏔️ **Echo** | Comes back every 0.3 seconds, a bit quieter each time |
| 🔄 **Backwards** | Played from the end to the start |

## Changing sounds

Tap **✏️ Change** at the top (on a narrow phone it's just the ✏️). The buttons
wiggle: tap one to change its name, colour, picture, voice or looping, or to
record it again. You can also:

- **◀ Move** and **Move ▶** to put it earlier or later on the board
- **⬇️ Save to device** to download the recording as a sound file
- **🗑️ Delete** it (tap twice)

Tap **Done** to go back to playing.

## Making recordings sound good

- **The quiet bits are trimmed off.** The silence before and after a sound is
  cut (keeping a moment either side), so the button makes its sound the instant
  you tap it. The recording you saved isn't changed: the trimming happens each
  time the game loads.
- **Quiet recordings are turned up.** Every sound is made about as loud as the
  others, up to six times louder. If a recording is so quiet that there's
  probably nothing on it, the naming screen says so.
- **No phone-call clean-up.** Phones normally treat the microphone as if
  you're on a call, cutting out background noise and evening out the volume.
  The game asks for that to be turned off, so music, animals and whistles come
  through as they are.
- **Lots at once doesn't crackle.** A limiter at the end keeps everything
  playing together from getting too loud.
- **The ring/silent switch on an iPhone shouldn't mute it.** The game tells
  Safari it plays sound like a music app. iPhones older than iOS 16.4 don't
  understand that and still follow the switch.

## Where the sounds are kept

In the browser's own storage (IndexedDB) on the phone, tablet or computer you
recorded them on. They're still there next time you open the game, but they
don't move to another device or another browser, and clearing the browser's
website data deletes them. **⬇️ Save to device** keeps a copy of one somewhere
safe. In a private window they're gone once the window is closed. If the
browser won't store anything at all, the game says so, and the sounds work
until you close it.

The game asks the browser to keep its storage for good, so it isn't cleared
when the device runs short of space.

## Code

| File | What's in it |
| --- | --- |
| `js/data.js` | The colours, pictures, voices, name ideas and limits |
| `js/main.js` | The board of buttons, recording, the naming screen, changing, saving and the keys |
| `js/recorder.js` | The microphone: MediaRecorder, and the loudness bars |
| `js/player.js` | Decoding, trimming and turning up, the voices, and playing lots at once |
| `js/store.js` | Keeping the sounds in IndexedDB |

Recordings are kept in whatever format the browser records in (WebM in Chrome,
MP4 in Safari, Ogg in Firefox), as recorded. They're only ever played back in
the browser that made them, and every browser can play its own format.

In the browser console, `SOUNDSCAPE.sounds` is every sound on the board.

The game loads nothing from other websites. The lettering uses the fonts
already on your device, and the pictures are the device's own emoji.
