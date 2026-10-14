"""Generates every pixel-art PNG the game uses into ../art/.

Sprites are written as text grids. A row that is half the sprite width is
mirrored to make a symmetric row; a full-width row is used as-is.
'.' is transparent; every other letter is looked up in the sprite's palette.

Run:  python tools/make_art.py
"""
import os, random, struct, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "art")
os.makedirs(OUT, exist_ok=True)

K = "#1a1020"  # shared outline


# ---------------------------------------------------------------- png writer
def hex2rgba(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def write_png(path, w, h, px):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend(px[y * w + x])

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def shade(c, f):
    r, g, b, a = c
    if f < 1:
        return (int(r * f), int(g * f), int(b * f), a)
    return (min(255, int(r + (255 - r) * (f - 1))), min(255, int(g + (255 - g) * (f - 1))),
            min(255, int(b + (255 - b) * (f - 1))), a)


# ---------------------------------------------------------------- sprites
def expand(rows, w):
    out = []
    for r in rows:
        if len(r) == w // 2:
            out.append(r + r[::-1])
        elif len(r) == w:
            out.append(r)
        else:
            raise ValueError("bad row %r (len %d) for width %d" % (r, len(r), w))
    return out


NO_SHADE = set("KEW.")


def render(rows, pal, w=16, rim=True):
    grid = expand(rows, w)
    h = len(grid)
    pal = dict(pal)
    pal.setdefault("K", K)
    px = []
    for y in range(h):
        for x in range(w):
            ch = grid[y][x]
            if ch == ".":
                px.append((0, 0, 0, 0))
                continue
            if ch not in pal:
                raise KeyError("no colour for %r" % ch)
            c = hex2rgba(pal[ch])
            if rim and ch not in NO_SHADE:
                right = grid[y][x + 1] if x + 1 < w else "."
                left = grid[y][x - 1] if x > 0 else "."
                below = grid[y + 1][x] if y + 1 < h else "."
                if x >= w // 2 and right in ".K":
                    c = shade(c, 0.72)
                elif x < w // 2 and left in ".K":
                    c = shade(c, 1.18)
                elif below in ".K" and y > h // 2:
                    c = shade(c, 0.85)
            px.append(c)
    return w, h, px


SPR = {}


def spr(name, rows, pal, w=16, rim=True):
    SPR[name] = (rows, pal, w, rim)


def variant(name, base, **over):
    rows, pal, w, rim = SPR[base]
    p = dict(pal)
    p.update(over)
    SPR[name] = (rows, p, w, rim)


SKIN = "#f5c08e"
BLACK_HAIR = "#23202e"

# ---- heroes ---------------------------------------------------------------
spr("goku", [
    "...K..K.",
    "..KHK.KH",
    ".KHHHKHH",
    "KHHHHHHH",
    "KHHHHHHH",
    ".KHSSHSS",
    "..KSSSSS",
    "..KSEWSS",
    "...KSSSS",
    "..KOOKPP",
    ".KSOOOKP",
    ".KSKOOOO",
    ".KSKPPPP",
    "..KKOOOO",
    "...KOOOK",
    "...KBBBK",
], dict(H=BLACK_HAIR, S=SKIN, E=BLACK_HAIR, W="#ffffff", O="#f2841c", P="#2b56c8", B="#1f3f9a"))

spr("goku_ssj3", [
    "...K..K.",
    "..KHK.KH",
    ".KHHHKHH",
    "KHHHHHHH",
    "KHHHHHHH",
    "KHHSSHSS",
    "KHKSSSSS",
    "KHKSEWSS",
    "KHHKSSSS",
    "KHKOOKPP",
    "KHSOOOKP",
    "KHSKOOOO",
    "KHSKPPPP",
    "KHKKOOOO",
    ".KHKOOOK",
    "..KKBBBK",
], dict(H="#ffd83a", S=SKIN, E="#1aa89a", W="#ffffff", O="#f2841c", P="#2b56c8", B="#1f3f9a"))

SSJ = dict(H="#ffd83a", E="#1aa89a")
variant("goku_ssj", "goku", **SSJ)
variant("goku_ssj2", "goku", H="#fff07a", E="#1aa89a")
variant("goku_god", "goku", H="#d8263a", E="#b8203a")
variant("goku_blue", "goku", H="#40c8ff", E="#2a8ad8")
variant("goku_ui", "goku", H="#d8dcf0", E="#8a90b8", O="#e2741a")

spr("gohan", [
    "........",
    "....K..K",
    "...KHKKH",
    "..KHHHHH",
    ".KHHHHHH",
    ".KHHHHHH",
    "..KHSSHS",
    "..KSEWSS",
    "...KSSSS",
    "..KOOKSS",
    ".KSOOOOK",
    ".KSKOOOO",
    ".KSKRRRR",
    "..KKOOOO",
    "...KOOOK",
    "...KBBBK",
], dict(H=BLACK_HAIR, S=SKIN, E=BLACK_HAIR, W="#ffffff", O="#5a3a96", R="#d8382c", B="#2c2440"))
variant("gohan_ssj", "gohan", **SSJ)
variant("gohan_ssj2", "gohan", H="#fff07a", E="#1aa89a")
variant("gohan_ult", "gohan", O="#f2841c", R="#2b56c8", B="#1f3f9a")
variant("gohan_beast", "gohan", H="#eceef6", E="#d0283a")

spr("vegeta", [
    ".....K.K",
    "....KHKH",
    "...KHHHH",
    "..KHHHHH",
    "..KHHHHH",
    "..KHHHHH",
    "..KHSSSH",
    "..KSEWSS",
    "...KSSSS",
    "..KAAKOO",
    ".KOAAAAA",
    ".KAKAAAA",
    ".KAKGGGG",
    "..KKOOOO",
    "...KOOOK",
    "...KAAAK",
], dict(H=BLACK_HAIR, S=SKIN, E=BLACK_HAIR, W="#ffffff", A="#f2f2ee", O="#2b3db0", G="#e8c23c"))
variant("vegeta_ssj", "vegeta", **SSJ)
variant("vegeta_ssj2", "vegeta", H="#fff07a", E="#1aa89a")
variant("vegeta_blue", "vegeta", H="#40c8ff", E="#2a8ad8")
variant("vegeta_ue", "vegeta", H="#8a3ad8", E="#c070ff", O="#3a2a8a")

spr("piccolo", [
    "........",
    "...KKKKK",
    "..KWWWWW",
    ".KWWWWWW",
    ".KWWWWWW",
    ".KwwwwwO",
    ".KKSSSSS",
    "..KSEWSS",
    "...KSSSS",
    "..KWWKOS",
    ".WKSOOOO",
    ".WKSOOOO",
    ".WKSPPPP",
    ".WKKOOOO",
    ".WWKOOOK",
    "..WKBBBK",
], dict(W="#f0f0ea", w="#c4c4bc", O="#5b3a9a", S="#56b048", P="#5ab0e8", B="#7a4a2a", E="#1a1a1a"))
variant("piccolo_orange", "piccolo", S="#f0882a", E="#3a0a0a")

# ---- grunts ---------------------------------------------------------------
spr("rr_soldier", [
    "........",
    "........",
    "....KKKK",
    "...KOOOO",
    "..KOOOOR",
    "..KKKKKK",
    "...KSSSS",
    "...KEWSS",
    "....KSSS",
    "...KOOOO",
    "..KSOOOO",
    "..KSKOOO",
    "..KSKPPP",
    "...KOOOO",
    "...KOOK.",
    "...KBBK.",
], dict(O="#5d6f3c", R="#d42a2a", P="#2a2a2a", B="#3b2a1a", S=SKIN, E="#1a1a1a", W="#ffffff"))
variant("rr_soldier_b", "rr_soldier", O="#3c4f7a")

spr("demon", [
    "........",
    "........",
    "....KKKK",
    "...KSSSS",
    "..KSSSSS",
    ".KKSSSSS",
    "..KSEWSS",
    "...KSSSS",
    "....KKSS",
    "KAK.KOOO",
    "KAAKSOOO",
    ".KAKSOOO",
    "..KKSKPP",
    "...KOOOO",
    "...KSSK.",
    "...KKKK.",
], dict(S="#6fa83a", E="#ff3a3a", W="#ffffaa", A="#4a2f6a", O="#d8c8a0", P="#8a2a2a"))
variant("demon_b", "demon", S="#3a7aa8", E="#ffcc00")

spr("saibaman", [
    "........",
    "........",
    "....KKKK",
    "...KSSSS",
    "..KSsSSS",
    "..KSSSsS",
    ".KSsSSSS",
    ".KSSEESS",
    "..KSSSSS",
    "...KKSSS",
    "...KSsSS",
    "..KSKSSS",
    "..KSKsSS",
    "...KSSSS",
    "...KSSK.",
    "...KKKK.",
], dict(S="#7ac83a", s="#3e7a20", E="#200808"))
variant("saibaman_b", "saibaman", S="#d0c040", s="#7a6a20")

spr("frieza_soldier", [
    "........",
    "........",
    "....KKKK",
    "...KHHHH",
    "..KHHHHH",
    "..KHSSSS",
    "..KSEWSS",
    "...KSSSS",
    "....KSSS",
    ".KAAKAAA",
    "KAAKAAAA",
    ".KKOAAAA",
    "..KOGGGG",
    "...KOOOO",
    "...KOOK.",
    "...KAAK.",
], dict(H="#7a3a2a", S="#e8b080", A="#e8e4d8", O="#2a2a3a", G="#c8a038", E="#1a1a1a", W="#ffffff"))
variant("frieza_soldier_b", "frieza_soldier", S="#9a6ad0", H="#2a1a3a")
variant("frieza_force", "frieza_soldier", S="#7ab0d0", H="#1a3a5a", A="#c8c4d8", O="#4a2a6a")
variant("frieza_force_b", "frieza_soldier", S="#c86a6a", H="#3a1a1a", A="#d8d0c0", O="#2a4a3a")

spr("cell_jr", [
    "........",
    "..K....K",
    "..KGK.KG",
    "..KGGKGG",
    "..KGGGGG",
    "..KGSSSS",
    "..KSEWSS",
    "...KSSSS",
    "....KSPP",
    "...KOOOO",
    "..KOsOOO",
    "..KOKOsO",
    "..KOKOOO",
    "...KOOsO",
    "...KOOK.",
    "...KKKK.",
], dict(G="#2e7a3a", S="#d8e8f0", E="#a02a8a", W="#ffffff", P="#7a3a9a", O="#5aa848", s="#1e3e1e"))
variant("cell_jr_b", "cell_jr", O="#3a8aa8", s="#1a3a4a")

spr("majin", [
    "........",
    "........",
    "....KKKK",
    "...KSSSS",
    "..KSSSSS",
    "..KSSRSR",
    "..KSEWSS",
    "...KSSSS",
    "....KSSS",
    "...KOOOO",
    "..KSOOOO",
    "..KSKOOO",
    "..KSKPPP",
    "...KOOOO",
    "...KOOK.",
    "...KBBK.",
], dict(S="#f0b890", R="#c8202a", O="#3a3a8a", P="#e8c040", B="#2a2a2a", E="#1a1a1a", W="#ffffff"))
variant("majin_b", "majin", S="#c88a70", O="#6a2a2a")

spr("pride_trooper", [
    "........",
    "........",
    "....KKKK",
    "...KHHHH",
    "..KHHHHH",
    "..KHSSSS",
    "..KSEWSS",
    "...KSSSS",
    "....KSSS",
    "...KPPOO",
    "..KOPOOO",
    "..KAKOOO",
    "..KAKPPP",
    "...KOOOO",
    "...KPPK.",
    "...KPPK.",
], dict(O="#c82030", P="#1c1c24", A="#f0f0f0", H="#3a2a1a", S="#e8b080", E="#1a1a1a", W="#ffffff"))
variant("pride_trooper_b", "pride_trooper", S="#a8c8e0", H="#1a1a2a")

# ---- bosses ---------------------------------------------------------------
spr("tao", [
    "......KK",
    ".....KHH",
    "....KKKK",
    "...KHHHH",
    "..KHHHHH",
    "..KHSSSS",
    "..KSSSSS",
    "..KSEWSS",
    "...KHHSS",
    "..KOOOKS",
    ".KOOOOOO",
    ".KSKOAOA",
    ".KSKOOOO",
    "..KKPPPP",
    "...KPPPK",
    "...KBBBK",
], dict(H="#1a1a1a", S="#f0c8a0", O="#e04a9a", A="#ffffff", P="#3a2a4a", B="#1a1a1a", E="#1a1a1a", W="#ffffff"))

spr("king_piccolo", [
    "....K...",
    "....KS..",
    ".....KKK",
    "....KSSS",
    "...KSSSS",
    "..KSSsSS",
    ".KKSSSSS",
    "..KSEWSS",
    "...KSsSS",
    "..KAAKOO",
    ".KAAOOOO",
    "KAAKOOOO",
    "KAAKSOOO",
    "KAAKOOOO",
    ".KAKOOOK",
    "..KKBBBK",
], dict(S="#5aa040", s="#3a7020", E="#d02020", W="#ffffff", O="#e8e0d0", A="#6a3aa0", B="#7a4a2a"))

spr("nappa", [
    "........",
    "........",
    "....KKKK",
    "...KSSSS",
    "..KSSSSS",
    "..KSSSSS",
    "..KSEWSS",
    "..KSSSSS",
    "...KHHSS",
    "KAAAKAAA",
    "KAAKAAAA",
    "KSSKAAAA",
    "KSSKGGGG",
    ".KKKOOOO",
    "...KOOOK",
    "...KWWWK",
], dict(S="#f0c090", H="#1a1a1a", A="#5a3a22", G="#3a2a18", O="#1e1e30", W="#f0ece0", E="#1a1a1a"))

spr("frieza", [
    "........",
    "........",
    "....KKKK",
    "...KPPPP",
    "..KPPPPP",
    "..KSPPPP",
    "..KSSSSS",
    "..KSEWSS",
    "...KSSSS",
    "..KPKSSS",
    ".KSSKSSS",
    ".KSKSSSP",
    ".KSKSSSS",
    "..KKSSSS",
    "...KSSSK",
    "...KSSSK",
], dict(S="#eeecf4", P="#7a3ab0", E="#c01040", W="#ffffff"))
variant("frieza_gold", "frieza", S="#f4c430", P="#6a2aa0")

spr("cell", [
    "..K....K",
    "..KGK.KG",
    "..KGGKGG",
    "..KGGGGG",
    "..KGSSSS",
    "..KSEWSS",
    "...KSSSS",
    "...KSSPP",
    "KKK.KOOO",
    "KAAKOOOO",
    "KAAKOsOO",
    ".KAKOOOO",
    "..KKOOsO",
    "...KOOOO",
    "...KOOOK",
    "...KAAAK",
], dict(G="#2e7a3a", S="#e0ecf0", E="#c03a9a", W="#ffffff", P="#7a3a9a", O="#5aa848", s="#1e3e1e", A="#262a36"))

spr("kid_buu", [
    "......KK",
    "......KS",
    ".....KSS",
    "...KKSSS",
    "..KSSSSS",
    "..KSSSSS",
    "..KSEESS",
    "..KSSSSS",
    "...KSSKK",
    "...KSSSS",
    "..KSSSSS",
    ".KSKSSSS",
    ".KSKGGGG",
    "..KKWWWW",
    "..KWWWWK",
    "...KBBBK",
], dict(S="#f08ac0", E="#1a1a1a", G="#e8c040", W="#f4f0f0", B="#2a2a2a"))

spr("jiren", [
    "........",
    "....KKKK",
    "...KSSSS",
    "..KSSSSS",
    "..KSSSSS",
    "..KSSSSS",
    "..KSEESS",
    "..KSSSSS",
    "...KSSSS",
    ".KOOKPPP",
    "KOOOKPPP",
    "KAAKOPPP",
    ".KKKOOOO",
    "...KPPPP",
    "...KPPPK",
    "...KOOOK",
], dict(S="#c8b4bc", E="#101018", O="#c82030", P="#1a1a22", A="#f0f0f0"))

spr("broly", [
    "..K.K..K",
    ".KHKHKKH",
    "KHHHHHHH",
    "KHHHHHHH",
    "KHHHHHHH",
    ".KHSSHSS",
    "..KSSSSS",
    "..KSWWSS",
    "...KSSSS",
    "KSSSKSSS",
    "KSSKSSSS",
    "KSSKsSSS",
    "KKKKGGGG",
    "..KOOOOO",
    "..KOOOOK",
    "...KBBBK",
], dict(H="#a8e84a", S="#e8b080", s="#c08a60", W="#f0fff0", G="#5a7a3a", O="#2a2a3a", B="#2a2a3a"))

# ---- pickups (8x8) --------------------------------------------------------
ORB = ["...K", "..KC", ".KCL", "KCLW", "KCLL", ".KCL", "..KC", "...K"]
spr("orb_blue", ORB, dict(C="#2a7ae8", L="#7ad0ff", W="#ffffff"), w=8, rim=False)
spr("orb_green", ORB, dict(C="#2aa84a", L="#8ae87a", W="#ffffff"), w=8, rim=False)
spr("orb_red", ORB, dict(C="#c8282a", L="#ff8a6a", W="#ffffff"), w=8, rim=False)
spr("orb_gold", ORB, dict(C="#c89a1a", L="#ffe46a", W="#ffffff"), w=8, rim=False)

spr("dragonball", [
    "..KKKK..",
    ".KOOOOK.",
    "KOWOOOOK",
    "KOORROOK",
    "KOORROOK",
    "KOOOOOOK",
    ".KOOOOK.",
    "..KKKK..",
], dict(O="#ff9a1a", R="#d81a1a", W="#fff4c0"), w=8, rim=False)

spr("senzu", [
    "........",
    "...KKK..",
    "..KGLGK.",
    ".KGLGGK.",
    ".KGGGgK.",
    ".KGGggK.",
    "..KKgK..",
    "....K...",
], dict(G="#6ab83a", L="#c8f08a", g="#3a7a22"), w=8, rim=False)

spr("capsule", [
    "........",
    ".KKKKKK.",
    "KRRRKWWK",
    "KRWRKWWK",
    "KRRRKWWK",
    ".KKKKKK.",
    "........",
    "........",
], dict(R="#e85a2a", W="#f0f0f0"), w=8, rim=False)

# ---- props ----------------------------------------------------------------
ROCK = [
    "........", "........", "........", "........", "........", "........",
    ".....KKK", "....KLLL", "...KLLLL", "..KLLMLL", "..KLMMMM", ".KLMMMMM",
    ".KMMMMDD", "KMMMDDDD", "KKKKKKKK", "........",
]
ROCKS = {
    "plains": ("#b8a890", "#8a7a62", "#5a4c3c"),
    "waste": ("#d8b088", "#b08058", "#7a5438"),
    "namek": ("#a8c8b8", "#78a090", "#4a6a60"),
    "stone": ("#c8c8d0", "#9a9aa8", "#6a6a78"),
    "ice": ("#e8f6ff", "#a8d8f0", "#6aa0c8"),
    "pink": ("#d8a8b8", "#b07888", "#7a4a5a"),
}
for k, (l, m, d) in ROCKS.items():
    spr("rock_" + k, ROCK, dict(L=l, M=m, D=d), rim=False)

TREE = [
    ".....KKK", "....KLLL", "...KLLLL", "..KLLLML", ".KLLMMLL", ".KLMMMLM",
    "KLMMMMMM", "KMMMDMMM", "KMMDDMMD", ".KMDDDDD", "..KKKKKK", "......KT",
    "......KT", "......KT", ".....KTT", "....KKKK",
]
spr("tree_plains", TREE, dict(L="#7ad04a", M="#4a9a2a", D="#2a6a1a", T="#7a4a2a"), rim=False)
spr("tree_namek", TREE, dict(L="#8ae0d0", M="#4ab0a0", D="#2a7a70", T="#a87a3a"), rim=False)
spr("tree_dark", TREE, dict(L="#5aa860", M="#2e7a40", D="#1a4a2a", T="#5a3a2a"), rim=False)


# ---------------------------------------------------------------- tiles
def tile(name, colors, deco=(), stones=None, seed=1, size=32):
    rnd = random.Random(seed)
    cols = [(hex2rgba(c), wgt) for c, wgt in colors]
    total = sum(w for _, w in cols)

    def pick():
        r = rnd.random() * total
        for c, w in cols:
            r -= w
            if r <= 0:
                return c
        return cols[-1][0]

    px = [pick() for _ in range(size * size)]
    if stones:  # paved arena: mortar lines every `step`
        step, mortar, hi = stones
        m, hl = hex2rgba(mortar), hex2rgba(hi)
        for y in range(size):
            for x in range(size):
                off = (step // 2) if (y // step) % 2 else 0
                if y % step == 0 or (x + off) % step == 0:
                    px[y * size + x] = m
                elif y % step == 1 or (x + off) % step == 1:
                    px[y * size + x] = hl
    for kind, color, count in deco:
        c = hex2rgba(color)
        for _ in range(count):
            x, y = rnd.randrange(size), rnd.randrange(size)
            if kind == "tuft":  # little grass blade: a 'v'
                for dx, dy in ((0, 0), (1, -1), (2, 0)):
                    px[((y + dy) % size) * size + (x + dx) % size] = c
            elif kind == "dot":
                px[y * size + x] = c
            elif kind == "pebble":
                for dx, dy in ((0, 0), (1, 0)):
                    px[y * size + (x + dx) % size] = c
    return size, size, px


TILES = {
    "tile_plains": tile("plains", [("#5aa040", 6), ("#62aa46", 4), ("#4e9238", 3)],
                        [("tuft", "#7ac858", 10), ("tuft", "#3e7e2c", 8), ("dot", "#e8e070", 3)], seed=2),
    "tile_waste": tile("waste", [("#c89a68", 6), ("#bc8e5c", 4), ("#d2a472", 3)],
                       [("pebble", "#9a6e44", 10), ("dot", "#e2bc8a", 12)], seed=3),
    "tile_rocky": tile("rocky", [("#a88a6a", 6), ("#9c7e5e", 4), ("#b29474", 3)],
                       [("pebble", "#7a5e42", 14), ("dot", "#c8aa88", 10)], seed=4),
    "tile_namek": tile("namek", [("#58b098", 6), ("#62bca2", 4), ("#4aa08a", 3)],
                       [("tuft", "#8ae0c8", 10), ("tuft", "#3a8a76", 8), ("dot", "#c8f0ff", 3)], seed=5),
    "tile_cell": tile("cell", [("#b8b4a8", 5), ("#c2beb2", 4), ("#aeaa9e", 3)],
                      [("dot", "#8a867a", 14)], stones=(16, "#7a766c", "#d4d0c4"), seed=6),
    "tile_buu": tile("buu", [("#b48a7a", 6), ("#a87e6e", 4), ("#be9484", 3)],
                     [("pebble", "#7a5448", 12), ("dot", "#d0a898", 10)], seed=7),
    "tile_grass2": tile("grass2", [("#4a8e3c", 6), ("#549846", 4), ("#408432", 3)],
                        [("tuft", "#6ab854", 10), ("tuft", "#336e28", 8), ("dot", "#f0a0c0", 2)], seed=8),
    "tile_top": tile("top", [("#c8ccd8", 5), ("#d2d6e2", 4), ("#bcc0cc", 3)],
                     [("dot", "#a0a4b4", 10)], stones=(16, "#8a8ea0", "#e4e8f2"), seed=9),
    "tile_ice": tile("ice", [("#dcecf6", 6), ("#e6f4fc", 4), ("#cce0ee", 3)],
                     [("dot", "#ffffff", 16), ("pebble", "#a8c8e0", 8)], seed=10),
}


# ---------------------------------------------------------------- output
def main():
    sheet = []
    for name, (rows, pal, w, rim) in SPR.items():
        W, H, px = render(rows, pal, w, rim)
        write_png(os.path.join(OUT, name + ".png"), W, H, px)
        sheet.append((W, H, px))
    for name, (W, H, px) in TILES.items():
        write_png(os.path.join(OUT, name + ".png"), W, H, px)

    # contact sheet (4x, 10 per row) for previewing the art
    S, cell, per = 4, 20, 10
    rows = (len(sheet) + per - 1) // per
    SW, SH = per * cell * S, rows * cell * S
    bg = hex2rgba("#2a2e4a")
    out = [bg] * (SW * SH)
    for i, (w, h, px) in enumerate(sheet):
        ox = (i % per) * cell * S + (cell - w) // 2 * S
        oy = (i // per) * cell * S + (cell - h) // 2 * S
        for y in range(h):
            for x in range(w):
                c = px[y * w + x]
                if c[3] == 0:
                    continue
                for yy in range(S):
                    base = (oy + y * S + yy) * SW + ox + x * S
                    for xx in range(S):
                        out[base + xx] = c
    write_png(os.path.join(OUT, "_contact_sheet.png"), SW, SH, out)
    print("wrote %d sprites + %d tiles to %s" % (len(SPR), len(TILES), OUT))


if __name__ == "__main__":
    main()
