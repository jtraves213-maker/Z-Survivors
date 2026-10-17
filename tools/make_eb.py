"""Extreme Butoden (3DS) fighters and bosses, plus the art for cut-ins and intros.

For every sheet in ../src_art/eb_*.png (copied from the ripped sheets, see SHEETS) this writes:
  art/hd/<name>.png        8-frame strip (idle 0-3, move 0-3) facing right, like make_fighters.py
  art/cutin/<key>.webp     the sheet's 5-frame super-move portrait zoom, 200px frames side by side
  art/full/<key>.webp      the sheet's full-body promo art with the background removed

Run:  python tools/make_eb.py   (needs Pillow + numpy)
"""
import os, shutil, sys
from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eb_cells as E
import make_fighters as MF

ROOT = MF.ROOT
SRC = MF.SRC
RIPS = os.path.join(os.path.dirname(ROOT), "DB SurvivorZ")
EB = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - %s.png"
SCALE = 0.42   # same as Gohan, so every EB fighter shares one pixel size

# key: (sheet name, idle (row, frames), move (row, frames))
SHEETS = {
    # Goku: every form uses its sheet's 6-frame fighting stance, so the forms match each other
    "goku":      ("Goku", (4, [0, 1, 3, 4]), (4, [0, 2, 3, 5])),
    "goku_ssj":  ("Goku (Super Saiyan)", (5, [0, 1, 3, 4]), (5, [0, 2, 3, 5])),
    "goku_god":  ("Goku (Super Saiyan God)", (4, [0, 1, 3, 4]), (4, [0, 2, 3, 5])),
    "goku_blue": ("Goku (Super Saiyan Blue)", (4, [0, 1, 3, 4]), (4, [0, 2, 3, 5])),
    "gohan":     ("Young Adult Gohan", (3, [0, 1, 2, 3]), (4, [0, 1, 3, 4])),
    "gohan_ssj": ("Young Adult Gohan (Super Saiyan)", None, None),
    "piccolo":   ("Piccolo", (2, [0, 1, 2, 3]), (4, [0, 2, 3, 5])),
    "krillin":   ("Krillin", (3, [0, 1, 2, 3]), (4, [0, 2, 3, 5])),
    "a18":       ("Android 18", (2, [0, 1, 2, 3]), (4, [0, 2, 3, 5])),
    "trunks":    ("Future Trunks", (2, [0, 1, 2, 3]), (4, [0, 2, 3, 5])),
    "gotenks":   ("Gotenks", (3, [0, 1, 2, 3]), (2, [0, 2, 3, 5])),
    "bardock":   ("Bardock", (2, [0, 1, 2, 3]), (4, [0, 2, 3, 5])),
    "broly":     ("Broly", (3, [0, 2, 4, 6]), (4, [0, 1, 3, 4])),
    "beerus":    ("Beerus", (2, [0, 3, 5, 8]), (4, [0, 2, 4, 6])),
    "ginyu":     ("Captain Ginyu", (2, [0, 1, 2, 3]), (4, [0, 2, 3, 5])),
    "cell":      ("Cell", (2, [0, 1, 2, 3]), (4, [0, 3, 5, 8])),
    "frieza":    ("Frieza", None, None),
    "kid_buu":   ("Kid Buu", (2, [0, 1, 2, 3]), (4, [0, 2, 4, 6])),
    "raditz":    ("Raditz", (2, [0, 2, 3, 5]), (4, [0, 2, 3, 5])),
}
# Moving frames for playable fighters: the horizontal air-dash ("gliding") pose, (row, frame) on each sheet.
GLIDE = {"goku": (12, 1), "goku_ssj": (13, 1), "goku_god": (12, 1), "goku_blue": (12, 1), "gohan": (10, 1), "piccolo": (12, 1),
         "krillin": (12, 1), "a18": (22, 1), "trunks": (12, 1), "gotenks": (12, 1), "bardock": (12, 1)}
LAVENDER =((214, 190, 255), (164, 132, 226), (104, 78, 168))


SRC_NAME = {"gohan": "eb_gohan_base", "gohan_ssj": "eb_gohan"}   # eb_gohan.png predates this script (it's the SSJ sheet)


def sheet(key):
    dst = os.path.join(SRC, SRC_NAME.get(key, "eb_" + key) + ".png")
    if not os.path.exists(dst):
        shutil.copyfile(os.path.join(RIPS, EB % SHEETS[key][0]), dst)
    return Image.open(dst).convert("RGBA")


