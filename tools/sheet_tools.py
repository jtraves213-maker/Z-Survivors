"""Helpers for pulling frames out of ripped sprite sheets."""
from collections import deque
from PIL import Image, ImageDraw


def strip_background(im, bg_colors, tol=0):
    """Make every pixel matching one of bg_colors transparent."""
    im = im.convert("RGBA")
    px = im.load()
    bgs = [tuple(c[:3]) for c in bg_colors]
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            for b in bgs:
                if abs(c[0] - b[0]) <= tol and abs(c[1] - b[1]) <= tol and abs(c[2] - b[2]) <= tol:
                    px[x, y] = (0, 0, 0, 0)
                    break
    return im


def components(im, min_pixels=150, merge_gap=3):
    """Bounding boxes of opaque blobs; boxes closer than merge_gap are merged (detached hair, fists)."""
    px = im.load()
    W, H = im.size
    seen = bytearray(W * H)
    boxes = []
    for y in range(H):
        for x in range(W):
            if seen[y * W + x] or px[x, y][3] == 0:
                continue
            q = deque([(x, y)])
            seen[y * W + x] = 1
            x0 = x1 = x
            y0 = y1 = y
            n = 0
            while q:
                cx, cy = q.popleft()
                n += 1
                x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and px[nx, ny][3]:
                            seen[ny * W + nx] = 1
                            q.append((nx, ny))
            boxes.append([x0, y0, x1, y1, n])
    # merge nearby boxes
    changed = True
    while changed:
        changed = False
        out = []
        for b in boxes:
            for o in out:
                if b[0] <= o[2] + merge_gap and o[0] <= b[2] + merge_gap and b[1] <= o[3] + merge_gap and o[1] <= b[3] + merge_gap:
                    o[0] = min(o[0], b[0]); o[1] = min(o[1], b[1]); o[2] = max(o[2], b[2]); o[3] = max(o[3], b[3]); o[4] += b[4]
                    changed = True
                    break
            else:
                out.append(list(b))
        boxes = out
    boxes = [b for b in boxes if b[4] >= min_pixels]
    # order in reading order: rows by vertical centre
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        if cur and (b[1] + b[3]) / 2 - (cur[0][1] + cur[0][3]) / 2 > (cur[0][3] - cur[0][1]) * 0.6:
            rows.append(cur); cur = []
        cur.append(b)
    if cur:
        rows.append(cur)
    ordered = []
    for r in rows:
        ordered += sorted(r, key=lambda b: b[0])
    return [(b[0], b[1], b[2] - b[0] + 1, b[3] - b[1] + 1) for b in ordered]


def labelled_preview(im, boxes, path, scale=1, crop_h=None):
    W, H = im.size
    pv = Image.new("RGBA", (W * scale, H * scale), (40, 44, 70, 255))
    pv.alpha_composite(im.resize((W * scale, H * scale), Image.NEAREST))
    d = ImageDraw.Draw(pv)
    for i, (x, y, w, h) in enumerate(boxes):
        d.rectangle([x * scale, y * scale, (x + w) * scale, (y + h) * scale], outline=(255, 60, 60, 255))
        d.text((x * scale + 2, y * scale + 1), str(i), fill=(255, 255, 0, 255))
    if crop_h:
        pv = pv.crop((0, 0, pv.width, min(pv.height, crop_h * scale)))
    pv.save(path)


def flood_strip(im, bg_colors, tol=8):
    """Clear only the background that is connected to the sheet border (keeps whites inside sprites)."""
    im = im.convert("RGBA")
    px = im.load()
    W, H = im.size
    bgs = [tuple(c[:3]) for c in bg_colors]
    def isbg(c):
        return any(abs(c[0] - b[0]) <= tol and abs(c[1] - b[1]) <= tol and abs(c[2] - b[2]) <= tol for b in bgs)
    seen = bytearray(W * H)
    q = deque()
    for x in range(W):
        q.append((x, 0)); q.append((x, H - 1))
    for y in range(H):
        q.append((0, y)); q.append((W - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= W or y >= H or seen[y * W + x]:
            continue
        seen[y * W + x] = 1
        if not isbg(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im
