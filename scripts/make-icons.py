#!/usr/bin/env python3
"""Erzeugt Platzhalter-Icons (Ring auf Akzentfarbe) in public/. Ersetzen, sobald ein Logo existiert."""
import math, struct, zlib, os

BG = (0x2F, 0x6B, 0x4F)
FG = (0xFF, 0xFF, 0xFF)
OUT = os.path.join(os.path.dirname(__file__), '..', 'public')


def clamp(v):
    return max(0.0, min(1.0, v))


def render(size, ring_scale):
    cx = cy = size / 2
    r_out = size * ring_scale / 2
    r_in = r_out * 0.78
    dot = r_out * 0.18
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            ring = clamp(r_out - d + 0.5) * clamp(d - r_in + 0.5)
            center = clamp(dot - d + 0.5)
            a = max(ring, center)
            row += bytes(round(BG[i] + (FG[i] - BG[i]) * a) for i in range(3))
        rows.append(bytes(row))
    return b''.join(rows)


def png(path, size, ring_scale):
    raw = render(size, ring_scale)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    data = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )
    with open(os.path.join(OUT, path), 'wb') as f:
        f.write(data)
    print('geschrieben', path)


png('icon-192.png', 192, 0.62)
png('icon-512.png', 512, 0.62)
png('icon-maskable-512.png', 512, 0.46)  # Sicherheitsrand für maskable
png('apple-touch-icon.png', 180, 0.62)
