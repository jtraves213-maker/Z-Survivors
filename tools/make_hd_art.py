"""Builds the high-detail (2x density) animated sprite sheets into ../art/hd/.

Sources live in ../src_art/:
  goku_32.png, vegeta_32.png   32x32 chibi sprites (downsampled from the 128px originals)
  gogeta_clean.png, vegito_clean.png + *_poses.json
                               fusion sheets with the white background removed, and
                               the boxes of the four stance frames per section

Every output sheet is a horizontal strip of square frames (frame size = image height):
  heroes:  idle0 idle1 walk0 walk1 walk2 walk3
  fusions: idle0 idle1 move0 move1
Requires Pillow.  Run:  python tools/make_hd_art.py
"""
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src_art")
OUT = os.path.join(ROOT, "art", "hd")
os.makedirs(OUT, exist_ok=True)

HAIR = {  # base, highlight, shade
    "ssj":  ((255, 214, 58), (255, 246, 170), (214, 150, 30)),
    "ssj2": ((255, 232, 96), (255, 252, 210), (228, 172, 44)),
    "god":  ((214, 36, 58), (255, 112, 112), (148, 18, 40)),
    "blue": ((60, 196, 255), (184, 240, 255), (28, 126, 208)),
    "ui":   ((212, 216, 236), (255, 255, 255), (148, 154, 186)),
    "ue":   ((138, 58, 216), (200, 136, 255), (88, 28, 150)),
}
# Region that holds the hair, and a face box inside it that must not be recoloured.
HEROES = {
    "goku":   dict(hair_rows=14, face=(12, 11, 21, 17), leg_top=26, mid=16,
                   forms=["base", "ssj", "ssj2", "ssj3", "god", "blue", "ui"]),
    "vegeta": dict(hair_rows=14, face=(13, 11, 20, 16), leg_top=26, mid=16,
                   forms=["base", "ssj", "ssj2", "blue", "ue"]),
}
OUTLINE = (20, 12, 10, 255)


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def hair_mask(im, cfg):
    px = im.load()
    fx0, fy0, fx1, fy1 = cfg["face"]
    m = set()
    for y in range(cfg["hair_rows"]):
        for x in range(im.width):
            c = px[x, y]
            grey = max(c[:3]) - min(c[:3]) < 30 and lum(c) < 150   # hair highlights
            if c[3] and (lum(c) < 75 or grey) and not (fx0 <= x <= fx1 and fy0 <= y <= fy1):
                m.add((x, y))
    return m


def recolor_hair(im, cfg, ramp):
    im = im.copy()
    px = im.load()
    base, light, shade = [c + (255,) for c in ramp]
    mask = hair_mask(im, cfg)

    def clear(x, y):
        return not (0 <= x < im.width and 0 <= y < im.height) or px[x, y][3] == 0

    out = {}
    for (x, y) in mask:
        if clear(x - 1, y) or clear(x + 1, y) or clear(x, y - 1):
            if lum(px[x, y]) > 30:
                out[(x, y)] = OUTLINE  # silhouette edge stays dark
            continue
        src = px[x, y]
        if lum(src) > 30:
            out[(x, y)] = light
        elif (x, y + 1) not in mask or (x + 1, y) not in mask:
            out[(x, y)] = shade
        else:
            out[(x, y)] = base
    for k, v in out.items():
        px[k] = v
    return im


def add_long_hair(im, ramp):
    """SSJ3: a mane falling down both sides of the body, behind it."""
    im = im.copy()
    px = im.load()
    base, _, shade = [c + (255,) for c in ramp]
    W = im.width
    new = {}
    for y in range(9, 28):
        xs = [x for x in range(W) if px[x, y][3]]
        if not xs:
            continue
        w = 4 if y < 19 else 3 if y < 24 else 2
        for side, edge in ((-1, min(xs)), (1, max(xs))):
            for i in range(1, w + 1):
                x = edge + side * i
                if 0 <= x < W and not px[x, y][3]:
                    new[(x, y)] = OUTLINE if i == w else (shade if i == w - 1 else base)
    for k, v in new.items():
        px[k] = v
    # close the bottom of the mane
    for (x, y), v in list(new.items()):
        if y == 27 and v != OUTLINE and y + 1 < im.height and not px[x, y + 1][3]:
            px[x, y + 1] = OUTLINE
    return im


