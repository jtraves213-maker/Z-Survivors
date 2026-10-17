"""Attack effects from the Dragon Ball Z: Supersonic Warriors effects sheet (ripped by Apocalypse).

Source: ../src_art/ssw_effects.png (copied from da62v7a-....png). The sheet is a white grid of cells, each on a
flat green, black, blue or magenta background. Cells are cut out, their background flood-cleared from the edges,
and written to ../art/fx/:
  <name>.png                 horizontal strips of square frames (sparks, orbs, comets, discs, spheres, ghosts, booms)
  beam_<f>_{start,body0,body1,end}.png, drill_<f>_...   beam pieces cropped tight, one per colour family f
Colour families: y (yellow/orange), g (green/teal), b (blue), p (pink/purple).
Run:  python tools/make_fx.py   (needs Pillow + numpy)
"""
import colorsys, os, shutil, sys
from collections import deque
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eb_cells as E

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src_art", "ssw_effects.png")
RIP = os.path.join(os.path.dirname(ROOT), "DB SurvivorZ", "da62v7a-e429ad2f-3f0d-45a3-b923-35ba99396ce2.png")
OUT = os.path.join(ROOT, "art", "fx")


def load_cells():
    if not os.path.exists(SRC):
        shutil.copyfile(RIP, SRC)
    im = Image.open(SRC).convert("RGBA")
    # reading order: row bands, then x. (The Destructo Disc wind-up rows beside the credits box come out as
    # double-height cells 106-113; nothing below uses them.)
    rows = E.rows(E.cells(im, sep=(255, 255, 255), tol=0))
    return im, [tuple(int(v) for v in b) for r in rows for b in r]


def clear(cell):
    """Flood the cell's background colour away from its border."""
    a = np.asarray(cell).copy()
    H, W = a.shape[:2]
    bg = tuple(a[0, 0, :3])
    same = (a[:, :, 0] == bg[0]) & (a[:, :, 1] == bg[1]) & (a[:, :, 2] == bg[2])
    seen = np.zeros((H, W), bool)
    q = deque([(0, x) for x in range(W)] + [(H - 1, x) for x in range(W)] + [(y, 0) for y in range(H)] + [(y, W - 1) for y in range(H)])
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= H or x >= W or seen[y, x] or not same[y, x]:
            continue
        seen[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    a[seen, 3] = 0
    if bg != (0, 0, 0):   # chroma backgrounds never appear in the art, so enclosed pockets (ring holes) go too
        a[same, 3] = 0
    return Image.fromarray(a)


def hue_to(im, hue, sat_mul=1.0):
    """Repaint every coloured pixel onto another hue; whites stay white (the hot core)."""
    a = np.asarray(im).astype(np.float32) / 255
    out = a.copy()
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            r, g, b, al = a[y, x]
            if al == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            if s < 0.12:
                continue
            out[y, x, :3] = colorsys.hsv_to_rgb(hue, min(1, s * sat_mul), v)
    return Image.fromarray((out * 255).astype(np.uint8))


FAM_HUE = {"y": None, "g": 0.45, "b": 0.56, "p": 0.85}


def main():
    im, cells = load_cells()
    os.makedirs(OUT, exist_ok=True)
    get = lambda i: clear(im.crop((cells[i][0], cells[i][1], cells[i][0] + cells[i][2], cells[i][1] + cells[i][3])))

    def strip(name, idx, size=None):
        fr = [get(i) for i in idx]
        S = size or max(max(f.width, f.height) for f in fr)
        sheet = Image.new("RGBA", (S * len(fr), S), (0, 0, 0, 0))
        for k, f in enumerate(fr):
            sheet.alpha_composite(f, (k * S + (S - f.width) // 2, (S - f.height) // 2))
        sheet.save(os.path.join(OUT, name + ".png"))

    def tight(img):
        bb = img.getbbox()
        return img.crop(bb) if bb else img

    # small things, one per colour family (rows 0-3 of the sheet)
    for fam, base in (("y", 0), ("g", 20), ("b", 40), ("p", 58)):
        strip("spark_" + fam, [base, base + 1, base + 2, base + 3])
        strip("orb_" + fam, [base + 5, base + 7])
        strip("comet_" + fam, [base + 8])
    # beams: start burst, two body frames, end burst (yellow original, hue-shifted for the others)
    beam = {"start": get(86), "body0": get(88), "body1": get(89), "end": get(94)}
    drill = {"start": get(96), "body0": get(98), "body1": get(99), "end": get(104)}
    for fam, hue in FAM_HUE.items():
        for part, img in beam.items():
            t = tight(img if hue is None else hue_to(img, hue))
            t.save(os.path.join(OUT, "beam_%s_%s.png" % (fam, part)))
        for part, img in drill.items():   # the drill is teal on the sheet
            t = tight(img if fam == "g" else hue_to(img, hue if hue is not None else 0.14, 1.2))
            t.save(os.path.join(OUT, "drill_%s_%s.png" % (fam, part)))
    strip("disc", [117, 118, 119, 118])
    strip("sphere_y", [121, 122, 123, 124])
    strip("sphere_p", [125, 126, 127, 128])
    strip("sphere_g", [129, 130])
    strip("sphere_b", [132, 133, 134, 135])
    strip("sphere_dark", [161, 162, 163, 164, 165, 166, 167])
    strip("ghost", [178, 179, 180, 181, 182])
    strip("boom_s", [187, 188, 189, 190, 191, 192])
    strip("boom", [201, 202, 203, 204, 205, 206])
    print("wrote effects to art/fx")


if __name__ == "__main__":
    main()
