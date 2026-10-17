"""Builds the playable fighters' animated strips into ../art/hd/ from the ripped sheets in ../src_art/.

Sources (backgrounds already stripped by sheet_tools, frame boxes in new_frames.json):
  jus_goku_clean.png, jus_vegeta_clean.png   Jump Ultimate Stars (DS), drawn in base form
  eb_gohan_clean.png                         Extreme Butoden (3DS), drawn as Super Saiyan
  gt_piccolo_clean.png                       Dragon Ball GT: Transformation (GBA)

Output strips are 8 square frames: idle0-3 then move0-3, all facing right.
Run:  python tools/make_fighters.py   (needs Pillow)
"""
import colorsys, json, os
from collections import Counter
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src_art")
OUT = os.path.join(ROOT, "art", "hd")
os.makedirs(OUT, exist_ok=True)
FRAMES = json.load(open(os.path.join(SRC, "new_frames.json")))

RAMPS = {  # light, base, shade
    "ssj":   ((255, 248, 168), (255, 214, 58), (206, 140, 24)),
    "ssj2":  ((255, 255, 214), (255, 232, 96), (226, 170, 40)),
    "god":   ((255, 120, 120), (214, 36, 58), (140, 16, 40)),
    "blue":  ((190, 242, 255), (60, 196, 255), (26, 120, 204)),
    "ui":    ((255, 255, 255), (214, 218, 238), (146, 152, 186)),
    "ue":    ((206, 146, 255), (138, 58, 216), (84, 26, 146)),
    "black": ((92, 90, 108), (42, 40, 54), (18, 16, 26)),
    "white": ((255, 255, 255), (222, 224, 238), (160, 162, 186)),
}


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


# ---------------------------------------------------------------- frame helpers
def crop(im, box):
    x, y, w, h = box
    return im.crop((x, y, x + w, y + h))


def split_even(box, n):
    x, y, w, h = box
    step = w / n
    return [(round(x + i * step), y, round(step), h) for i in range(n)]


def main_blob(im):
    """Drop slivers of neighbouring frames: keep the largest opaque blob (plus anything touching it)."""
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from sheet_tools import components
    boxes = components(im, min_pixels=1, merge_gap=1)
    if len(boxes) <= 1:
        return im
    big = max(boxes, key=lambda b: b[2] * b[3])
    x, y, w, h = big
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(im.crop((x, y, x + w, y + h)), (x, y))
    return out


def tighten(im):
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def palette_downscale(im, scale):
    """Box-filter downscale, then snap each pixel back to the source palette (keeps crisp pixel art)."""
    src = im.convert("RGBA")
    pal = [c for c, _ in Counter(p for p in src.get_flattened_data() if p[3] > 0).most_common(64)]
    w, h = max(1, round(src.width * scale)), max(1, round(src.height * scale))
    small = src.resize((w, h), Image.BOX)
    px = small.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 110:
                px[x, y] = (0, 0, 0, 0)
                continue
            # un-premultiply against transparent neighbours
            k = 255 / a
            r, g, b = min(255, r * k), min(255, g * k), min(255, b * k)
            best = min(pal, key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2)
            px[x, y] = best[:3] + (255,)
    return small


def feet_x(im):
    """Horizontal centre of the lowest rows, used to keep idle frames from jittering."""
    px = im.load()
    for y in range(im.height - 1, -1, -1):
        xs = [x for x in range(im.width) if px[x, y][3]]
        if len(xs) >= 2:
            ys = [y2 for y2 in range(max(0, y - 3), y + 1)]
            xs = [x for y2 in ys for x in range(im.width) if px[x, y2][3]]
            return sum(xs) / len(xs)
    return im.width / 2