def frames(im, R, spec, clean=False):
    row, idx = spec
    cells = R[row]
    out = [E.sprite(im, cells[min(i, len(cells) - 1)]) for i in idx]
    out = [MF.tighten(MF.main_blob(f)) for f in out] if clean else out
    return [ImageOps.mirror(f) for f in out]   # EB fighters face left; strips face right


def portraits(key, im, R):
    os.makedirs(os.path.join(ROOT, "art", "cutin"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "art", "full"), exist_ok=True)
    top = R[0]
    S = 200
    strip = Image.new("RGB", (S * 5, S))
    for i, b in enumerate(top[1:6]):
        x, y, w, h = b
        strip.paste(im.crop((x, y, x + w, y + h)).convert("RGB").resize((S, S), Image.LANCZOS), (i * S, 0))
    strip.save(os.path.join(ROOT, "art", "cutin", key + ".webp"), quality=82, method=6)
    full = E.sprite(im, top[0])
    full = full.resize((round(full.width * 300 / full.height), 300), Image.LANCZOS) if full.height > 300 else full
    full.save(os.path.join(ROOT, "art", "full", key + ".webp"), quality=86, method=6)


def build():
    made = []
    save = lambda name, idle, move: (MF_save(name, idle, move), made.append(name))
    for key, (_, idle_spec, move_spec) in SHEETS.items():
        im = sheet(key)
        R = E.rows(E.cells(im))
        portraits(key, im, R)
        if not idle_spec:
            continue
        idle_full, move_full = frames(im, R, idle_spec, key == "gotenks"), frames(im, R, move_spec, key == "gotenks")
        if key in GLIDE:   # glide while moving: one air-dash frame held (the game adds a hover bob)
            row, i = GLIDE[key]
            move_full = frames(im, R, (row, [i] * 4), key == "gotenks")
        down = lambda fs: [MF.palette_downscale(f, SCALE) for f in fs]
        if key == "goku_ssj":   # SSJ2 and Ultra Instinct are repaints of the Super Saiyan frames
            for form, ramp in (("goku_ssj2", "ssj2"), ("goku_ui", "ui")):
                conv = lambda fs: down([MF.paint(f, MF.gohan_hair_mask(f), MF.RAMPS[ramp]) for f in fs])
                save(form, conv(idle_full), conv(move_full))
            # SSJ3: the long-haired frames of the sheet's Super Saiyan 3 power-up (row 34)
            s3 = down(frames(im, R, (34, [4, 5, 6])))
            save("goku_ssj3", [s3[0], s3[1], s3[0], s3[1]], [s3[0], s3[1], s3[2], s3[1]])
        if key == "trunks":     # EB draws him as a Super Saiyan; base form gets his lavender hair back
            conv = lambda fs: down([MF.paint(f, MF.gohan_hair_mask(f), LAVENDER) for f in fs])
            save("trunks", conv(idle_full), conv(move_full))
            save("trunks_ssj", down(idle_full), down(move_full))
            continue
        if key == "gotenks":    # likewise a Super Saiyan; base and a brighter SSJ3 are repaints
            for form, ramp in (("gotenks", "black"), ("gotenks_ssj3", "ssj2")):
                conv = lambda fs: down([MF.paint(f, MF.gohan_hair_mask(f), MF.RAMPS[ramp]) for f in fs])
                save(form, conv(idle_full), conv(move_full))
            save("gotenks_ssj", down(idle_full), down(move_full))
            continue
        name = {"cell": "cell_eb", "kid_buu": "kid_buu_eb", "broly": "broly_eb", "beerus": "beerus_eb", "raditz": "raditz_eb", "ginyu": "ginyu_eb"}.get(key, key)
        save(name, down(idle_full), down(move_full))
        if key == "piccolo":
            orange = ((255, 176, 72), (236, 120, 30), (150, 64, 16))
            i2, m2 = down(idle_full), down(move_full)
            save("piccolo_orange", [MF.recolor_hue(f, 90, 160, orange) for f in i2], [MF.recolor_hue(f, 90, 160, orange) for f in m2])
    return made


def MF_save(name, idle, move):
    cell = max(max(f.width for f in idle + move), max(f.height for f in idle + move))
    cell += cell % 2
    MF.strip(idle, move, cell).save(os.path.join(MF.OUT, name + ".png"))


if __name__ == "__main__":
    names = build()
    MF.preview(names)
    print("wrote", len(names), "strips:", " ".join(names))
