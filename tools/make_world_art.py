"""Terrain, structures, capsules, held items and rift bosses for ../art/.

Everything is generated: shapes are filled with a 3-tone palette, lit from the top-left,
lightly dithered, and outlined in the shared dark outline colour.
Run:  python tools/make_world_art.py   (needs Pillow; imports the sprite grids from make_art.py)
"""
import math, os, random, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_art as MA   # reuse render(), spr() data and the PNG conventions

ROOT = MA.ROOT
OUT = os.path.join(ROOT, "art")
K = (26, 16, 32, 255)


def hx(c):
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), 255)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def get(self, x, y):
        return self.px[y][x] if 0 <= x < self.w and 0 <= y < self.h else None

    def outline(self, col=K):
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is None and any(
                        self.get(x + dx, y + dy) not in (None, col) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    add.append((x, y))
        for x, y in add:
            self.px[y][x] = col

    def save(self, name):
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        p = im.load()
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x]:
                    p[x, y] = self.px[y][x]
        im.save(os.path.join(OUT, name + ".png"))
        return im


def shade3(pal, light):
    """Pick light/mid/dark by a 0..1 lighting value with ordered dithering at the edges."""
    L, M, D = pal
    return L if light > 0.66 else M if light > 0.33 else D


BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def lit(x, y, v):
    return v + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.18


# ---------------------------------------------------------------- palettes per biome
BIOMES = {
    "plains": dict(rock=("#c8b89c", "#9a8a6e", "#62543e"), ground=("#5ea446", "#54983e", "#4a8a36"),
                   accent="#3a7ac8", leaf=("#86d456", "#4e9e2e", "#2c6a1c"), trunk="#7a4a2a"),
    "waste": dict(rock=("#e2b88c", "#b8845a", "#7c5434"), ground=("#cc9e6c", "#c2925e", "#b68654"), accent="#c84a2a",
                  leaf=("#a8b84a", "#788a2a", "#4a5a1a"), trunk="#6a4a2a"),
    "rocky": dict(rock=("#c8a684", "#9c7a58", "#6a4e34"), ground=("#ae9070", "#a48666", "#987a5c"), accent="#a83a2a",
                  leaf=("#8a9a4a", "#5e6e2a", "#3a4a1a"), trunk="#5a3a22"),
    "namek": dict(rock=("#b4d8c8", "#7eaa98", "#4c7266"), ground=("#5cb49a", "#54aa90", "#4c9e86"), accent="#3a8ad8",
                  leaf=("#94e8d8", "#4cb4a4", "#2a7a70"), trunk="#a87a3a"),
    "cell": dict(rock=("#d4d0c4", "#a6a294", "#706c62"), ground=("#bcb8ac", "#b4b0a4", "#aca89c"), accent="#2a6ac8",
                 leaf=("#86c456", "#4e8e2e", "#2c5a1c"), trunk="#6a4a2a"),
    "buu": dict(rock=("#e0b2c0", "#b47e90", "#7c4e5e"), ground=("#b88e80", "#ae8476", "#a47a6c"), accent="#c83a8a",
                leaf=("#c89ab0", "#9a6a82", "#6a4058"), trunk="#5a3a2a"),
    "grass2": dict(rock=("#c0b49c", "#928670", "#5e5440"), ground=("#4e923e", "#488a38", "#428232"), accent="#d84a4a",
                   leaf=("#6abe52", "#3a8a2a", "#215a18"), trunk="#5a3a22"),
    "top": dict(rock=("#e8ecf6", "#b6bccc", "#7c8296"), ground=("#ccd0dc", "#c4c8d4", "#bcc0cc"), accent="#8a5ad8",
                leaf=("#a8b4d8", "#7a86aa", "#4c5674"), trunk="#5a5a6a"),
    "ice": dict(rock=("#f4fbff", "#b8def2", "#74a8cc"), ground=("#e2f0f8", "#dcecf6", "#d4e6f2"), accent="#4ab4e8",
                leaf=("#e8f6ff", "#a8d4ec", "#6aa0c4"), trunk="#7a6a5a"),
}


