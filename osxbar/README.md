# OSXBar

A lightweight macOS menu bar app that shows how much of the year, month, and day has elapsed.

```
▓▓▓▓░░░░ 41%     ← lives in your menu bar

Year   ██████████░░░░░░░░   41.2%
Month  ████████████████░░   88.7%
Day    ████████░░░░░░░░░░   39.4%
─────────────────────────────────
Quit OSXBar               ⌘Q
```

Inspired by [Progress Bar OSX](https://www.progressbarosx.com/).

## Install (easiest)

1. Go to [Releases](../../releases) and download `OSXBar.dmg`
2. Open the DMG and drag **OSXBar** to **Applications**
3. Launch it — it'll appear in your menu bar

> **macOS security warning?** Since the app isn't notarized, right-click → **Open** the first time, or run:
> ```bash
> xattr -cr /Applications/OSXBar.app
> ```

## Build from source

Requires macOS 12+ and Xcode command-line tools.

```bash
git clone https://github.com/dinotalic2/osxbar.git
cd osxbar
chmod +x build.sh && ./build.sh
open build/OSXBar.app
```

## Create a new release (DMG)

Push a version tag — GitHub Actions builds and attaches the DMG automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```
