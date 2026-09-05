#!/usr/bin/env python3
"""Generate the app's brand assets from the supplied Eduvos logo.

Run:  python3 scripts/build-brand-assets.py <source.pdf|source.png|source.jpg>

Why this is a script and not a one-off: the source we were given is small (the
crest is 48x80 real pixels inside a 474x325 scan), so the launcher icon is
upscaled and therefore soft. When a vector or high-resolution logo turns up,
re-run this with the better file and every asset regenerates consistently —
rather than someone hand-cropping in an image editor and getting different
padding each time.

Needs Pillow:  pip3 install Pillow
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'

# The design's --color-bg. The mark is navy, so it needs a light ground; a navy
# mark on a navy tile is invisible, which is why the icon is not brand-coloured.
LIGHT_GROUND = (245, 247, 249)

# Fraction of the icon canvas the artwork occupies. Android masks adaptive icons
# to roughly the middle 66%, so the foreground has to stay well inside that or
# a round/squircle mask clips the crest.
ICON_ARTWORK_FRACTION = 0.70
ADAPTIVE_ARTWORK_FRACTION = 0.52


def load_source(path: Path) -> Image.Image:
    """Open the logo, pulling it out of a PDF wrapper if that is what we got."""
    if path.suffix.lower() != '.pdf':
        return Image.open(path).convert('RGB')

    # A DCTDecode stream *is* a JPEG, so this is a byte copy — no re-encode and
    # no quality loss on top of what the PDF already carried.
    data = path.read_bytes()
    for match in re.finditer(rb'/Subtype\s*/Image', data):
        start = data.index(b'stream', match.start()) + len(b'stream')
        while data[start:start + 1] in (b'\r', b'\n'):
            start += 1
        blob = data[start:data.index(b'endstream', start)].rstrip(b'\r\n')
        if blob[:2] == b'\xff\xd8':  # JPEG SOI
            tmp = ROOT / '.brand-source.jpg'
            tmp.write_bytes(blob)
            image = Image.open(tmp).convert('RGB')
            image.load()
            tmp.unlink()
            return image
    raise SystemExit(f'No embedded JPEG found in {path}')


def trim(image: Image.Image, tolerance: int = 18) -> tuple[Image.Image, tuple[int, int, int, int]]:
    """Crop away the flat background the logo was supplied on."""
    width, height = image.size
    pixels = image.load()
    background = pixels[0, 0]

    def is_background(colour: tuple[int, int, int]) -> bool:
        return all(abs(colour[i] - background[i]) <= tolerance for i in range(3))

    min_x, min_y, max_x, max_y = width, height, -1, -1
    for y in range(height):
        for x in range(width):
            if not is_background(pixels[x, y]):
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)

    box = (min_x, min_y, max_x + 1, max_y + 1)
    return image.crop(box), box


def split_bands(image: Image.Image, tolerance: int = 18) -> list[tuple[int, int]]:
    """Row ranges that carry ink, separated by blank rows.

    The lockup is three stacked pieces — crest, wordmark, tagline — with clear
    gaps between them, so scanning for blank rows separates them without anyone
    hard-coding pixel offsets that break on a different source file.
    """
    width, height = image.size
    pixels = image.load()
    background = pixels[0, 0]

    def row_has_ink(y: int) -> bool:
        for x in range(width):
            colour = pixels[x, y]
            if any(abs(colour[i] - background[i]) > tolerance for i in range(3)):
                return True
        return False

    bands: list[tuple[int, int]] = []
    start: int | None = None
    for y in range(height):
        if row_has_ink(y):
            if start is None:
                start = y
        elif start is not None:
            bands.append((start, y - 1))
            start = None
    if start is not None:
        bands.append((start, height - 1))
    return bands


def horizontal_bounds(image: Image.Image, top: int, bottom: int, tolerance: int = 18) -> tuple[int, int]:
    width = image.size[0]
    pixels = image.load()
    background = pixels[0, 0]
    min_x, max_x = width, -1
    for y in range(top, bottom + 1):
        for x in range(width):
            colour = pixels[x, y]
            if any(abs(colour[i] - background[i]) > tolerance for i in range(3)):
                min_x, max_x = min(min_x, x), max(max_x, x)
    return min_x, max_x


def keyed(image: Image.Image, tolerance: int = 26) -> Image.Image:
    """Turn the flat background transparent so the mark can sit on any ground."""
    image = image.convert('RGBA')
    pixels = image.load()
    width, height = image.size
    background = pixels[0, 0][:3]

    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            distance = max(abs(r - background[0]), abs(g - background[1]), abs(b - background[2]))
            if distance <= tolerance:
                pixels[x, y] = (r, g, b, 0)
            elif distance <= tolerance * 2:
                # Feather the edge, or the upscale turns every curve into stairs.
                pixels[x, y] = (r, g, b, int(255 * (distance - tolerance) / tolerance))
    return image


def on_canvas(art: Image.Image, size: int, fraction: float, ground) -> Image.Image:
    """Centre `art` on a square canvas, scaled to `fraction` of the short edge."""
    target = int(size * fraction)
    scale = min(target / art.size[0], target / art.size[1])
    scaled = art.resize(
        (max(1, round(art.size[0] * scale)), max(1, round(art.size[1] * scale))),
        Image.LANCZOS,
    )
    canvas = Image.new('RGBA', (size, size), ground)
    canvas.paste(
        scaled,
        ((size - scaled.size[0]) // 2, (size - scaled.size[1]) // 2),
        scaled,
    )
    return canvas


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)

    source = Path(sys.argv[1])
    if not source.exists():
        raise SystemExit(f'No such file: {source}')

    ASSETS.mkdir(exist_ok=True)

    image = load_source(source)
    print(f'source            {source.name}  {image.size[0]}x{image.size[1]}')

    lockup, box = trim(image)
    print(f'lockup (trimmed)  {lockup.size[0]}x{lockup.size[1]}  from {box}')

    bands = split_bands(lockup)
    if not bands:
        raise SystemExit('Found no artwork in the source image.')
    print(f'bands             {bands}')

    # The crest is everything above the wordmark. The wordmark is the widest
    # band, so anything before it belongs to the crest.
    widths = [horizontal_bounds(lockup, top, bottom) for top, bottom in bands]
    spans = [high - low for low, high in widths]
    wordmark_index = spans.index(max(spans))
    crest_bands = bands[:wordmark_index] or bands[:1]

    crest_top = crest_bands[0][0]
    crest_bottom = crest_bands[-1][1]
    crest_left, crest_right = horizontal_bounds(lockup, crest_top, crest_bottom)
    crest = lockup.crop((crest_left, crest_top, crest_right + 1, crest_bottom + 1))
    print(f'crest             {crest.size[0]}x{crest.size[1]}')

    lockup_rgba = keyed(lockup)
    crest_rgba = keyed(crest)

    outputs = {
        # Full lockup, transparent, for in-app use at small sizes.
        'eduvos-logo.png': lockup_rgba,
        # Launcher icon: crest only. The full lockup with its tagline is
        # illegible at 48dp, which is the size that actually matters.
        'icon.png': on_canvas(crest_rgba, 1024, ICON_ARTWORK_FRACTION, LIGHT_GROUND + (255,)),
        # Adaptive foreground: transparent, and smaller, because Android masks
        # it to roughly the middle 66%.
        'adaptive-icon.png': on_canvas(crest_rgba, 1024, ADAPTIVE_ARTWORK_FRACTION, (0, 0, 0, 0)),
        # Splash: the full lockup, which has room to be read.
        'splash-icon.png': on_canvas(lockup_rgba, 1024, 0.55, (0, 0, 0, 0)),
    }

    for name, output in outputs.items():
        path = ASSETS / name
        output.save(path)
        print(f'wrote             assets/{name}  {output.size[0]}x{output.size[1]}')


if __name__ == '__main__':
    main()
