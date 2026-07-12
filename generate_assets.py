#!/usr/bin/env python3
"""Generate og-default.png (1200x630) and apple-touch-icon.png (180x180) efficiently."""
import os
import struct
import sys
from pathlib import Path
import zlib

def create_png(width, height, r, g, b, a=255):
    """Create a solid-color PNG efficiently."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    # Build raw image data using pre-allocation
    row = b'\x00' + struct.pack('BBBB', r, g, b, a) * width
    raw = row * height

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

outdir = Path(__file__).resolve().parent / "public"
os.makedirs(outdir, exist_ok=True)

# Generate og-default.png - 1200x630, black background
sys.stdout.write("Generating og-default.png...")
sys.stdout.flush()
og_bytes = create_png(1200, 630, 0, 0, 0)
with open(outdir / 'og-default.png', 'wb') as f:
    f.write(og_bytes)
print(f" {len(og_bytes)} bytes")

# Generate apple-touch-icon.png - 180x180, black background
sys.stdout.write("Generating apple-touch-icon.png...")
sys.stdout.flush()
icon_bytes = create_png(180, 180, 0, 0, 0)
with open(outdir / 'apple-touch-icon.png', 'wb') as f:
    f.write(icon_bytes)
print(f" {len(icon_bytes)} bytes")

print("Done!")
