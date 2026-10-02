"""Compare the compiled bear metasprites with the authored PNG, pixel for pixel."""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]


def check(rom_path):
    rom = rom_path.read_bytes()
    symbols = {}
    for line in Path(str(rom_path) + '.debug/symbols.noi').read_text().splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[0] == 'DEF':
            symbols[fields[1]] = int(fields[2], 16)

    def read(address, length):
        offset = (address >> 16) * 0x4000 + (address & 0x3fff)
        return rom[offset:offset + length]

    banks = []
    for name in ('_sprite_polar_bear_tileset', '_sprite_polar_bear_bank2_tileset'):
        address = symbols[name]
        count = int.from_bytes(read(address, 2), 'little')
        banks.append(read(address + 2, count * 16))

    def color(rgb):
        r, g, b = rgb
        return 0 if g > 249 and r < 180 and b < 20 else 1 if g >= 205 else 2 if g >= 130 else 3

    source = Image.open(ROOT / 'assets/sprites/polar_bear.png').convert('RGB')
    results = []
    signed = lambda value: value - 256 if value > 127 else value
    names = json.loads((ROOT / 'art-source/bear/animation.json').read_text())['frames']
    for frame in range(len(names)):
        # Runtime coordinates must stay at their pre-fix offsets (+8, -8).
        pixels = [[0] * 24 for _ in range(32)]
        data = read(symbols[f'_sprite_polar_bear_metasprite_{frame}'], 40)
        x = y = 0
        for offset in range(0, len(data), 4):
            dy, dx, tile, props = data[offset:offset + 4]
            if dy == 128:
                break
            y += signed(dy)
            x += signed(dx)
            block = banks[bool(props & 8)][tile * 16:tile * 16 + 32]
            assert len(block) == 32
            for py in range(16):
                row = 15 - py if props & 64 else py
                for px in range(8):
                    bit = px if props & 32 else 7 - px
                    value = ((block[row * 2] >> bit) & 1) | (((block[row * 2 + 1] >> bit) & 1) << 1)
                    tx, ty = x - 8 + px, y + 8 + py
                    assert 0 <= tx < 24 and 0 <= ty < 32, (frame, tx, ty)
                    if value and not pixels[ty][tx]:
                        pixels[ty][tx] = value
        mismatches = sum(pixels[y][x] != color(source.getpixel((frame * 24 + x, y))) for y in range(32) for x in range(24))
        results.append({'frame': frame, 'name': names[frame], 'mismatchedPixels': mismatches})
    return {'rom': str(rom_path), 'sha256': hashlib.sha256(rom).hexdigest(), 'frames': results, 'passed': not any(r['mismatchedPixels'] for r in results)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('rom', type=Path)
    parser.add_argument('--allow-mismatch', action='store_true')
    args = parser.parse_args()
    result = check(args.rom)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not args.allow_mismatch:
        assert result['passed'], 'Compiled bear pixels differ from the source PNG'
