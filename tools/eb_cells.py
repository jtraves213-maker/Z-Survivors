"""Cell finder for Extreme Butoden (3DS) sheets.

Those sheets lay every frame in its own box on a teal (0,128,128) grid. A box is green (0,255,80) behind
sprites, or black behind the portrait art in the first row. cells() returns the boxes in reading order,
each as (x, y, w, h); sprite() cuts one out with the green made transparent.
"""
import numpy as np
from PIL import Image

TEAL = (0, 128, 128)
GREEN = (0, 255, 80)


def _runs(flags):
    out, start = [], None
    for i, f in enumerate(flags):
        if f and start is None:
            start = i
        elif not f and start is not None:
            out.append((start, i)); start = None
    if start is not None:
        out.append((start, len(flags)))
    return out


def cells(im, sep=TEAL, tol=6):
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    content = np.abs(a - np.array(sep)).sum(axis=2) > tol
    boxes = []
    for y0, y1 in _runs(content.any(axis=1)):
        band = content[y0:y1]
        for x0, x1 in _runs(band.any(axis=0)):
            sub = band[:, x0:x1].any(axis=1)
            ys = np.nonzero(sub)[0]
            boxes.append((x0, y0 + ys[0], x1 - x0, ys[-1] - ys[0] + 1))
    return boxes


def sprite(im, box, bg=GREEN, tol=24):
    """The box's art with its flat background removed, cropped to the art."""
    x, y, w, h = box
    c = im.convert("RGBA").crop((x, y, x + w, y + h))
    a = np.asarray(c).copy()
    d = np.abs(a[:, :, :3].astype(np.int16) - np.array(bg)).sum(axis=2)
    a[d <= tol, 3] = 0
    out = Image.fromarray(a)
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def blobs(im, bgs, tol=10, block=3, min_px=60):
    """Boxes (x, y, w, h) of the sprites on a sheet with flat background colour(s), for sheets without a grid.
    Works on a coarse grid of block x block pixels, so pieces closer than ~block pixels join up."""
    from collections import deque
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    fg = np.ones(a.shape[:2], bool)
    for bg in bgs:
        fg &= np.abs(a - np.array(bg)).sum(axis=2) > tol
    H, W = fg.shape
    gh, gw = (H + block - 1) // block, (W + block - 1) // block
    pad = np.zeros((gh * block, gw * block), bool); pad[:H, :W] = fg
    g = pad.reshape(gh, block, gw, block).any(axis=(1, 3))
    seen = np.zeros_like(g)
    out = []
    for sy, sx in zip(*np.nonzero(g)):
        if seen[sy, sx]:
            continue
        q = deque([(sy, sx)]); seen[sy, sx] = True
        y0 = y1 = sy; x0 = x1 = sx
        while q:
            y, x = q.popleft()
            y0, y1, x0, x1 = min(y0, y), max(y1, y), min(x0, x), max(x1, x)
            for ny in (y - 1, y, y + 1):
                for nx in (x - 1, x, x + 1):
                    if 0 <= ny < gh and 0 <= nx < gw and g[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
        X0, Y0, X1, Y1 = x0 * block, y0 * block, min(W, (x1 + 1) * block), min(H, (y1 + 1) * block)
        sub = fg[Y0:Y1, X0:X1]
        if sub.sum() < min_px:
            continue
        ys, xs = np.nonzero(sub)
        out.append((int(X0 + xs.min()), int(Y0 + ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)))
    out.sort(key=lambda b: (b[1] // 40, b[0]))
    return out


def cut(im, box, bgs, tol=10):
    """A blob's pixels with the background colour(s) made transparent."""
    x, y, w, h = box
    c = np.asarray(im.convert("RGBA").crop((x, y, x + w, y + h))).copy()
    for bg in bgs:
        c[np.abs(c[:, :, :3].astype(np.int16) - np.array(bg)).sum(axis=2) <= tol, 3] = 0
    return Image.fromarray(c)


def rows(boxes):
    """Group boxes that share a band (same top edge region) for quick inspection."""
    out, cur = [], []
    for b in boxes:
        if cur and b[1] > cur[0][1] + cur[0][3] // 2:
            out.append(cur); cur = []
        cur.append(b)
    if cur:
        out.append(cur)
    return out