def P(biome, key):
    return tuple(hx(c) for c in BIOMES[biome][key])


# ---------------------------------------------------------------- ground tiles (64x64, calm)
def ground_tile(biome, seed, paved=None):
    rnd = random.Random(seed)
    g0, g1, g2 = P(biome, "ground")
    S = 64
    img = Image.new("RGBA", (S, S))
    p = img.load()
    # soft value noise, wrapped so the tile repeats
    grid = [[rnd.random() for _ in range(8)] for _ in range(8)]

    def noise(x, y):
        fx, fy = x / 8, y / 8
        x0, y0 = int(fx) % 8, int(fy) % 8
        x1, y1 = (x0 + 1) % 8, (y0 + 1) % 8
        tx, ty = fx - int(fx), fy - int(fy)
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        a = grid[y0][x0] + (grid[y0][x1] - grid[y0][x0]) * tx
        b = grid[y1][x0] + (grid[y1][x1] - grid[y1][x0]) * tx
        return a + (b - a) * ty

    for y in range(S):
        for x in range(S):
            v = noise(x, y) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.25
            p[x, y] = g0 if v > 0.62 else g1 if v > 0.36 else g2
    if paved:   # stone slabs with bevels
        step = paved
        hi, lo = mix(g0, (255, 255, 255), 0.25), mix(g2, (0, 0, 0), 0.25)
        for y in range(S):
            for x in range(S):
                off = step // 2 if (y // step) % 2 else 0
                if y % step == 0 or (x + off) % step == 0:
                    p[x, y] = lo
                elif y % step == 1 or (x + off) % step == 1:
                    p[x, y] = hi
    # a few tiny accents
    for _ in range(10):
        x, y = rnd.randrange(S), rnd.randrange(S)
        p[x, y] = mix(g0, (255, 255, 255), 0.25)
    for _ in range(10):
        x, y = rnd.randrange(S), rnd.randrange(S)
        p[x, y] = mix(g2, (0, 0, 0), 0.18)
    return img