def strip(idle, move, cell):
    frames = idle + move
    sheet = Image.new("RGBA", (cell * len(frames), cell), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        anchor = feet_x(f) if i < len(idle) else f.width / 2
        x = round(i * cell + cell / 2 - anchor)
        x = max(i * cell, min(x, (i + 1) * cell - f.width))
        sheet.alpha_composite(f, (x, cell - f.height))
    return sheet


# ---------------------------------------------------------------- hair recolouring
def jus_hair_mask(im, family):
    """JUS draws hair in the same black as the outline: hair = family pixels whose 4 neighbours are all family."""
    px = im.load()
    W, H = im.size
    fam = lambda x, y: 0 <= x < W and 0 <= y < H and px[x, y][3] and px[x, y][:3] in family
    m = set()
    for y in range(H):
        for x in range(W):
            if fam(x, y) and fam(x - 1, y) and fam(x + 1, y) and fam(x, y - 1) and fam(x, y + 1):
                m.add((x, y))
    # grow one step into thin spikes that only touch transparency and hair
    grow = set()
    for (x, y) in m:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) in m or not fam(nx, ny):
                continue
            ok = True
            for ax, ay in ((nx + 1, ny), (nx - 1, ny), (nx, ny + 1), (nx, ny - 1)):
                if 0 <= ax < W and 0 <= ay < H and px[ax, ay][3] and px[ax, ay][:3] not in family:
                    ok = False
            edge = sum(1 for ax, ay in ((nx + 1, ny), (nx - 1, ny), (nx, ny + 1), (nx, ny - 1))
                       if not (0 <= ax < W and 0 <= ay < H) or not px[ax, ay][3])
            if ok and edge == 0:
                grow.add((nx, ny))
    return m | grow


def gohan_hair_mask(im):
    """Full-resolution Extreme Butoden frame: yellow hues in the head area are hair."""
    px = im.load()
    W, H = im.size
    m = set()
    for y in range(int(H * 0.31)):
        for x in range(W):
            c = px[x, y]
            if not c[3]:
                continue
            h, s, v = colorsys.rgb_to_hsv(*(q / 255 for q in c[:3]))
            if 0.098 <= h <= 0.18 and s > 0.3 and v > 0.4:
                m.add((x, y))
    return m


