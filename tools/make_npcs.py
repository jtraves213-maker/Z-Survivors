"""Sprites from the non-Extreme Butoden rips: SSJ3 Goku, Nappa, Janemba and the saga grunts.

Sources are copied into ../src_art/ (see SRC_FILES). Frames are found as blobs on each sheet's flat
background, then written as 8-frame strips (idle 0-3, move 0-3, facing right) into ../art/hd/.
Run:  python tools/make_npcs.py   (needs Pillow + numpy)
"""
import os, shutil, sys
from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eb_cells as E
import make_fighters as MF

RIPS = os.path.join(os.path.dirname(MF.ROOT), "DB SurvivorZ")
SRC_FILES = {
    "saturn_ssj3": ("Saturn - Dragon Ball Z_ The Legend - Fighters - Goku (Super Saiyan 3).png", [(89, 86, 82), (0, 132, 132)], 3),
    "saturn_nappa": ("Saturn - Dragon Ball Z_ The Legend - Fighters - Nappa.png", [(89, 86, 82), (0, 132, 132)], 3),
    "gba_janemba": ("Game Boy Advance - Dragon Ball Z_ Buu's Fury - Enemies & Bosses - Super Janemba.png", [(42, 150, 108), (52, 188, 136), (71, 255, 187)], 2),
    "ssw2_celljr": ("DS _ DSi - Dragon Ball Z_ Supersonic Warriors 2 - Support Characters - Cell Jr..png", [(0, 248, 0), (88, 88, 160)], 2),
    "rpg_redribbon": ("Mobile - Dragon Ball RPG_ Shonen-hen - Nonplayable Characters - Red Ribbon Army.png", [(0, 0, 0)], 4),
    "rpg_tao": ("Mobile - Dragon Ball RPG_ Shonen-hen - Enemies & Bosses - Mercenary Tao.png", None, 3),   # None: real transparency
    "hgd_soldiers": ("DS _ DSi - Dragon Ball Z_ Harukanaru Goku Densetsu - Enemies - Appule, Cui & Frieza Soldiers.png", [(123, 198, 255)], 2),
}
# out name: (source, idle blob indices, move blob indices, scale, flip)
STRIPS = {
    "nappa_l":        ("saturn_nappa", [7, 8, 17, 18], [27, 28, 17, 28], 1.0, False),
    "janemba_l":      ("gba_janemba", [12, 13, 14, 15], [16, 17, 18, 17], 1.0, False),
    "cell_jr":        ("ssw2_celljr", [0, 1, 0, 1], [2, 3, 4, 5], 1.0, False),
    "rr_yellow":      ("rpg_redribbon", [69, 70, 69, 70], [69, 70, 69, 70], 0.4, False),
    "rr_bazooka":     ("rpg_redribbon", [71, 71, 71, 71], [71, 71, 71, 71], 0.4, False),
    "rr_silver":      ("rpg_redribbon", [66, 67, 66, 67], [66, 67, 68, 67], 0.4, False),
    "rr_murasaki":    ("rpg_redribbon", [75, 76, 75, 76], [75, 76, 75, 76], 0.4, False),
    "rr_metallitron": ("rpg_redribbon", [58, 59, 58, 59], [83, 84, 83, 84], 0.28, False),
    "tao_rpg":        ("rpg_tao", [0, 2, 0, 2], [1, 0, 1, 2], 0.42, False),
    "fz_soldier":     ("hgd_soldiers", [36, 37, 36, 37], [42, 43, 44, 43], 1.0, False),
    "fz_cui":         ("hgd_soldiers", [54, 55, 54, 55], [57, 58, 59, 58], 1.0, True),
    "fz_appule":      ("hgd_soldiers", [69, 70, 69, 70], [76, 77, 78, 77], 1.0, False),
    "fz_orlen":       ("hgd_soldiers", [23, 24, 23, 24], [27, 28, 29, 28], 1.0, False),
}


