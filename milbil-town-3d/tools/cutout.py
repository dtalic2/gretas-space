#!/usr/bin/env python3
"""
Turn a photo or screenshot of neon drawings into game-ready cut-outs.

The drawings in art/ started life as a screenshot of a gallery of Kaleidoscope
Drawing pictures: bright strokes on a black card. That is already premultiplied
alpha, so the trick is to take the alpha from each pixel's brightness and divide
it back out of the colour. The black disappears, the glow keeps its own colour
instead of going muddy over grass, and the stroke edges stay soft.

    python3 tools/cutout.py shot.png --cols 3 --rows 2 --names petal,chomp,hattie
    python3 tools/cutout.py shot.png --cols 4 --rows 2 --skip 1,2 1,3

Panels are found by looking for a big dark rectangle inside each grid cell, so
cells that are not a drawing (an app icon on a white card, say) are skipped on
their own. Output goes to art/<name>.png, ready for CHARACTERS in js/data.js.

Needs Pillow and numpy:  pip install Pillow numpy
"""
import argparse
import os
import sys

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit('This needs Pillow and numpy: pip install Pillow numpy')

LO, HI = 44.0, 150.0      # below LO is camera/JPEG noise; above HI is a stroke
EDGE_FADE = 5             # px of fade at the panel edge, so a clipped stroke has no hard line
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def panels(dark, w, h, cols, rows, skip):
    """The bounding box of the dark card inside each grid cell, where there is one."""
    found = []
    for ri in range(rows):
        ya, yb = int(h * ri / rows), int(h * (ri + 1) / rows)
        for ci in range(cols):
            if (ri, ci) in skip:
                continue
            xa, xb = int(w * ci / cols), int(w * (ci + 1) / cols)
            sub = dark[ya:yb, xa:xb]
            xs = np.where(sub.mean(axis=0) > 0.55)[0]
            ys = np.where(sub.mean(axis=1) > 0.55)[0]
            if len(xs) < 20 or len(ys) < 20:
                print(f'  cell {ri},{ci}: no drawing here, skipping')
                continue
            found.append((ri, ci, (xa + xs.min(), ya + ys.min(), xa + xs.max() + 1, ya + ys.max() + 1)))
    return found


def cut(pixels, box):
    """One panel -> an RGBA image with the black gone and the glow intact."""
    x0, y0, x1, y1 = box
    crop = pixels[y0:y1, x0:x1]
    lum = crop.max(axis=2)

    t = np.clip((lum - LO) / (HI - LO), 0, 1)
    alpha = t * t * (3 - 2 * t)                                  # smoothstep
    alpha = np.where(lum >= HI, np.clip(lum / 255.0, 0, 1) * 0.35 + 0.65, alpha * 0.9)
    alpha = np.clip(alpha, 0, 1)

    h, w = alpha.shape
    fade = np.ones((h, w), np.float32)
    ramp = np.linspace(0, 1, EDGE_FADE)
    fade[:EDGE_FADE, :] *= ramp[:, None]
    fade[-EDGE_FADE:, :] *= ramp[::-1][:, None]
    fade[:, :EDGE_FADE] *= ramp[None, :]
    fade[:, -EDGE_FADE:] *= ramp[::-1][None, :]
    alpha *= fade

    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip(crop / (safe * 255.0), 0, 1) * 255.0
    rgba = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    rgba[..., :3] = np.where(rgba[..., 3:4] < 6, 0, rgba[..., :3])

    img = Image.fromarray(rgba, 'RGBA')
    bbox = img.getchannel('A').point(lambda v: 255 if v > 14 else 0).getbbox()
    if bbox:
        pad = 4
        img = img.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                        min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad)))
    return img


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('image', help='photo or screenshot holding a grid of drawings')
    ap.add_argument('--cols', type=int, default=3)
    ap.add_argument('--rows', type=int, default=2)
    ap.add_argument('--names', default='', help='comma-separated names, in reading order')
    ap.add_argument('--skip', nargs='*', default=[], metavar='ROW,COL', help='cells to ignore, e.g. 0,0')
    ap.add_argument('--out', default=os.path.join(HERE, 'art'))
    args = ap.parse_args()

    skip = set()
    for cell in args.skip:
        r, c = cell.split(',')
        skip.add((int(r), int(c)))

    im = Image.open(args.image).convert('RGB')
    pixels = np.asarray(im).astype(np.float32)
    dark = pixels.max(axis=2) < 120
    h, w = dark.shape

    found = panels(dark, w, h, args.cols, args.rows, skip)
    names = [n.strip() for n in args.names.split(',') if n.strip()]
    os.makedirs(args.out, exist_ok=True)

    for i, (ri, ci, box) in enumerate(found):
        name = names[i] if i < len(names) else f'milbil{i + 1}'
        img = cut(pixels, box)
        path = os.path.join(args.out, f'{name}.png')
        img.save(path, optimize=True)
        print(f'  cell {ri},{ci} -> {os.path.relpath(path, HERE)}  {img.width}x{img.height}')

    if found:
        print('\nNow add them to CHARACTERS in js/data.js, e.g.')
        for i, _ in enumerate(found):
            name = names[i] if i < len(names) else f'milbil{i + 1}'
            print(f"  {{ id:'{name}', name:'{name.title()}', art:'art/{name}.png', tint:0xffb3c7 }},")


if __name__ == '__main__':
    main()
