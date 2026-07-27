"""Replace the Taj GLB's unwrapped atlas background with real marble.

Source texture extraction:
  TOMB_SHADER.baseColorTexture from public/assets/models/taj-premium/tajmahal.glb

Usage:
  python3 scripts/content-pipeline/make-taj-tomb-texture.py SOURCE.webp OUTPUT.webp
"""

from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    source = Image.open(Path(sys.argv[1])).convert("RGB")
    marble = Image.open(
        "public/assets/textures/arch-marble/basecolor.jpg"
    ).convert("RGB")

    tiled = Image.new("RGB", source.size)
    for y in range(0, source.height, marble.height):
        for x in range(0, source.width, marble.width):
            tiled.paste(marble, (x, y))

    pixels = source.load()
    marble_pixels = tiled.load()
    target = (165, 174, 173)
    for y in range(source.height):
        for x in range(source.width):
            color = pixels[x, y]
            distance = sum((color[channel] - target[channel]) ** 2 for channel in range(3))
            if distance < 12 * 12:
                pixels[x, y] = marble_pixels[x, y]

    source.save(Path(sys.argv[2]), "WEBP", quality=92, method=6)


if __name__ == "__main__":
    main()