def shift_region(im, pred, dy):
    """Move every pixel matching pred(x, y) by dy rows; uncovered pixels go clear."""
    src = im.load()
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    o = out.load()
    moved = []
    for y in range(im.height):
        for x in range(im.width):
            c = src[x, y]
            if not c[3]:
                continue
            if pred(x, y):
                moved.append((x, y + dy, c))
            else:
                o[x, y] = c
    for x, y, c in moved:
        if 0 <= y < im.height:
            o[x, y] = c
    return out


def hero_frames(im, cfg):
    lt, mid = cfg["leg_top"], cfg["mid"]
    upper = lambda x, y: y < lt
    bob = shift_region(im, upper, 1)                       # body sinks 1px, feet planted
    left_up = shift_region(im, lambda x, y: y >= lt and x < mid, -1)
    right_up = shift_region(im, lambda x, y: y >= lt and x >= mid, -1)
    return [im, bob, left_up, bob, right_up, bob]


def strip(frames, cell):
    sheet = Image.new("RGBA", (cell * len(frames), cell), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * cell + (cell - f.width) // 2, cell - f.height))
    return sheet


def build_heroes():
    made = []
    for name, cfg in HEROES.items():
        base = Image.open(os.path.join(SRC, name + "_32.png")).convert("RGBA")
        for form in cfg["forms"]:
            if form == "base":
                im = base
            elif form == "ssj3":
                im = add_long_hair(recolor_hair(base, cfg, HAIR["ssj"]), HAIR["ssj"])
            else:
                im = recolor_hair(base, cfg, HAIR[form])
            sheet = strip(hero_frames(im, cfg), 32)
            fn = name if form == "base" else name + "_" + form
            sheet.save(os.path.join(OUT, fn + ".png"))
            made.append(fn)
    return made


def build_fusions():
    made = []
    CELL = 48
    for name in ("gogeta", "vegito"):
        im = Image.open(os.path.join(SRC, name + "_clean.png")).convert("RGBA")
        poses = json.load(open(os.path.join(SRC, name + "_poses.json")))
        for section, suffix in (("reg", ""), ("ssj", "_ssj"), ("ssj", "_blue")):
            boxes = poses[section]
            crop = lambda b: im.crop((b[0], b[1], b[0] + b[2], b[1] + b[3]))
            stand, fly = crop(boxes[0]), crop(boxes[2])
            if suffix == "_blue":
                stand, fly = to_blue(stand), to_blue(fly)
            frames = []
            for f in (stand, fly):
                c = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
                c.alpha_composite(f, ((CELL - f.width) // 2, CELL - f.height))
                lower = shift_region(c, lambda x, y: y < CELL - 14, 1)
                frames += [c, lower]
            strip(frames, CELL).save(os.path.join(OUT, name + suffix + ".png"))
            made.append(name + suffix)
    return made


def to_blue(im):
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[:3] == (255, 250, 188):
                px[x, y] = (88, 204, 255, 255)
            elif c[:3] == (153, 255, 206):
                px[x, y] = (110, 170, 255, 255)
    return im


def preview(names):
    rows = []
    for n in names:
        s = Image.open(os.path.join(OUT, n + ".png"))
        rows.append(s.resize((s.width * 4, s.height * 4), Image.NEAREST))
    W = max(r.width for r in rows) + 16
    H = sum(r.height + 8 for r in rows) + 8
    pv = Image.new("RGBA", (W, H), (58, 104, 50, 255))
    y = 8
    for r in rows:
        pv.alpha_composite(r, (8, y))
        y += r.height + 8
    pv.save(os.path.join(OUT, "_preview.png"))


if __name__ == "__main__":
    # Playable fighters now come from tools/make_fighters.py; this script only builds the fusions.
    names = build_fusions()
    preview(names)
    print("wrote", len(names), "sheets to", OUT)
