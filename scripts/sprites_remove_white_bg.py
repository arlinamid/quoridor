"""
Remove near-white background from PNGs (alpha = 0).
Usage: python scripts/sprites_remove_white_bg.py [dir]
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

# Fehér / majdnem fehér háttér; a figura krém/fehér részei általában nem mind 255.
WHITE_MIN = 248


def rgba_remove_white(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= WHITE_MIN and g >= WHITE_MIN and b >= WHITE_MIN:
                px[x, y] = (r, g, b, 0)
    return im


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    d = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "public" / "sprites" / "bunny"
    if not d.is_dir():
        print(f"Not a directory: {d}", file=sys.stderr)
        sys.exit(1)
    paths = sorted(d.glob("frame-*.png"))
    if not paths:
        print(f"No frame-*.png in {d}", file=sys.stderr)
        sys.exit(1)
    for p in paths:
        im = Image.open(p)
        out = rgba_remove_white(im)
        out.save(p, optimize=True)
        print(p.name)
    print(f"Done: {len(paths)} files")


if __name__ == "__main__":
    main()
