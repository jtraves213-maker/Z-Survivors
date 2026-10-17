"""Builds the gacha fighters, new bosses and enemies, manga cut-ins, Shenron and the ticket icon.

Sources are the cleaned sheets in ../src_art/ (backgrounds removed, frame boxes in *_frames.json).
Strips follow the fighter layout used by the game: 8 square frames, idle0-3 then move0-3, facing right.
Run:  python tools/make_extra.py   (needs Pillow)
"""
import colorsys, json, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_fighters as MF   # strip(), palette_downscale(), tighten(), main_blob()

ROOT = MF.ROOT
SRC = os.path.join(ROOT, "src_art")
HD = os.path.join(ROOT, "art", "hd")
KOMAS = os.path.join(ROOT, "art", "komas")
os.makedirs(KOMAS, exist_ok=True)

LSW = json.load(open(os.path.join(SRC, "lsw_frames.json")))
MORE = json.load(open(os.path.join(SRC, "more_frames.json")))
LSSJ = json.load(open(os.path.join(SRC, "lssj_frames.json")))
KOMA = json.load(open(os.path.join(SRC, "komas_frames.json")))


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGBA")


def cut(im, box):
    x, y, w, h = box[:4]
    return MF.tighten(im.crop((x, y, x + w, y + h)))


def save(name, idle, move):
    cell = max(max(f.width for f in idle + move), max(f.height for f in idle + move))
    cell += cell % 2
    MF.strip(idle, move, cell).save(os.path.join(HD, name + ".png"))
    return name


def bobbed(f):
    """Same pose, upper body one pixel lower: a breathing frame for single-pose sprites."""
    out = Image.new("RGBA", (f.width, f.height), (0, 0, 0, 0))
    split = int(f.height * 0.72)
    out.alpha_composite(f.crop((0, split, f.width, f.height)), (0, split))
    out.alpha_composite(f.crop((0, 0, f.width, split)), (0, 1))
    return out


def single(im, box):
    f = cut(im, box)
    b = bobbed(f)
    return [f, f, b, b], [b, f, b, f]


def recolor(im, fn):
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[3]:
                n = fn(c)
                if n:
                    px[x, y] = n
    return im


def hue_shift(lo, hi, to_h, sat=None, val=1.0):
    def fn(c):
        h, s, v = colorsys.rgb_to_hsv(*(q / 255 for q in c[:3]))
        hd = h * 360
        inside = lo <= hd <= hi if lo <= hi else (hd >= lo or hd <= hi)
        if not inside or s < 0.18:
            return None
        r, g, b = colorsys.hsv_to_rgb(to_h / 360, s if sat is None else s * sat, min(1, v * val))
        return (round(r * 255), round(g * 255), round(b * 255), 255)
    return fn