def load(key):
    fname, bgs, block = SRC_FILES[key]
    dst = os.path.join(MF.SRC, key + ".png")
    if not os.path.exists(dst):
        shutil.copyfile(os.path.join(RIPS, fname), dst)
    im = Image.open(dst).convert("RGBA")
    if bgs is None:   # transparent sheet: find blobs on the alpha channel
        mask = Image.new("RGB", im.size, (0, 0, 0))
        mask.paste((255, 255, 255), (0, 0), im.split()[3].point(lambda a: 255 if a else 0))
        return im, bgs, E.blobs(mask, [(0, 0, 0)], block=block, min_px=40)
    return im, bgs, E.blobs(im, bgs, block=block)


def build():
    cache, made = {}, []
    for name, (src, idle_i, move_i, scale, flip) in STRIPS.items():
        if src not in cache:
            cache[src] = load(src)
        im, bgs, bl = cache[src]
        def get(i):
            x, y, w, h = bl[i]   # the RPG sheet already has real transparency (and black outlines we must keep)
            raw = im.crop((x, y, x + w, y + h)) if src in ("rpg_redribbon", "rpg_tao") else E.cut(im, bl[i], bgs)
            f = MF.tighten(MF.main_blob(raw))
            if flip:
                f = ImageOps.mirror(f)
            return MF.palette_downscale(f, scale) if scale != 1.0 else f
        idle, move = [get(i) for i in idle_i], [get(i) for i in move_i]
        cell = max(max(f.width for f in idle + move), max(f.height for f in idle + move))
        cell += cell % 2
        MF.strip(idle, move, cell).save(os.path.join(MF.OUT, name + ".png"))
        made.append(name)
    return made


def tao_portrait():
    """Tao's RPG portrait (blob 3 on his sheet), used as the art for his boss intro."""
    im, _, bl = load("rpg_tao")
    x, y, w, h = bl[3]
    os.makedirs(os.path.join(MF.ROOT, "art", "full"), exist_ok=True)
    im.crop((x, y, x + w, y + h)).resize((w * 2, h * 2), Image.NEAREST).save(os.path.join(MF.ROOT, "art", "full", "tao.webp"), quality=88)


def lr_panels():
    """Manga panels from the Jump Ultimate Stars Dragon Ball intro, in LR-summon order (the last one is the logo)."""
    src = os.path.join(MF.SRC, "jus_intro.png")
    if not os.path.exists(src):
        shutil.copyfile(os.path.join(RIPS, "DS _ DSi - Jump Ultimate Stars - Cutscenes - Dragon Ball Intro (1).png"), src)
    im = Image.open(src).convert("RGB")
    boxes = [(5, 197, 180, 183), (100, 392, 156, 184), (90, 580, 166, 126), (0, 711, 184, 184), (0, 1349, 184, 184),
             (85, 1538, 166, 118), (104, 1022, 152, 192), (1, 5, 255, 187), (5, 1716, 246, 80)]
    out = os.path.join(MF.ROOT, "art", "lr")
    os.makedirs(out, exist_ok=True)
    for i, (x, y, w, h) in enumerate(boxes):
        im.crop((x, y, x + w, y + h)).resize((w * 2, h * 2), Image.NEAREST).save(os.path.join(out, "p%d.webp" % i), quality=88)


def ssj_clip():
    """Goku's first Super Saiyan (anime GIF) as an animated WebP, cropped above the watermark."""
    g = Image.open(os.path.join(RIPS, "rVT-1r.gif"))
    frames, durs = [], []
    for i in range(g.n_frames):
        g.seek(i); frames.append(g.convert("RGB").crop((0, 0, 320, 386))); durs.append(g.info.get("duration", 70))
    os.makedirs(os.path.join(MF.ROOT, "art", "fx"), exist_ok=True)
    frames[0].save(os.path.join(MF.ROOT, "art", "fx", "goku_ssj.webp"), save_all=True, append_images=frames[1:], duration=durs, loop=1, quality=72, method=5)


if __name__ == "__main__":
    lr_panels()
    tao_portrait()
    if os.path.exists(os.path.join(RIPS, "rVT-1r.gif")):
        ssj_clip()
    names = build()
    MF.preview(names)
    print("wrote", len(names), "strips:", " ".join(names))
