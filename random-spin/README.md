# 🎲 Random Spin

Tap **SPIN** and every turn you get:

- a random **number from 0 to 36** (inclusive), and
- a random **colour**, **red** or **black**, except 0, which is always **green**.

Every round starts with **18** on the ball before the numbers start flashing.

The number and the colour are picked separately, so any number from 1 to 36
can come up in either colour. Both use the browser's secure random generator
(`crypto.getRandomValues`) with no bias.

The last 50 turns show as chips under the button, with a red/black/green count.
They're saved on the phone, and **Clear** wipes them.

**▶ Open it on your phone: https://dtalic2.github.io/gretas-space/random-spin/**

To put it on your home screen like an app: in Safari tap Share → *Add to Home
Screen*; in Chrome tap ⋮ → *Add to Home screen*.

No build step and no dependencies. Run it locally with:

```bash
python3 random-spin/serve.py      # http://localhost:8127
```