# ---------------------------------------------------------------- structures
def mesa(biome, seed):
    """Tall layered rock pillar, the classic DBZ wasteland spire."""
    rnd = random.Random(seed)
    W, H = 44, 72
    c = Canvas(W, H)
    pal = P(biome, "rock")
    top_w, bot_w = rnd.randint(22, 28), rnd.randint(32, 38)
    edge_l = [rnd.uniform(-1.2, 1.2) for _ in range(H)]
    edge_r = [rnd.uniform(-1.2, 1.2) for _ in range(H)]
    for y in range(8, H):
        t = (y - 8) / (H - 8)
        half = (top_w + (bot_w - top_w) * t ** 1.4) / 2
        cx = W / 2
        x0, x1 = cx - half + edge_l[y], cx + half + edge_r[y]
        for x in range(int(x0), int(x1) + 1):
            u = (x - x0) / max(1, x1 - x0)
            v = 1 - u * 1.1 + (0.12 if (y // 7) % 2 else 0)
            col = shade3(pal, lit(x, y, v))
            if y % 9 == 0 and rnd.random() < 0.85:
                col = pal[2]
            c.set(x, y, col)
    for y in range(4, 13):   # cap
        for x in range(int(W / 2 - top_w / 2) - 1, int(W / 2 + top_w / 2) + 2):
            dx = (x - W / 2) / (top_w / 2 + 1)
            dy = (y - 8.5) / 4.5
            if dx * dx + dy * dy <= 1:
                c.set(x, y, pal[0] if dy < 0.3 else pal[1])
    c.outline()
    return c


def boulder(biome, seed, w=30, h=22):
    rnd = random.Random(seed)
    c = Canvas(w, h)
    pal = P(biome, "rock")
    bumps = [rnd.uniform(0.85, 1.05) for _ in range(12)]
    for y in range(h):
        for x in range(w):
            dx = (x - w / 2) / (w / 2 - 1)
            dy = (y - h * 0.58) / (h * 0.5)
            ang = math.atan2(dy, dx)
            r = bumps[int((ang + math.pi) / (2 * math.pi) * 12) % 12]
            if dx * dx + dy * dy <= r * r and y < h - 1:
                v = 1 - (dx + 1) * 0.35 - (dy + 1) * 0.35 + 0.35
                c.set(x, y, shade3(pal, lit(x, y, v)))
    c.outline()
    return c


def block(biome, variant=0):
    """3/4-view stone block: lit top face over a front face with mortar lines."""
    W, H = 16, 20
    c = Canvas(W, H)
    pal = P(biome, "rock")
    rnd = random.Random(variant * 31 + sum(map(ord, biome)))
    for y in range(H):
        for x in range(W):
            if y < 7:
                col = pal[0] if (x + y) % 7 else pal[1]
                if y == 6:
                    col = pal[1]
            else:
                col = pal[1] if x < W - 3 else pal[2]
                if y in (12, 17) or (x == (8 if y < 12 else 4 if y < 17 else 11)):
                    col = pal[2]
                if y == H - 1:
                    col = pal[2]
            c.set(x, y, col)
    if variant == 1:   # cracked / mossy
        moss = hx(BIOMES[biome]["leaf"][1])
        for _ in range(9):
            x, y = rnd.randrange(1, W - 1), rnd.randrange(0, 9)
            c.set(x, y, moss)
        for y in range(8, 18):
            c.set(6 + (y % 3) - 1, y, pal[2])
    c.outline()
    return c


def dome_house(biome):
    W, H = 52, 42
    c = Canvas(W, H)
    white = (hx("#f4f2ea"), hx("#d4d0c4"), hx("#9c988c"))
    acc = hx(BIOMES[biome]["accent"])
    cx, base = W / 2, H - 4
    for y in range(H):
        for x in range(W):
            dx = (x - cx) / 23
            dy = (y - base) / 30
            if dx * dx + dy * dy <= 1 and y <= base:
                v = 1 - (dx + 1) * 0.45 + (1 + dy) * 0.25
                c.set(x, y, shade3(white, lit(x, y, v)))
    for y in range(base - 4, base + 3):   # base band
        for x in range(3, W - 3):
            c.set(x, y, acc if y < base - 1 else mix(acc, (0, 0, 0), 0.35))
    for y in range(base - 14, base + 3):   # door
        for x in range(int(cx) - 5, int(cx) + 5):
            if (x - cx + 0.5) ** 2 / 25 + max(0, base - 9 - y) ** 2 / 25 <= 1:
                c.set(x, y, hx("#3a3446"))
    for (wx, wy) in ((12, 20), (W - 13, 20)):   # round windows
        for y in range(wy - 3, wy + 4):
            for x in range(wx - 3, wx + 4):
                if (x - wx) ** 2 + (y - wy) ** 2 <= 9:
                    c.set(x, y, hx("#6ac0f0") if (x - wx) ** 2 + (y - wy) ** 2 <= 4 else hx("#5a5668"))
        c.set(wx - 1, wy - 1, hx("#e8f8ff"))
    c.outline()
    return c


def namek_house():
    W, H = 40, 40
    c = Canvas(W, H)
    pal = (hx("#f0f6ee"), hx("#c8dccc"), hx("#8aa894"))
    for (cx, by, rx, ry) in ((20, 37, 16, 26), (9, 37, 7, 10), (32, 37, 6, 9)):
        for y in range(H):
            for x in range(W):
                dx, dy = (x - cx) / rx, (y - by) / ry
                if dx * dx + dy * dy <= 1 and y <= by:
                    c.set(x, y, shade3(pal, lit(x, y, 1 - (dx + 1) * 0.45 + (1 + dy) * 0.2)))
    for (wx, wy) in ((15, 22), (25, 22), (20, 14)):
        for y in range(wy - 2, wy + 3):
            for x in range(wx - 2, wx + 3):
                if (x - wx) ** 2 + (y - wy) ** 2 <= 4:
                    c.set(x, y, hx("#3a4a5a"))
    for y in range(28, 38):
        for x in range(17, 24):
            c.set(x, y, hx("#3a4a5a"))
    c.outline()
    return c


def column(biome, broken=False, seed=0):
    rnd = random.Random(seed)
    W, H = 18, 52
    c = Canvas(W, H)
    pal = P(biome, "rock")
    top = rnd.randint(14, 24) if broken else 3
    for y in range(top, H):
        for x in range(W):
            if y >= H - 5:   # base
                ok = 0 <= x < W
                v = 0.9 if y == H - 5 else 0.5
            elif y < top + 4 and not broken:   # capital
                ok = True
                v = 0.95 if y == top else 0.6
            else:
                ok = 3 <= x < W - 3
                v = 1 - (x - 3) / (W - 6) * 1.1 + (0.12 if (x - 3) % 3 == 0 else 0)
            if ok:
                c.set(x, y, shade3(pal, lit(x, y, v)))
    if broken:   # jagged top
        for x in range(3, W - 3):
            for y in range(top, top + rnd.randint(0, 5)):
                c.set(x, y, None)
    c.outline()
    return c


def crystal(seed):
    rnd = random.Random(seed)
    W, H = 28, 44
    c = Canvas(W, H)
    pal = (hx("#f4feff"), hx("#9adcf6"), hx("#4a9ccc"))
    for (bx, h, w, lean) in ((14, 40, 5, 0.0), (8, 26, 4, -0.25), (20, 30, 4, 0.22)):
        for y in range(H - h, H - 1):
            t = (H - y) / h
            cx = bx + lean * (H - y)
            half = w * (1 - max(0, t - 0.75) * 3.6)
            for x in range(int(cx - half), int(cx + half) + 1):
                u = (x - (cx - half)) / max(1, 2 * half)
                c.set(x, y, pal[0] if u < 0.3 else pal[1] if u < 0.7 else pal[2])
    c.outline()
    return c


def tree(biome, seed, big=True):
    rnd = random.Random(seed)
    W, H = (34, 44) if big else (22, 28)
    c = Canvas(W, H)
    leaf = P(biome, "leaf")
    trunk = hx(BIOMES[biome]["trunk"])
    tw = 3 if big else 2
    for y in range(H - 16 if big else H - 10, H - 1):
        for x in range(W // 2 - tw, W // 2 + tw):
            c.set(x, y, trunk if x < W // 2 + tw - 1 else mix(trunk, (0, 0, 0), 0.35))
    blobs = [(W / 2, H * 0.36, W * 0.42)] + [(W / 2 + rnd.uniform(-W * 0.25, W * 0.25), H * rnd.uniform(0.25, 0.5), W * rnd.uniform(0.22, 0.3)) for _ in range(4)]
    for y in range(H):
        for x in range(W):
            best = None
            for (bx, by, r) in blobs:
                d = ((x - bx) ** 2 + (y - by) ** 2) / (r * r)
                if d <= 1:
                    v = 1 - (x - bx + r) / (2 * r) * 0.8 - (y - by + r) / (2 * r) * 0.6 + 0.45
                    best = v if best is None else max(best, v)
            if best is not None:
                c.set(x, y, shade3(leaf, lit(x, y, best)))
    c.outline()
    return c


# ---------------------------------------------------------------- ground decals (no outline)
def decal(kind, biome, seed):
    rnd = random.Random(seed)
    g0, g1, g2 = P(biome, "ground")
    leaf = P(biome, "leaf")
    rock = P(biome, "rock")
    if kind == "crater":
        W, H = 52, 26
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); p = im.load()
        for y in range(H):
            for x in range(W):
                dx, dy = (x - W / 2) / (W / 2), (y - H / 2) / (H / 2)
                d = dx * dx + dy * dy
                if d <= 1:
                    if d > 0.72:
                        p[x, y] = mix(g0, (255, 255, 255), 0.15) if dy < 0 else mix(g2, (0, 0, 0), 0.2)
                    else:
                        p[x, y] = mix(g2, (0, 0, 0), 0.28 if dy < -0.1 else 0.12)
        return im
    if kind == "grass":
        W, H = 26, 12
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); p = im.load()
        for _ in range(9):
            x, y = rnd.randrange(2, W - 3), rnd.randrange(4, H)
            col = leaf[rnd.randrange(2)]
            for k in range(rnd.randint(2, 4)):
                if 0 <= y - k < H:
                    p[x + (k % 2) * rnd.choice((-1, 1)) if 0 < x < W - 1 else x, y - k] = col
        return im
    if kind == "flowers":
        W, H = 18, 10
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); p = im.load()
        cols = [hx("#ffe060"), hx("#ff8ab0"), hx("#ffffff"), hx("#a0c8ff")]
        for _ in range(5):
            x, y = rnd.randrange(1, W - 1), rnd.randrange(1, H - 1)
            c = rnd.choice(cols)
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                p[x + dx, y + dy] = c if (dx, dy) != (0, 0) else hx("#f0a020")
        return im
    if kind == "crack":
        W, H = 28, 14
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); p = im.load()
        x, y = 1, H // 2
        dark = mix(g2, (0, 0, 0), 0.4)
        while x < W - 1:
            p[x, y] = dark
            x += 1
            y = max(1, min(H - 2, y + rnd.choice((-1, 0, 0, 1))))
            if rnd.random() < 0.15:
                bx, by = x, y
                for _ in range(rnd.randint(2, 5)):
                    by = max(0, min(H - 1, by + rnd.choice((-1, 1)))); bx += 1
                    if bx < W:
                        p[bx, by] = dark
        return im
    if kind == "rubble":
        W, H = 22, 10
        c = Canvas(W, H)
        for _ in range(5):
            x, y = rnd.randrange(2, W - 3), rnd.randrange(2, H - 2)
            for dx in range(rnd.randint(1, 3)):
                for dy in range(rnd.randint(1, 2)):
                    c.set(x + dx, y + dy, rock[0] if dy == 0 else rock[1])
        c.outline()
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); p = im.load()
        for y in range(H):
            for x in range(W):
                if c.px[y][x]:
                    p[x, y] = c.px[y][x]
        return im
    raise ValueError(kind)


