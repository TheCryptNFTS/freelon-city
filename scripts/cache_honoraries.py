#!/usr/bin/env python3
"""Cache 35 honorary citizen images + 4 one-of-ones locally as WebP.
Speeds up OG card generation by removing IPFS cold-fetch latency."""
import json, os, shutil
from pathlib import Path
from PIL import Image

ROOT = Path("/Users/billy/freelon/phase3/freelon-city-site")
OUT = ROOT / "public/heroes"
OUT.mkdir(parents=True, exist_ok=True)

SHIP_JPG = Path("/Users/billy/freelon/phase3/ship/images_jpg")

citizens = json.loads((ROOT / "data/citizens.json").read_text())
ids = sorted(c["id"] for c in citizens if c["tier"] in ("Honorary", "One of One"))
print(f"Honoraries + 1/1s: {len(ids)}")

cached = 0
skipped = 0
for cid in ids:
    n4 = f"{cid:04d}"
    out = OUT / f"{n4}.webp"
    if out.exists():
        skipped += 1
        continue
    src = SHIP_JPG / f"{n4}.jpg"
    if not src.exists():
        print(f"  ! missing source: {n4}.jpg")
        continue
    with Image.open(src) as im:
        im = im.convert("RGB")
        im.thumbnail((1024, 1024), Image.LANCZOS)
        im.save(out, "WEBP", quality=85, method=6)
    print(f"  + {n4}.webp ({out.stat().st_size // 1024}KB)")
    cached += 1

total_size = sum(f.stat().st_size for f in OUT.glob("*.webp"))
print(f"\nCached: {cached} new, {skipped} already present")
print(f"Total /public/heroes WebP: {len(list(OUT.glob('*.webp')))} files, {total_size // 1024}KB")
