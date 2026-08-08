#!/bin/bash
# Double-click this in Finder to serve the garden to everyone on your Wi-Fi.
# Close the Terminal window (or press Ctrl-C) to stop sharing.
cd "$(dirname "$0")" || exit 1
exec python3 serve.py 8123