# ---------------------------------------------------------------- capsules, items, icons
def capsule(color, mark):
    """Hoi-Poi capsule: coloured cap, white body, little number band."""
    W, H = 14, 9
    c = Canvas(W, H)
    col = hx(color)
    dark = mix(col, (0, 0, 0), 0.35)
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            rr = min(x - 1, W - 2 - x, 3)
            if (y in (1, H - 2)) and rr == 0:
                continue
            if x < 6:
                c.set(x, y, col if y < H - 3 else dark)
            elif x == 6:
                c.set(x, y, hx("#3a3446"))
            else:
                c.set(x, y, hx("#f4f4f0") if y < H - 3 else hx("#b8b8c4"))
    c.set(2, 2, mix(col, (255, 255, 255), 0.6))
    for (x, y) in mark:
        c.set(x, y, dark)
    c.outline()
    return c


def item_icon(kind):
    c = Canvas(16, 16)
    s = c.set
    if kind == "pole":   # Power Pole: red staff with gold caps, diagonal
        for i in range(2, 14):
            s(i, 15 - i, hx("#d83a2a")); s(i + 1, 15 - i, hx("#8a1a12"))
        for (x, y) in ((1, 14), (2, 14), (1, 13), (13, 1), (14, 1), (14, 2)):
            s(x, y, hx("#f2c43a"))
    elif kind == "nimbus":
        for y in range(5, 13):
            for x in range(1, 15):
                for (bx, by, r) in ((5, 9, 4), (10, 8, 4.5), (8, 11, 4)):
                    if (x - bx) ** 2 + (y - by) ** 2 <= r * r:
                        s(x, y, hx("#fff27a") if y < 9 else hx("#f2c43a"))
        s(5, 7, hx("#ffffff")); s(10, 6, hx("#ffffff"))
    elif kind == "potara":
        for y in range(2, 9):
            for x in range(5, 12):
                if (x - 8) ** 2 + (y - 5) ** 2 <= 9:
                    s(x, y, hx("#f2c43a") if (x - 8) ** 2 + (y - 5) ** 2 > 3 else hx("#ffe88a"))
        for y in range(9, 15):
            for x in range(6, 11):
                if (x - 8) ** 2 + (y - 12) ** 2 <= 6:
                    s(x, y, hx("#3ac85a") if y < 13 else hx("#1a8a3a"))
    elif kind == "senzu":   # pouch
        for y in range(4, 15):
            for x in range(3, 13):
                if (x - 8) ** 2 / 25 + (y - 10) ** 2 / 25 <= 1:
                    s(x, y, hx("#b88a52") if x < 9 else hx("#8a5e32"))
        for x in range(5, 11):
            s(x, 4, hx("#5a3a1a"))
        s(7, 2, hx("#6ab83a")); s(8, 2, hx("#6ab83a")); s(8, 3, hx("#3a7a22"))
    elif kind == "radar":
        for y in range(2, 15):
            for x in range(1, 15):
                d = (x - 8) ** 2 + (y - 8) ** 2
                if d <= 36:
                    s(x, y, hx("#c8ccd8") if d > 25 else hx("#3ac85a"))
        for i in range(3, 14):
            s(i, 8, hx("#1a8a3a")); s(8, i - 1, hx("#1a8a3a"))
        s(10, 6, hx("#ff9a1a")); s(6, 10, hx("#ff9a1a")); s(8, 1, hx("#c8ccd8"))
    elif kind == "ring":   # Time Ring
        for y in range(1, 15):
            for x in range(1, 15):
                d = (x - 8) ** 2 + (y - 8) ** 2
                if 16 <= d <= 42:
                    s(x, y, hx("#f2c43a") if x + y < 17 else hx("#b8862a"))
        for (x, y) in ((7, 1), (8, 1), (7, 2), (8, 2)):
            s(x, y, hx("#3ac85a"))
    c.outline()
    return c