def build():
    made = []
    # ---- gacha SSRs: Dragon Ball Super Goku and Vegeta (Ultimate LSW customs)
    g = load("c_goku_clean.png")
    gb = LSW["c_goku"]
    goku_forms = {"base": ([0, 1, 0, 1], [2, 3, 2, 3]), "ssj": ([75, 76, 77, 76], None), "god": ([102, 107, 108, 107], None),
                  "blue": ([141, 142, 143, 142], None), "ui": ([162, 164, 162, 164], None)}
    for form, (idle, move) in goku_forms.items():
        fi = [cut(g, gb[i]) for i in idle]
        fm = [cut(g, gb[i]) for i in move] if move else [bobbed(f) for f in fi]
        made.append(save("sgoku_" + form, fi, fm))
    v = load("c_super_vegeta_clean.png")
    vb = LSW["c_super_vegeta"]
    veg_forms = {"base": ([6, 13, 6, 13], [2, 2, 1, 1]), "ssj": ([71, 72, 73, 72], None), "ssj2": ([82, 83, 84, 83], None),
                 "blue": ([111, 112, 114, 112], None), "evo": ([124, 130, 124, 130], None)}
    for form, (idle, move) in veg_forms.items():
        fi = [cut(v, vb[i]) for i in idle]
        fm = [cut(v, vb[i]) for i in move] if move else [bobbed(f) for f in fi]
        made.append(save("svegeta_" + form, fi, fm))

    # ---- gacha heroes from the Legend of the Super Saiya-Jin customs (one pose each)
    l = load("c_lssj_clean.png")
    # (Krillin, Android 18, Trunks and Gotenks now come from Extreme Butoden in make_eb.py)
    for name, idx in {"yamcha": 44, "tien": 46, "goten": 72, "goten_ssj": 69}.items():
        made.append(save(name, *single(l, LSSJ[idx])))

    # ---- Nail and the Namekian warriors (overworld walk frames)
    n = load("hgd_namek_clean.png")
    nb = MORE["hgd_namek"]
    walk = lambda a, b, c: ([cut(n, nb[i]) for i in (a, b, a, c)], [cut(n, nb[i]) for i in (b, a, c, a)])
    made.append(save("nail", *walk(20, 21, 22)))
    made.append(save("namekian", *walk(23, 24, 25)))
    ni, nm = walk(23, 24, 25)
    darker = lambda c: (int(c[0] * 0.7), int(c[1] * 0.7), int(c[2] * 0.85), 255)
    made.append(save("namekian_b", [recolor(f, darker) for f in ni], [recolor(f, darker) for f in nm]))

    # ---- Saibamen (Attack of the Saiyans): idle 0-2; the dark palette for the second type
    s = load("aos_saibaman_clean.png")
    sb = MORE["aos_saibaman"]
    si = [cut(s, sb[i]) for i in (0, 1, 2, 1)]
    sm = [bobbed(f) for f in si]
    made.append(save("saiba", si, sm))
    dark = lambda c: (int(c[0] * 0.45), int(c[1] * 0.55), int(c[2] * 0.45), 255)
    made.append(save("saiba_dark", [recolor(f, dark) for f in si], [recolor(f, dark) for f in sm]))

    # ---- Buu saga grunts: Super Buu (JUS) in four colours
    b = load("jus_buu_clean.png")
    bb = MORE["jus_buu"]
    bi = [cut(b, bb[i]) for i in (0, 1, 2, 3)]
    bm = [cut(b, bb[i]) for i in (4, 5, 6, 7)]
    made.append(save("buu_pink", bi, bm))
    for nm_, to_h, sat, val in (("buu_grey", 300, 0.15, 0.85), ("buu_purple", 275, 1.0, 0.9), ("buu_green", 120, 0.9, 0.85)):
        fn = hue_shift(290, 15, to_h, sat, val)
        made.append(save(nm_, [recolor(f, fn) for f in bi], [recolor(f, fn) for f in bm]))

    # ---- bosses
    e = load("eb_frieza_clean.png")
    eb = MORE["eb_frieza"]
    flip = lambda f: f.transpose(Image.FLIP_LEFT_RIGHT)   # EB faces left; strips face right
    made.append(save("frieza_eb", [flip(MF.palette_downscale(cut(e, eb[i]), 0.42)) for i in (9, 11, 13, 15)],
                     [flip(MF.palette_downscale(cut(e, eb[i]), 0.42)) for i in (23, 25, 27, 29)]))
    for src, nm_, idle, move in (("c_golden_frieza", "frieza_golden", (0, 1, 0, 1), (1, 3, 1, 3)),
                                 ("c_black", "black", (0, 1, 2, 3), (5, 6, 7, 6)),
                                 ("c_black_rose", "rose", (0, 1, 2, 3), (4, 5, 6, 5))):
        im = load(src + "_clean.png")
        fb = MORE[src]
        made.append(save(nm_, [cut(im, fb[i]) for i in idle], [cut(im, fb[i]) for i in move]))
    for nm_, idx in (("cell_perfect", 57), ("kid_buu_l", 81), ("cooler_l", 50)):
        made.append(save(nm_, *single(l, LSSJ[idx])))
    return made


def komas():
    top = load("jss_komas_top.png")
    px = top.load()
    for y in range(top.height):
        for x in range(top.width):
            c = px[x, y]
            if c[3] and c[1] > 220 and c[0] < 40 and c[2] < 40:   # chroma-green cut-outs
                px[x, y] = (246, 244, 236, 255)   # manga-paper white
    out = []
    for i in (3, 4, 5, 9, 10, 11, 19, 20, 21):
        x, y, w, h = KOMA[i][:4]
        top.crop((x, y, x + w, y + h)).save(os.path.join(KOMAS, "k%d.png" % i))
        out.append(i)
    return out


def shenron():
    im = load("ssw2_shenron.png")
    head = im.crop((0, 0, 386, 386))
    px = head.load()
    for y in range(head.height):
        for x in range(head.width):
            c = px[x, y]
            if c[1] > 220 and c[0] < 40 and c[2] < 40:
                px[x, y] = (0, 0, 0, 0)
    head.save(os.path.join(ROOT, "art", "shenron.png"))


def ticket():
    W, H = 14, 9
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = im.load()
    gold, dark, light, K = (242, 196, 58, 255), (176, 122, 26, 255), (255, 240, 160, 255), (26, 16, 32, 255)
    for y in range(H):
        for x in range(W):
            edge = x in (0, W - 1) or y in (0, H - 1)
            notch = x in (0, W - 1) and y == H // 2
            if notch:
                continue
            px[x, y] = K if edge else (light if y == 1 else dark if y == H - 2 else gold)
    for (x, y) in ((6, 3), (7, 3), (5, 4), (6, 4), (7, 4), (8, 4), (6, 5), (7, 5)):
        px[x, y] = (216, 40, 40, 255)
    for y in range(2, H - 2):
        px[3, y] = dark
    im.save(os.path.join(ROOT, "art", "ticket.png"))


if __name__ == "__main__":
    names = build()
    k = komas()
    shenron()
    ticket()
    rows = [Image.open(os.path.join(HD, n + ".png")) for n in names]
    W = max(r.width for r in rows) * 2 + 10
    pv = Image.new("RGBA", (W, sum(r.height * 2 + 4 for r in rows)), (58, 104, 50, 255))
    yy = 0
    for r in rows:
        pv.alpha_composite(r.resize((r.width * 2, r.height * 2), Image.NEAREST), (4, yy)); yy += r.height * 2 + 4
    pv.save(os.path.join(HD, "_extra_preview.png"))
    print("wrote", len(names), "strips,", len(k), "komas, shenron, ticket")
