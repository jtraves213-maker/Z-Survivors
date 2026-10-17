"""The big Capsule Corp loot capsule that sits around the map (art/loot_capsule.png).

Run:  python tools/make_loot.py   (needs Pillow; reuses the Canvas from make_world_art.py)
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_world_art as MW

hx, mix = MW.hx, MW.mix


def loot_capsule():
    """Capsule lying on its side: white shell, yellow cap, Capsule Corp band and a red release button."""
    W, H = 26, 15
    c = MW.Canvas(W, H)
    white, shade, low = hx("#f6f4ee"), hx("#cfcfd8"), hx("#9a9aac")
    gold, gdark = hx("#f2c43a"), hx("#b8861a")
    band, blue = hx("#3a3446"), hx("#3a6ad8")
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            # rounded ends
            r = min(x - 1, W - 2 - x)
            if r < 2 and (y < 1 + (2 - r) or y > H - 2 - (2 - r)):
                continue
            t = (y - 1) / (H - 3)
            if x < 8:
                col = gold if t < 0.62 else gdark
            elif x in (8, 9):
                col = band
            else:
                col = white if t < 0.5 else shade if t < 0.8 else low
            c.set(x, y, col)
    # highlight along the top
    for x in range(4, W - 4):
        if x not in (8, 9):
            c.set(x, 2, mix(c.get(x, 2), (255, 255, 255), 0.6))
    # Capsule Corp mark: a blue ring with a C inside
    cx, cy = 16, 7
    for (dx, dy) in [(-2, -1), (-2, 0), (-2, 1), (-1, -2), (0, -2), (1, -2), (-1, 2), (0, 2), (1, 2), (2, -1), (2, 1)]:
        c.set(cx + dx, cy + dy, blue)
    for (dx, dy) in [(0, -1), (-1, 0), (0, 1)]:
        c.set(cx + dx, cy + dy, blue)
    # release button on the cap
    c.set(4, 5, hx("#e8403a")); c.set(5, 5, hx("#e8403a")); c.set(4, 6, hx("#a82020")); c.set(5, 6, hx("#a82020"))
    c.outline()
    return c


if __name__ == "__main__":
    loot_capsule().save("loot_capsule")
    print("wrote art/loot_capsule.png")
