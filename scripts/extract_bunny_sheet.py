"""
Extract 3x3 sprite sheet → 112x112 PNGs, crop bottom strip (frame numbers).
Usage: python scripts/extract_bunny_sheet.py [input.png] [out_dir]
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

# Alsó sáv: csak a számjegy — a láb/árnyék FELETTE maradjon (40px túl sok volt).
BOTTOM_STRIP_PX = 24
OUT_SIZE = (112, 112)


def main() -> None:
    default_in = Path(
        r"C:\Users\arlin\.cursor\projects\d-tool-quoridor\assets\c__Users_arlin_AppData_Roaming_Cursor_User_workspaceStorage_4fb2047e727182a8ea03c67c4c315945_images_Gemini_Generated_Image_fetdopfetdopfetd-cb4f8d4c-96e9-43da-9a25-119eca499043.png"
    )
    argv = sys.argv[1:]
    src = Path(argv[0]) if argv else default_in
    out_dir = Path(argv[1]) if len(argv) > 1 else Path(__file__).resolve().parent.parent / "public" / "sprites" / "bunny"

    if not src.is_file():
        print(f"Missing source: {src}", file=sys.stderr)
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    print(f"Source: {src.name}  {w}x{h}")

    idx = 0
    for row in range(3):
        for col in range(3):
            idx += 1
            x0 = col * w // 3
            x1 = (col + 1) * w // 3
            y0 = row * h // 3
            y1 = (row + 1) * h // 3
            cell = im.crop((x0, y0, x1, y1))
            cw, ch = cell.size
            keep_h = max(1, ch - BOTTOM_STRIP_PX)
            trimmed = cell.crop((0, 0, cw, keep_h))
            resized = trimmed.resize(OUT_SIZE, Image.Resampling.LANCZOS)
            out_path = out_dir / f"frame-{idx:02d}.png"
            resized.save(out_path, optimize=True)
            print(f"  {out_path.name}  (cell {cw}x{ch}, keep_h={keep_h}, out 112x112)")

    print(f"Done: {out_dir}")


if __name__ == "__main__":
    main()