def paint(im, mask, ramp):
    im = im.copy()
    px = im.load()
    light, base, shade = [c + (255,) for c in ramp]
    vals = sorted(lum(px[p]) for p in mask) or [0]
    lo, hi = vals[len(vals) // 4], vals[(len(vals) * 3) // 4]
    for p in mask:
        L = lum(px[p])
        x, y = p
        below = (x, y + 1) not in mask
        if L > hi + 1:
            px[p] = light
        elif L < lo - 1 or (below and L <= lo + 1):
            px[p] = shade
        else:
            px[p] = base
    return im


def long_hair(im, mask, ramp):
    """SSJ3 mane: a tapered band falling from the back of the head, drawn behind the sprite."""
    if not mask:
        return im
    PAD = 12
    W, H = im.width + PAD, im.height
    light, base, shade = [c + (255,) for c in ramp]
    back = min(x for x, _ in mask) + PAD
    top = min(y for _, y in mask)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lp = layer.load()
    end = min(H - 2, top + int(H * 0.8))
    for y in range(top + 2, end):
        t = (y - top) / max(1, end - top)
        cx = back + 2 - t * 12
        half = 6 * (1 - t) + 1.5
        x0, x1 = int(cx - half), int(cx + half)
        for x in range(x0, x1 + 1):
            if 0 <= x < W:
                edge = x in (x0, x1) or y == end - 1
                lp[x, y] = (8, 8, 8, 255) if edge else (light if x == x0 + 1 else shade if x >= x1 - 1 else base)
    layer.alpha_composite(im, (PAD, 0))
    return tighten(layer)


def recolor_hue(im, hue_lo, hue_hi, mapping_ramp):
    """Recolour every pixel whose hue falls in a range (Piccolo's skin) onto a ramp by brightness."""
    im = im.copy()
    px = im.load()
    light, base, shade = mapping_ramp
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if not c[3]:
                continue
            h, s, v = colorsys.rgb_to_hsv(*(q / 255 for q in c[:3]))
            if hue_lo <= h * 360 <= hue_hi and s > 0.4:
                px[x, y] = (light if v > 0.62 else base if v > 0.38 else shade) + (255,)
    return im


# ---------------------------------------------------------------- fighters
def frames_for(name, idle_idx, move_idx, scale=1.0, extra=None):
    im = Image.open(os.path.join(SRC, name + "_clean.png")).convert("RGBA")
    boxes = FRAMES[name]
    get = lambda b: tighten(crop(im, b))
    idle = [get(b) if isinstance(b, tuple) else get(boxes[b]) for b in idle_idx]
    move = [get(b) if isinstance(b, tuple) else get(boxes[b]) for b in move_idx]
    if scale != 1.0:
        idle = [palette_downscale(f, scale) for f in idle]
        move = [palette_downscale(f, scale) for f in move]
    return idle, move


def build():
    made = []

    def save(name, idle, move):
        cell = max(max(f.width for f in idle + move), max(f.height for f in idle + move))
        cell += cell % 2
        strip(idle, move, cell).save(os.path.join(OUT, name + ".png"))
        made.append(name)

    # Vegeta (JUS): idle 0-3, dash 4-7. Goku, base Gohan and Piccolo come from make_eb.py and make_npcs.py.
    for who, family, forms in (
        ("vegeta", {(8, 8, 8), (74, 74, 74)}, ["base", "ssj", "ssj2", "blue", "ue"]),
    ):
        idle, move = frames_for("jus_" + who, [0, 1, 2, 3], [4, 5, 6, 7])
        for form in forms:
            def conv(f):
                if form == "base":
                    return f
                m = jus_hair_mask(f, family)
                g = paint(f, m, RAMPS["ssj" if form == "ssj3" else form])
                return long_hair(g, m, RAMPS["ssj"]) if form == "ssj3" else g
            save(who if form == "base" else who + "_" + form, [conv(f) for f in idle], [conv(f) for f in move])

    # Goku Black and Rose for the rift: JUS Goku with a charcoal gi
    black_gi = {(255, 181, 0): (118, 116, 132), (222, 57, 0): (74, 72, 88), (148, 16, 0): (42, 40, 52),
                (132, 74, 0): (54, 52, 64), (0, 0, 156): (24, 22, 34), (0, 74, 255): (56, 54, 74)}
    def regi(f):
        f = f.copy(); px = f.load()
        for y in range(f.height):
            for x in range(f.width):
                c = px[x, y]
                if c[3] and c[:3] in black_gi:
                    px[x, y] = black_gi[c[:3]] + (255,)
        return f
    idle, move = frames_for("jus_goku", [0, 1, 2, 3], [4, 5, 6, 7])
    save("goku_black", [regi(f) for f in idle], [regi(f) for f in move])
    rose = ((255, 196, 228), (240, 110, 180), (176, 52, 120))
    fam = {(8, 8, 8), (57, 57, 49)}
    save("goku_rose", [paint(regi(f), jus_hair_mask(f, fam), rose) for f in idle], [paint(regi(f), jus_hair_mask(f, fam), rose) for f in move])

    # Gohan (Extreme Butoden, drawn as SSJ): stance 13-16, step 18,19,20,19
    idle, move = frames_for("eb_gohan", [13, 14, 15, 16], [18, 19, 20, 19])
    idle, move = [ImageOps.mirror(f) for f in idle], [ImageOps.mirror(f) for f in move]   # EB faces left
    for form, ramp in (("ssj", None), ("ssj2", "ssj2"), ("ult", "black"), ("beast", "white")):
        def conv(f, ramp=ramp):
            f = f if ramp is None else paint(f, gohan_hair_mask(f), RAMPS[ramp])
            return palette_downscale(f, 0.42)
        save("gohan" if form == "base" else "gohan_" + form, [conv(f) for f in idle], [conv(f) for f in move])

    return made


def preview(names):
    rows = [Image.open(os.path.join(OUT, n + ".png")) for n in names]
    rows = [r.resize((r.width * 2, r.height * 2), Image.NEAREST) for r in rows]
    W = max(r.width for r in rows) + 16
    pv = Image.new("RGBA", (W, sum(r.height + 6 for r in rows) + 10), (58, 104, 50, 255))
    y = 6
    for r in rows:
        pv.alpha_composite(r, (8, y)); y += r.height + 6
    pv.save(os.path.join(OUT, "_fighters_preview.png"))


if __name__ == "__main__":
    names = build()
    preview(names)
    print("wrote", len(names), "fighter strips")