def icon_skull():
    c = Canvas(12, 12)
    for y in range(1, 9):
        for x in range(1, 11):
            if (x - 5.5) ** 2 / 25 + (y - 5) ** 2 / 18 <= 1:
                c.set(x, y, hx("#f4f0e4"))
    for x in range(3, 9):
        for y in range(8, 11):
            c.set(x, y, hx("#f4f0e4"))
    for (x, y) in ((3, 5), (4, 5), (3, 6), (4, 6), (7, 5), (8, 5), (7, 6), (8, 6), (4, 10), (6, 10)):
        c.set(x, y, K)
    c.outline()
    return c


# ---------------------------------------------------------------- rift bosses (16px grids)
def rift_bosses():
    MA.spr("raditz", [
        "...K.K.K", "..KHKHKH", ".KHHHHHH", "KHHHHHHH", "KHHKSSSS", "KHKSSSSS", "KHKSEWSS", "KHHKSSSS",
        "KHKAAKSS", "KHAAAKAA", "KHSKAAAA", "KHSKGGGG", "KHHKOOOO", ".KHKOOOO", "..KHOOOK", "...KBBBK",
    ], dict(H="#1d1a26", S="#f0c090", E="#1a1a1a", W="#ffffff", A="#5a3a24", G="#2e2016", O="#3a2a4a", B="#e8e0d0"))
    MA.variant("cooler", "frieza", S="#d6dbf2", P="#4a2a8a", E="#e02020")
    MA.spr("janemba", [
        "..K....K", ".KRK..KR", ".KRRKKRR", "..KRRRRR", "..KRRRRR", "..KRYERR", "..KRRRRR", "...KRKKR",
        "KRRKYYYY", "KRRKYYYY", "KRKRRYYY", "KRKRRRRR", ".KKRRRRR", "..KRRRRR", "..KRRRK.", "..KKKKK.",
    ], dict(R="#c8203a", Y="#f2d040", E="#fff8a0"))
    MA.spr("hit", [
        "........", "....KKKK", "...KSSSS", "..KSSSSS", "..KSsSSS", "..KSEWSS", "..KSSSSS", "...KSSSS",
        "..KOOOKC", ".KOOOKOO", ".KOOKOOO", ".KSKOOOO", ".KSKOOOO", "..KOOOOO", "..KOOKOO", "...KBBBK",
    ], dict(S="#a07ac8", s="#7a54a2", E="#f0e040", W="#ffffff", O="#3a2a5a", C="#d8d0e8", B="#2a2a2a"))
    MA.spr("beerus", [
        "..K....K", ".KSK..KS", ".KSSKKSS", "..KSSSSS", "..KSSSSS", "..KSEESS", "..KSSSSS", "...KSSSS",
        "..KGGKSS", ".KSSKSSS", ".KGKSSSS", ".KSKOOOO", ".KSKGGGG", "..KOOOOO", "..KOOOOK", "...KGGGK",
    ], dict(S="#8a6ab8", E="#f0e040", G="#e8c040", O="#2a2a34"))
    out = []
    for n in ("raditz", "cooler", "janemba", "hit", "beerus"):
        rows, pal, w, rim = MA.SPR[n]
        W, H, px = MA.render(rows, pal, w, rim)
        MA.write_png(os.path.join(OUT, n + ".png"), W, H, px)
        out.append(n)
    return out


