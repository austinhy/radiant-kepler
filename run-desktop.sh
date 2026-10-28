#!/bin/zsh
set -e

cd "$(dirname "$0")"

echo "Building frontend bundle..."
/usr/bin/python3 scripts/build_dist.py

if [ ! -f "RadiantKepler.app/Contents/MacOS/RadiantKepler" ]; then
  echo "Compiling native macOS desktop binary..."
  mkdir -p RadiantKepler.app/Contents/MacOS
  /usr/bin/clang -O2 -fobjc-arc -mmacosx-version-min=14.0 -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX15.4.sdk native-macos/main.m -framework Cocoa -framework WebKit -o RadiantKepler.app/Contents/MacOS/RadiantKepler
fi

echo "Launching Radiant Kepler desktop app..."
open RadiantKepler.app
