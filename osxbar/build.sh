#!/bin/bash
set -euo pipefail

APP="OSXBar"
BUILD="build"

echo "Building $APP..."

mkdir -p "$BUILD/$APP.app/Contents/MacOS"
mkdir -p "$BUILD/$APP.app/Contents/Resources"

ARCH=$(uname -m)
TARGET="${ARCH}-apple-macosx12.0"

swiftc \
    Sources/OSXBar/main.swift \
    Sources/OSXBar/Progress.swift \
    Sources/OSXBar/AppDelegate.swift \
    -framework AppKit \
    -target "$TARGET" \
    -o "$BUILD/$APP.app/Contents/MacOS/$APP"

cp Resources/Info.plist "$BUILD/$APP.app/Contents/Info.plist"

echo "Built: $BUILD/$APP.app"
echo ""
echo "Install: cp -r $BUILD/$APP.app /Applications/"
echo "Run:     open $BUILD/$APP.app"