def main():
    made = []
    for b in BIOMES:
        paved = {"cell": 16, "top": 16}.get(b)
        ground_tile(b, sum(map(ord, b)), paved).save(os.path.join(OUT, "g_" + b + ".png")); made.append("g_" + b)
        for i in range(2):
            boulder(b, i * 7 + 3, *((30, 22) if i == 0 else (20, 15))).save("s_boulder%d_%s" % (i, b)); made.append("s_boulder%d_%s" % (i, b))
            block(b, i).save("s_block%d_%s" % (i, b)); made.append("s_block%d_%s" % (i, b))
        mesa(b, 11).save("s_mesa_" + b); made.append("s_mesa_" + b)
        column(b, False, 1).save("s_column_" + b); column(b, True, 2).save("s_ruin_" + b)
        dome_house(b).save("s_house_" + b)
        tree(b, 5, True).save("s_tree_" + b); tree(b, 9, False).save("s_bush_" + b)
        made += ["s_column_" + b, "s_ruin_" + b, "s_house_" + b, "s_tree_" + b, "s_bush_" + b]
        for k in ("crater", "grass", "flowers", "crack", "rubble"):
            decal(k, b, len(made)).save(os.path.join(OUT, "d_%s_%s.png" % (k, b))); made.append("d_%s_%s" % (k, b))
    namek_house().save("s_nhouse"); crystal(4).save("s_crystal"); made += ["s_nhouse", "s_crystal"]
    caps = {
        "cap_heal": ("#e8403a", [(9, 3), (9, 4), (8, 4), (10, 4), (9, 5)]),
        "cap_speed": ("#3a8ae8", [(8, 3), (9, 4), (10, 5), (8, 5)]),
        "cap_dex": ("#3ac85a", [(8, 3), (9, 3), (10, 3), (9, 4), (9, 5)]),
        "cap_power": ("#f08a1a", [(9, 3), (8, 4), (10, 4), (9, 5)]),
        "cap_magnet": ("#e8d03a", [(8, 3), (8, 4), (10, 3), (10, 4), (9, 5)]),
        "cap_item": ("#c8a020", [(9, 2), (8, 3), (9, 3), (10, 3), (9, 4), (8, 5), (10, 5)]),
    }
    for n, (col, mark) in caps.items():
        capsule(col, mark).save(n); made.append(n)
    for k in ("pole", "nimbus", "potara", "senzu", "radar", "ring"):
        item_icon(k).save("item_" + k); made.append("item_" + k)
    icon_skull().save("icon_skull"); made.append("icon_skull")
    made += rift_bosses()
    print("wrote", len(made), "world sprites")


if __name__ == "__main__":
    main()
