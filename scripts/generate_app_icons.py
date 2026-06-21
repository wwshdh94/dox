#!/usr/bin/env python3
"""Generate PWA / favicon assets from docs/logo/Logo.png (mark only, no wordmark)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "logo" / "Logo.png"
FULL_SRC = ROOT / "docs" / "logo" / "Full_Logo.png"
PUBLIC = ROOT / "public"
BG = (245, 241, 234, 255)  # PWA icon surface — matches --bg #F5F1EA


def strip_light_background(img: Image.Image, threshold: int = 238) -> Image.Image:
    """Make near-white pixels transparent."""
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
    return rgba


def content_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    px = img.load()
    w, h = img.size
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 20:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    return minx, miny, maxx + 1, maxy + 1


def crop_to_content(img: Image.Image, pad: int = 0) -> Image.Image:
    x0, y0, x1, y1 = content_bbox(img)
    if pad:
        x0 = max(0, x0 - pad)
        y0 = max(0, y0 - pad)
        x1 = min(img.width, x1 + pad)
        y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def square_mark(pad_ratio: float = 0.08) -> Image.Image:
    img = strip_light_background(Image.open(SRC))
    mark = crop_to_content(img)
    side = max(mark.size)
    pad = int(side * pad_ratio)
    canvas = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    ox = pad + (side - mark.width) // 2
    oy = pad + (side - mark.height) // 2
    canvas.paste(mark, (ox, oy), mark)
    return canvas


def full_logo() -> Image.Image:
    img = strip_light_background(Image.open(FULL_SRC))
    return crop_to_content(img, pad=8)


def on_bg(icon: Image.Image, size: int, bg=BG) -> Image.Image:
    out = Image.new("RGBA", (size, size), bg)
    scaled = icon.resize((size, size), Image.Resampling.LANCZOS)
    out.paste(scaled, (0, 0), scaled)
    return out.convert("RGB")


def maskable(icon: Image.Image, size: int, bg=BG) -> Image.Image:
    """Icon scaled to ~80% for Android maskable safe zone."""
    out = Image.new("RGBA", (size, size), bg)
    inner = int(size * 0.8)
    scaled = icon.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = (size - inner) // 2
    out.paste(scaled, (offset, offset), scaled)
    return out.convert("RGB")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    mark = square_mark()
    full = full_logo()

    sizes = {
        "pwa-64x64.png": 64,
        "pwa-192x192.png": 192,
        "pwa-512x512.png": 512,
        "apple-touch-icon-180x180.png": 180,
        "maskable-icon-512x512.png": 512,
    }

    for name, px in sizes.items():
        if "maskable" in name:
            img = maskable(mark, px)
        else:
            img = on_bg(mark, px)
        path = PUBLIC / name
        img.save(path, optimize=True)
        print(f"wrote {path.name} ({px}px)")

    ico = on_bg(mark, 48)
    ico.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote favicon.ico")

    mark.save(PUBLIC / "logo.png")
    print("wrote logo.png (transparent)")

    full.save(PUBLIC / "full-logo.png")
    print("wrote full-logo.png (transparent)")


if __name__ == "__main__":
    main()
