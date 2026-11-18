#!/usr/bin/env python3
"""
Make the first aid club name badges and designation tags as 3D-print files.

    python3 first-aid-badges/tools/make_badges.py

Every piece is two parts stacked on top of each other:

    base  - the flat white plate, 0 to 2 mm
    top   - the raised green details, 2 to 3 mm

so it prints in two colours with a single filament change: the AMS lite can do
it automatically, or without an AMS you pause at 2 mm and swap the filament.

Writes, next to this tools/ folder:

    print/first-aid-badges-plate.3mf    everything on one 180 x 180 mm plate
    print/<piece>.3mf                   one piece per file, for printing extras
    print/stl/<piece>.stl               each piece as one plain STL file, for
                                        printing in one colour or with a
                                        filament change at 2 mm
    print/first-aid-badges-files.zip    all of the above in one download
    pieces.json                         what the preview page loads

Needs Python 3 with numpy, and HarfBuzz (libharfbuzz) for the lettering. The
font, Inter ExtraBold, is in tools/fonts/ so nothing is downloaded.
"""
import ctypes as C
import ctypes.util
import json
import math
import os
import struct
import sys
import zipfile
from xml.sax.saxutils import escape

# ---------------------------------------------------------------------------
# What to make
# ---------------------------------------------------------------------------

NAMES = ["Annie", "Zoe", "Greta", "Louisa"]
SUBTITLE = "FIRST AID"          # small line under each name; "" for none
TAGS = [
    # word, style: "solid" = green bar with white lettering cut into it,
    #              "outline" = white bar with a green frame and green lettering
    ("CADET", "solid"),
    ("JUNIOR", "outline"),
]

# Sizes in millimetres.
BADGE_W, BADGE_H, BADGE_R = 76.0, 30.0, 4.0
TAG_W, TAG_H, TAG_R = 76.0, 15.0, 4.0
BASE_T = 2.0        # white plate thickness (10 layers at 0.2 mm)
TOP_T = 1.0         # raised green height (5 layers at 0.2 mm)
RIM_INSET = 1.4     # gap between the edge and the green frame
RIM_W = 1.0         # width of the green frame

EMBLEM = 18.0       # first aid square on the badge
EMBLEM_R = 2.6
EMBLEM_CROSS = 12.0  # width of the white cross inside it
EMBLEM_ARM = 4.2     # thickness of the cross's arms

NAME_CAP = 8.5      # height of a capital letter in the name
NAME_MAX_W = 44.0   # longer names shrink to fit this width
SUB_CAP = 4.6       # height of the FIRST AID letters
SUB_TRACK = 0.12    # extra letter spacing, as a fraction of the font size
NAME_SUB_GAP = 2.8

TAG_CAP = 6.6
TAG_TRACK = 0.12
TAG_CROSS = 6.6
TAG_ARM = 2.3
TAG_CROSS_X = 9.6   # cross centres, measured in from each end

PLATE = 180.0       # Bambu Lab A1 mini bed
WHITE = "#F3F2EC"
GREEN = "#0E8A4F"

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONT = os.path.join(HERE, "fonts", "Inter-ExtraBold.otf")


# ---------------------------------------------------------------------------
# Lettering: HarfBuzz shapes the text (so kerning is right) and draws the
# outlines; we flatten the curves into polygons.
# ---------------------------------------------------------------------------

class HBGlyphInfo(C.Structure):
    _fields_ = [("codepoint", C.c_uint32), ("mask", C.c_uint32),
                ("cluster", C.c_uint32), ("var1", C.c_uint32), ("var2", C.c_uint32)]


class HBGlyphPos(C.Structure):
    _fields_ = [("x_advance", C.c_int32), ("y_advance", C.c_int32),
                ("x_offset", C.c_int32), ("y_offset", C.c_int32), ("var", C.c_uint32)]


_MOVE = C.CFUNCTYPE(None, C.c_void_p, C.c_void_p, C.c_void_p, C.c_float, C.c_float, C.c_void_p)
_QUAD = C.CFUNCTYPE(None, C.c_void_p, C.c_void_p, C.c_void_p,
                    C.c_float, C.c_float, C.c_float, C.c_float, C.c_void_p)
_CUBIC = C.CFUNCTYPE(None, C.c_void_p, C.c_void_p, C.c_void_p,
                     C.c_float, C.c_float, C.c_float, C.c_float, C.c_float, C.c_float, C.c_void_p)
_CLOSE = C.CFUNCTYPE(None, C.c_void_p, C.c_void_p, C.c_void_p, C.c_void_p)


def _load_harfbuzz():
    name = ctypes.util.find_library("harfbuzz") or "libharfbuzz.so.0"
    try:
        hb = C.CDLL(name)
    except OSError:
        sys.exit("HarfBuzz isn't installed (apt install libharfbuzz0b, or brew install harfbuzz).")
    sig = {
        "hb_blob_create_from_file": (C.c_void_p, [C.c_char_p]),
        "hb_face_create": (C.c_void_p, [C.c_void_p, C.c_uint]),
        "hb_face_get_upem": (C.c_uint, [C.c_void_p]),
        "hb_font_create": (C.c_void_p, [C.c_void_p]),
        "hb_font_set_scale": (None, [C.c_void_p, C.c_int, C.c_int]),
        "hb_ot_metrics_get_position": (C.c_int, [C.c_void_p, C.c_uint32, C.POINTER(C.c_int32)]),
        "hb_buffer_create": (C.c_void_p, []),
        "hb_buffer_destroy": (None, [C.c_void_p]),
        "hb_buffer_add_utf8": (None, [C.c_void_p, C.c_char_p, C.c_int, C.c_uint, C.c_int]),
        "hb_buffer_guess_segment_properties": (None, [C.c_void_p]),
        "hb_shape": (None, [C.c_void_p, C.c_void_p, C.c_void_p, C.c_uint]),
        "hb_buffer_get_glyph_infos": (C.POINTER(HBGlyphInfo), [C.c_void_p, C.POINTER(C.c_uint)]),
        "hb_buffer_get_glyph_positions": (C.POINTER(HBGlyphPos), [C.c_void_p, C.POINTER(C.c_uint)]),
        "hb_draw_funcs_create": (C.c_void_p, []),
        "hb_draw_funcs_set_move_to_func": (None, [C.c_void_p, _MOVE, C.c_void_p, C.c_void_p]),
        "hb_draw_funcs_set_line_to_func": (None, [C.c_void_p, _MOVE, C.c_void_p, C.c_void_p]),
        "hb_draw_funcs_set_quadratic_to_func": (None, [C.c_void_p, _QUAD, C.c_void_p, C.c_void_p]),
        "hb_draw_funcs_set_cubic_to_func": (None, [C.c_void_p, _CUBIC, C.c_void_p, C.c_void_p]),
        "hb_draw_funcs_set_close_path_func": (None, [C.c_void_p, _CLOSE, C.c_void_p, C.c_void_p]),
        "hb_font_draw_glyph": (None, [C.c_void_p, C.c_uint, C.c_void_p, C.c_void_p]),
    }
    for fn, (res, args) in sig.items():
        f = getattr(hb, fn)
        f.restype, f.argtypes = res, args
    return hb


class Font:
    STEP_MM = 0.2   # longest straight piece when flattening a curve

    def __init__(self, path):
        self.hb = hb = _load_harfbuzz()
        self.face = hb.hb_face_create(hb.hb_blob_create_from_file(path.encode()), 0)
        self.upem = hb.hb_face_get_upem(self.face)
        if not self.upem:
            sys.exit(f"Couldn't read the font {path}")
        self.font = hb.hb_font_create(self.face)
        hb.hb_font_set_scale(self.font, self.upem, self.upem)
        cap = C.c_int32()
        tag = int.from_bytes(b"cpht", "big")
        hb.hb_ot_metrics_get_position(self.font, tag, C.byref(cap))
        self.cap = cap.value or 0.7 * self.upem

        self._contours, self._cur, self._pen, self._step = [], [], (0.0, 0.0), 1.0

        def move_to(_f, _d, _s, x, y, _u):
            self._finish()
            self._pen = (x, y)
            self._cur = [(x, y)]

        def line_to(_f, _d, _s, x, y, _u):
            self._pen = (x, y)
            self._cur.append((x, y))

        def quad_to(_f, _d, _s, cx, cy, x, y, _u):
            x0, y0 = self._pen
            n = self._steps(math.dist((x0, y0), (cx, cy)) + math.dist((cx, cy), (x, y)))
            for i in range(1, n + 1):
                t = i / n
                a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
                self._cur.append((a * x0 + b * cx + c * x, a * y0 + b * cy + c * y))
            self._pen = (x, y)

        def cubic_to(_f, _d, _s, c1x, c1y, c2x, c2y, x, y, _u):
            x0, y0 = self._pen
            n = self._steps(math.dist((x0, y0), (c1x, c1y)) + math.dist((c1x, c1y), (c2x, c2y))
                            + math.dist((c2x, c2y), (x, y)))
            for i in range(1, n + 1):
                t = i / n
                a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
                self._cur.append((a * x0 + b * c1x + c * c2x + d * x,
                                  a * y0 + b * c1y + c * c2y + d * y))
            self._pen = (x, y)

        def close(_f, _d, _s, _u):
            self._finish()

        self._cbs = (_MOVE(move_to), _MOVE(line_to), _QUAD(quad_to), _CUBIC(cubic_to), _CLOSE(close))
        self.funcs = hb.hb_draw_funcs_create()
        hb.hb_draw_funcs_set_move_to_func(self.funcs, self._cbs[0], None, None)
        hb.hb_draw_funcs_set_line_to_func(self.funcs, self._cbs[1], None, None)
        hb.hb_draw_funcs_set_quadratic_to_func(self.funcs, self._cbs[2], None, None)
        hb.hb_draw_funcs_set_cubic_to_func(self.funcs, self._cbs[3], None, None)
        hb.hb_draw_funcs_set_close_path_func(self.funcs, self._cbs[4], None, None)

    def _steps(self, length):
        return max(2, min(48, math.ceil(length / self._step)))

    def _finish(self):
        if len(self._cur) >= 3:
            self._contours.append(self._cur)
        self._cur = []

    def shape(self, text, tracking=0.0):
        """Glyph ids and pen positions (font units) for one line of text."""
        hb = self.hb
        buf = hb.hb_buffer_create()
        raw = text.encode("utf-8")
        hb.hb_buffer_add_utf8(buf, raw, len(raw), 0, len(raw))
        hb.hb_buffer_guess_segment_properties(buf)
        hb.hb_shape(self.font, buf, None, 0)
        n = C.c_uint()
        infos = hb.hb_buffer_get_glyph_infos(buf, C.byref(n))
        pos = hb.hb_buffer_get_glyph_positions(buf, C.byref(n))
        out, x = [], 0.0
        for i in range(n.value):
            out.append((infos[i].codepoint, x + pos[i].x_offset, pos[i].y_offset))
            x += pos[i].x_advance + (tracking * self.upem if i < n.value - 1 else 0)
        hb.hb_buffer_destroy(buf)
        return out

    def text(self, text, cap_mm, tracking=0.0):
        """Outlines of `text` with capitals `cap_mm` tall, baseline at y=0,
        starting at x=0. Returns (list of glyphs, each a list of rings in mm)."""
        scale = cap_mm / self.cap
        self._step = self.STEP_MM / scale
        glyphs = []
        for gid, gx, gy in self.shape(text, tracking):
            self._contours = []
            self.hb.hb_font_draw_glyph(self.font, gid, self.funcs, None)
            self._finish()
            rings = [clean_ring([((gx + x) * scale, (gy + y) * scale) for x, y in ring])
                     for ring in self._contours]
            rings = [r for r in rings if len(r) >= 3]
            if rings:
                glyphs.append(rings)
        return glyphs


# ---------------------------------------------------------------------------
# 2D shapes
# ---------------------------------------------------------------------------

def signed_area(ring):
    a = 0.0
    for i in range(len(ring)):
        x0, y0 = ring[i - 1]
        x1, y1 = ring[i]
        a += x0 * y1 - x1 * y0
    return a / 2


def clean_ring(ring, eps=1e-9):
    """Drop repeated points and points lying on a straight line between their
    neighbours, so the triangulated caps and the side walls share every edge."""
    pts = []
    for p in ring:
        if not pts or math.dist(p, pts[-1]) > 1e-7:
            pts.append(p)
    if len(pts) > 1 and math.dist(pts[0], pts[-1]) <= 1e-7:
        pts.pop()
    changed = True
    while changed and len(pts) >= 3:
        changed = False
        for i in range(len(pts)):
            (ax, ay), (bx, by), (cx, cy) = pts[i - 1], pts[i], pts[(i + 1) % len(pts)]
            if abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) < eps:
                del pts[i]
                changed = True
                break
    return pts


def point_in_ring(p, ring):
    x, y = p
    inside = False
    for i in range(len(ring)):
        x0, y0 = ring[i - 1]
        x1, y1 = ring[i]
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            inside = not inside
    return inside


def rounded_rect(x0, y0, w, h, r, seg=10):
    r = min(r, w / 2, h / 2)
    corners = [(x0 + w - r, y0 + r, -90), (x0 + w - r, y0 + h - r, 0),
               (x0 + r, y0 + h - r, 90), (x0 + r, y0 + r, 180)]
    pts = []
    for cx, cy, start in corners:
        for i in range(seg + 1):
            a = math.radians(start + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return clean_ring(pts)


def cross(cx, cy, size, arm):
    s, a = size / 2, arm / 2
    return [(cx + a, cy - s), (cx + a, cy - a), (cx + s, cy - a), (cx + s, cy + a),
            (cx + a, cy + a), (cx + a, cy + s), (cx - a, cy + s), (cx - a, cy + a),
            (cx - s, cy + a), (cx - s, cy - a), (cx - a, cy - a), (cx - a, cy - s)]


def move(rings, dx, dy):
    return [[(x + dx, y + dy) for x, y in r] for r in rings]


def bbox(rings):
    xs = [x for r in rings for x, _ in r]
    ys = [y for r in rings for _, y in r]
    return min(xs), min(ys), max(xs), max(ys)


def nest(rings):
    """Turn loose rings into polygons-with-holes by how deeply each one sits
    inside the others: outlines at even depth are solid, odd depth are holes.
    Outer rings come back anticlockwise and holes clockwise."""
    areas = [abs(signed_area(r)) for r in rings]
    depth, parent = [0] * len(rings), [None] * len(rings)
    for i, ri in enumerate(rings):
        for j, rj in enumerate(rings):
            if i != j and areas[j] > areas[i] and point_in_ring(ri[0], rj):
                depth[i] += 1
                if parent[i] is None or areas[j] < areas[parent[i]]:
                    parent[i] = j
    polys = {}
    for i, r in enumerate(rings):
        if depth[i] % 2 == 0:
            polys[i] = (r if signed_area(r) > 0 else r[::-1], [])
    for i, r in enumerate(rings):
        if depth[i] % 2 == 1:
            polys[parent[i]][1].append(r if signed_area(r) < 0 else r[::-1])
    return list(polys.values())


# ---------------------------------------------------------------------------
# Triangulation: a port of Mapbox's earcut (ISC licence), without the z-order
# speed-up, which these small shapes don't need.
# ---------------------------------------------------------------------------

class _Node:
    __slots__ = ("i", "x", "y", "prev", "next", "steiner")

    def __init__(self, i, x, y):
        self.i, self.x, self.y = i, x, y
        self.prev = self.next = None
        self.steiner = False


def earcut(points, holes):
    """points: list of (x, y); holes: start index of each hole in points.
    Returns triangles as index triples, anticlockwise."""
    outer_end = holes[0] if holes else len(points)
    outer = _linked(points, 0, outer_end, True)
    tris = []
    if outer is None or outer.next is outer.prev:
        return tris
    if holes:
        outer = _eliminate_holes(points, holes, outer)
    _earcut_linked(outer, tris, 0)
    return tris


def _linked(pts, start, end, clockwise):
    s = 0.0
    j = end - 1
    for i in range(start, end):
        s += (pts[j][0] - pts[i][0]) * (pts[i][1] + pts[j][1])
        j = i
    last = None
    order = range(start, end) if clockwise == (s > 0) else range(end - 1, start - 1, -1)
    for i in order:
        last = _insert(i, pts[i][0], pts[i][1], last)
    if last is not None and _equals(last, last.next):
        _remove(last)
        last = last.next
    return last


def _filter(start, end=None):
    if start is None:
        return start
    if end is None:
        end = start
    p = start
    while True:
        again = False
        if not p.steiner and (_equals(p, p.next) or _area(p.prev, p, p.next) == 0):
            _remove(p)
            p = end = p.prev
            if p is p.next:
                break
            again = True
        else:
            p = p.next
        if not again and p is end:
            break
    return end


def _earcut_linked(ear, tris, pass_):
    if ear is None:
        return
    stop = ear
    while ear.prev is not ear.next:
        prev, nxt = ear.prev, ear.next
        if _is_ear(ear):
            tris.append((prev.i, ear.i, nxt.i))
            _remove(ear)
            ear = nxt.next
            stop = nxt.next
            continue
        ear = nxt
        if ear is stop:
            if pass_ == 0:
                _earcut_linked(_filter(ear), tris, 1)
            elif pass_ == 1:
                ear = _cure_local_intersections(_filter(ear), tris)
                _earcut_linked(ear, tris, 2)
            else:
                _split_earcut(ear, tris)
            break


def _is_ear(ear):
    a, b, c = ear.prev, ear, ear.next
    if _area(a, b, c) >= 0:
        return False
    x0, x1 = min(a.x, b.x, c.x), max(a.x, b.x, c.x)
    y0, y1 = min(a.y, b.y, c.y), max(a.y, b.y, c.y)
    p = c.next
    while p is not a:
        if (x0 <= p.x <= x1 and y0 <= p.y <= y1
                and _point_in_tri(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y)
                and _area(p.prev, p, p.next) >= 0):
            return False
        p = p.next
    return True


def _cure_local_intersections(start, tris):
    p = start
    while True:
        a, b = p.prev, p.next.next
        if (not _equals(a, b) and _intersects(a, p, p.next, b)
                and _locally_inside(a, b) and _locally_inside(b, a)):
            tris.append((a.i, p.i, b.i))
            _remove(p)
            _remove(p.next)
            p = start = b
        p = p.next
        if p is start:
            break
    return _filter(p)


def _split_earcut(start, tris):
    a = start
    while True:
        b = a.next.next
        while b is not a.prev:
            if a.i != b.i and _valid_diagonal(a, b):
                c = _split(a, b)
                a = _filter(a, a.next)
                c = _filter(c, c.next)
                _earcut_linked(a, tris, 0)
                _earcut_linked(c, tris, 0)
                return
            b = b.next
        a = a.next
        if a is start:
            break


def _eliminate_holes(pts, holes, outer):
    queue = []
    for k, start in enumerate(holes):
        end = holes[k + 1] if k + 1 < len(holes) else len(pts)
        lst = _linked(pts, start, end, False)
        if lst is lst.next:
            lst.steiner = True
        queue.append(_leftmost(lst))
    queue.sort(key=lambda n: n.x)
    for h in queue:
        outer = _eliminate_hole(h, outer)
    return outer


def _eliminate_hole(hole, outer):
    bridge = _find_bridge(hole, outer)
    if bridge is None:
        return outer
    rev = _split(bridge, hole)
    _filter(rev, rev.next)
    return _filter(bridge, bridge.next)


def _find_bridge(hole, outer):
    p, hx, hy, qx, m = outer, hole.x, hole.y, -math.inf, None
    while True:
        if hy <= p.y and hy >= p.next.y and p.next.y != p.y:
            x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y)
            if hx >= x > qx:
                qx = x
                m = p if p.x < p.next.x else p.next
                if x == hx:
                    return m
        p = p.next
        if p is outer:
            break
    if m is None:
        return None
    stop, mx, my, tan_min = m, m.x, m.y, math.inf
    p = m
    while True:
        if (hx >= p.x >= mx and hx != p.x and _point_in_tri(
                hx if hy < my else qx, hy, mx, my, qx if hy < my else hx, hy, p.x, p.y)):
            tan = abs(hy - p.y) / (hx - p.x)
            if _locally_inside(p, hole) and (
                    tan < tan_min or (tan == tan_min and (
                        p.x > m.x or (p.x == m.x and _sector_contains_sector(m, p))))):
                m, tan_min = p, tan
        p = p.next
        if p is stop:
            break
    return m


def _sector_contains_sector(m, p):
    return _area(m.prev, m, p.prev) < 0 and _area(p.next, m, m.next) < 0


def _leftmost(start):
    p = left = start
    while True:
        if p.x < left.x or (p.x == left.x and p.y < left.y):
            left = p
        p = p.next
        if p is start:
            return left


def _point_in_tri(ax, ay, bx, by, cx, cy, px, py):
    return ((cx - px) * (ay - py) >= (ax - px) * (cy - py)
            and (ax - px) * (by - py) >= (bx - px) * (ay - py)
            and (bx - px) * (cy - py) >= (cx - px) * (by - py))


def _valid_diagonal(a, b):
    return (a.next.i != b.i and a.prev.i != b.i and not _intersects_polygon(a, b)
            and ((_locally_inside(a, b) and _locally_inside(b, a) and _middle_inside(a, b)
                  and (_area(a.prev, a, b.prev) or _area(a, b.prev, b)))
                 or (_equals(a, b) and _area(a.prev, a, a.next) > 0
                     and _area(b.prev, b, b.next) > 0)))


def _area(p, q, r):
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)


def _equals(p, q):
    return p.x == q.x and p.y == q.y


def _sign(v):
    return (v > 0) - (v < 0)


def _on_segment(p, q, r):
    return min(p.x, r.x) <= q.x <= max(p.x, r.x) and min(p.y, r.y) <= q.y <= max(p.y, r.y)


def _intersects(p1, q1, p2, q2):
    o1, o2 = _sign(_area(p1, q1, p2)), _sign(_area(p1, q1, q2))
    o3, o4 = _sign(_area(p2, q2, p1)), _sign(_area(p2, q2, q1))
    if o1 != o2 and o3 != o4:
        return True
    return ((o1 == 0 and _on_segment(p1, p2, q1)) or (o2 == 0 and _on_segment(p1, q2, q1))
            or (o3 == 0 and _on_segment(p2, p1, q2)) or (o4 == 0 and _on_segment(p2, q1, q2)))


def _intersects_polygon(a, b):
    p = a
    while True:
        if (p.i != a.i and p.next.i != a.i and p.i != b.i and p.next.i != b.i
                and _intersects(p, p.next, a, b)):
            return True
        p = p.next
        if p is a:
            return False


def _locally_inside(a, b):
    if _area(a.prev, a, a.next) < 0:
        return _area(a, b, a.next) >= 0 and _area(a, a.prev, b) >= 0
    return _area(a, b, a.prev) < 0 or _area(a, a.next, b) < 0


def _middle_inside(a, b):
    p, inside = a, False
    px, py = (a.x + b.x) / 2, (a.y + b.y) / 2
    while True:
        if ((p.y > py) != (p.next.y > py) and p.next.y != p.y
                and px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x):
            inside = not inside
        p = p.next
        if p is a:
            return inside


def _split(a, b):
    a2, b2 = _Node(a.i, a.x, a.y), _Node(b.i, b.x, b.y)
    an, bp = a.next, b.prev
    a.next, b.prev = b, a
    a2.next, an.prev = an, a2
    b2.next, a2.prev = a2, b2
    bp.next, b2.prev = b2, bp
    return b2


def _insert(i, x, y, last):
    p = _Node(i, x, y)
    if last is None:
        p.prev = p.next = p
    else:
        p.next, p.prev = last.next, last
        last.next.prev = p
        last.next = p
    return p


def _remove(p):
    p.next.prev = p.prev
    p.prev.next = p.next


# ---------------------------------------------------------------------------
# 3D: extrude polygons into closed meshes
# ---------------------------------------------------------------------------

def fix_t_junctions(pts, rings, starts, tris):
    """earcut skips points that end up in a straight line with their
    neighbours once holes are bridged in (lettering has lots of edges at the
    same height). The side walls still use those points, so split any cap
    triangle whose edge runs straight past one, to keep the mesh watertight."""
    boundary = set()
    for s, r in zip(starts, rings):
        for i in range(len(r)):
            boundary.add((s + i, s + (i + 1) % len(r)))
    tris = [tuple(t) for t in tris]
    for _ in range(10000):
        edges = {(t[k], t[(k + 1) % 3]) for t in tris for k in range(3)}
        for ti, t in enumerate(tris):
            for k in range(3):
                a, b, c = t[k], t[(k + 1) % 3], t[(k + 2) % 3]
                if (a, b) in boundary or (b, a) in edges:
                    continue
                (ax, ay), (bx, by) = pts[a], pts[b]
                length2 = (bx - ax) ** 2 + (by - ay) ** 2
                for p, (px, py) in enumerate(pts):
                    if p in (a, b):
                        continue
                    along = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / length2
                    off = abs((px - ax) * (by - ay) - (py - ay) * (bx - ax)) / math.sqrt(length2)
                    if 0 < along < 1 and off < 1e-7:
                        tris[ti:ti + 1] = [(a, p, c), (p, b, c)]
                        break
                else:
                    continue
                break
            else:
                continue
            break
        else:
            return tris
    raise RuntimeError("couldn't close the mesh")


class Mesh:
    def __init__(self):
        self.v, self.f = [], []

    def add_cap(self, polys, z, up):
        """Flat faces at height z covering polys (each an outer ring and its
        holes), facing up or down."""
        for outer, holes in polys:
            rings = [outer] + holes
            pts = [p for r in rings for p in r]
            starts, k = [], 0
            for r in rings:
                starts.append(k)
                k += len(r)
            tris = fix_t_junctions(pts, rings, starts, earcut(pts, starts[1:]))
            want = abs(signed_area(outer)) - sum(abs(signed_area(r)) for r in holes)
            got = sum(abs(signed_area([pts[a], pts[b], pts[c]])) for a, b, c in tris)
            if abs(want - got) > 1e-6 * max(1.0, want):
                raise RuntimeError(f"triangulation lost area: {got} vs {want}")
            base = len(self.v)
            self.v += [(x, y, z) for x, y in pts]
            for a, b, c in tris:
                self.f.append((base + a, base + b, base + c) if up else (base + a, base + c, base + b))
        return self

    def add_walls(self, polys, z0, z1):
        """Upright walls around every ring, from z0 to z1. Rings must be
        anticlockwise for outlines and clockwise for holes (as nest() gives)."""
        for outer, holes in polys:
            for r in [outer] + holes:
                base, m = len(self.v), len(r)
                self.v += [(x, y, z0) for x, y in r] + [(x, y, z1) for x, y in r]
                for i in range(m):
                    a, b = base + i, base + (i + 1) % m
                    self.f.append((a, b, b + m))
                    self.f.append((a, b + m, a + m))
        return self

    def add_prism(self, polys, z0, z1):
        return self.add_cap(polys, z0, False).add_walls(polys, z0, z1).add_cap(polys, z1, True)

    def check(self, name):
        """Every edge must be used exactly once in each direction (closed and
        consistently facing outwards), and the volume must be positive."""
        edges = {}
        for a, b, c in self.f:
            for e in ((a, b), (b, c), (c, a)):
                key = (self.v[e[0]], self.v[e[1]])
                edges[key] = edges.get(key, 0) + 1
        bad = [e for e, k in edges.items() if k != 1 or edges.get((e[1], e[0])) != 1]
        if bad:
            raise RuntimeError(f"{name}: {len(bad)} open or doubled edges, e.g. {bad[0]}")
        if self.volume() <= 0:
            raise RuntimeError(f"{name}: inside out")

    def volume(self):
        vol = 0.0
        for a, b, c in self.f:
            (x0, y0, z0), (x1, y1, z1), (x2, y2, z2) = self.v[a], self.v[b], self.v[c]
            vol += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6
        return vol


# ---------------------------------------------------------------------------
# The pieces
# ---------------------------------------------------------------------------

def frame(w, h, r):
    """The thin green frame just inside the edge."""
    o = rounded_rect(RIM_INSET, RIM_INSET, w - 2 * RIM_INSET, h - 2 * RIM_INSET, r - RIM_INSET)
    i_ = RIM_INSET + RIM_W
    inner = rounded_rect(i_, i_, w - 2 * i_, h - 2 * i_, max(0.6, r - i_))
    return [o, inner]


def text_block(font, text, cap, cx, baseline, tracking=0.0, max_w=None):
    glyphs = font.text(text, cap, tracking)
    x0, _, x1, _ = bbox([r for g in glyphs for r in g])
    if max_w and x1 - x0 > max_w:
        return text_block(font, text, cap * max_w / (x1 - x0), cx, baseline, tracking)
    dx = cx - (x0 + x1) / 2
    return [move(g, dx, baseline) for g in glyphs], cap


def check_glyph_spacing(glyphs, what, min_gap=0.3):
    """Letters mustn't touch each other (kerning can pull some pairs close)."""
    boxes = [bbox(g) for g in glyphs]
    for i in range(len(glyphs) - 1):
        a, b = boxes[i], boxes[i + 1]
        if b[0] - a[2] >= min_gap:
            continue
        for ring in glyphs[i + 1]:
            for p in ring:
                for outline in glyphs[i]:
                    if point_in_ring(p, outline):
                        raise RuntimeError(f"letters overlap in {what}")


def badge(font, name):
    w, h = BADGE_W, BADGE_H
    top = frame(w, h, BADGE_R)
    ex, ey = RIM_INSET + RIM_W + 2.6, (h - EMBLEM) / 2
    top += [rounded_rect(ex, ey, EMBLEM, EMBLEM, EMBLEM_R),
            cross(ex + EMBLEM / 2, ey + EMBLEM / 2, EMBLEM_CROSS, EMBLEM_ARM)]

    text_left = ex + EMBLEM + 3.0
    text_right = w - (RIM_INSET + RIM_W + 2.0)
    cx = (text_left + text_right) / 2
    block = NAME_CAP + (NAME_SUB_GAP + SUB_CAP if SUBTITLE else 0)
    name_base = h / 2 + block / 2 - NAME_CAP
    glyphs, cap = text_block(font, name, NAME_CAP, cx, name_base, max_w=min(NAME_MAX_W, text_right - text_left))
    check_glyph_spacing(glyphs, name)
    for g in glyphs:
        top += g
    if SUBTITLE:
        sub, _ = text_block(font, SUBTITLE, SUB_CAP, cx, h / 2 - block / 2, SUB_TRACK,
                            max_w=text_right - text_left)
        check_glyph_spacing(sub, SUBTITLE)
        for g in sub:
            top += g
    return piece(f"badge-{name.lower()}", f"{name} badge", w, h, BADGE_R, top,
                 note=f"name {cap:.1f} mm tall")


def tag(font, word, style):
    w, h = TAG_W, TAG_H
    glyphs, cap = text_block(font, word, TAG_CAP, w / 2, (h - TAG_CAP) / 2, TAG_TRACK,
                             max_w=w - 2 * (TAG_CROSS_X + TAG_CROSS / 2 + 2.5))
    check_glyph_spacing(glyphs, word)
    marks = [cross(TAG_CROSS_X, h / 2, TAG_CROSS, TAG_ARM),
             cross(w - TAG_CROSS_X, h / 2, TAG_CROSS, TAG_ARM)]
    if style == "solid":
        # A green bar with the lettering and crosses cut through it, so they
        # show white. nest() works out which outlines are holes.
        top = [rounded_rect(RIM_INSET, RIM_INSET, w - 2 * RIM_INSET, h - 2 * RIM_INSET,
                            TAG_R - RIM_INSET)] + marks
    else:
        top = frame(w, h, TAG_R) + marks
    for g in glyphs:
        top += g
    return piece(f"tag-{word.lower()}", f"{word.title()} tag", w, h, TAG_R, top, style=style)


def piece(pid, title, w, h, r, top_rings, **extra):
    outline = rounded_rect(0, 0, w, h, r)
    raised = nest(top_rings)
    # Two separate solids, one per colour, for the 3MF files...
    base = Mesh().add_prism([(outline, [])], 0.0, BASE_T)
    top = Mesh().add_prism(raised, BASE_T, BASE_T + TOP_T)
    # ...and one solid with both, for the STL: the white top surface is the
    # outline with the raised shapes' footprints left out.
    whole = (Mesh().add_cap([(outline, [])], 0.0, False)
             .add_walls([(outline, [])], 0.0, BASE_T)
             .add_cap(nest([outline] + top_rings), BASE_T, True)
             .add_walls(raised, BASE_T, BASE_T + TOP_T)
             .add_cap(raised, BASE_T + TOP_T, True))
    for m, part in ((base, "base"), (top, "top"), (whole, "whole")):
        m.check(f"{pid} {part}")
    if abs(whole.volume() - base.volume() - top.volume()) > 1e-6 * whole.volume():
        raise RuntimeError(f"{pid}: the one-piece version doesn't match the two parts")
    return dict(id=pid, title=title, w=w, h=h, base=base, top=top, whole=whole, **extra)


# ---------------------------------------------------------------------------
# Files
# ---------------------------------------------------------------------------

def write_stl(path, mesh, name):
    with open(path, "wb") as f:
        f.write(name.encode("ascii", "replace")[:80].ljust(80, b" "))
        f.write(struct.pack("<I", len(mesh.f)))
        for a, b, c in mesh.f:
            p, q, r = mesh.v[a], mesh.v[b], mesh.v[c]
            ux, uy, uz = q[0] - p[0], q[1] - p[1], q[2] - p[2]
            vx, vy, vz = r[0] - p[0], r[1] - p[1], r[2] - p[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            f.write(struct.pack("<12fH", nx / ln, ny / ln, nz / ln, *p, *q, *r, 0))


def mesh_xml(mesh):
    v = "".join(f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in mesh.v)
    t = "".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in mesh.f)
    return f"<mesh><vertices>{v}</vertices><triangles>{t}</triangles></mesh>"


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>"""

RELS = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>"""


def write_3mf(path, placed, title):
    """placed: list of (piece, x, y) with x, y the piece's centre on the bed.
    Each piece is one object made of two parts, base (filament 1, white) and
    top (filament 2, green), so the slicer keeps them together."""
    res, build, nid = [], [], 2
    settings = []
    for p, x, y in placed:
        base_id, top_id, obj_id = nid, nid + 1, nid + 2
        nid += 3
        res.append(f'<object id="{base_id}" type="model" name="{escape(p["title"])} base" '
                   f'pid="1" pindex="0">{mesh_xml(p["base"])}</object>')
        res.append(f'<object id="{top_id}" type="model" name="{escape(p["title"])} top" '
                   f'pid="1" pindex="1">{mesh_xml(p["top"])}</object>')
        res.append(f'<object id="{obj_id}" type="model" name="{escape(p["title"])}"><components>'
                   f'<component objectid="{base_id}"/><component objectid="{top_id}"/>'
                   f'</components></object>')
        tx, ty = x - p["w"] / 2, y - p["h"] / 2
        build.append(f'<item objectid="{obj_id}" transform="1 0 0 0 1 0 0 0 1 {tx:.3f} {ty:.3f} 0"/>')
        settings.append((obj_id, p["title"], base_id, top_id))
    model = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<model unit="millimeter" xml:lang="en-US" '
        'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n'
        f' <metadata name="Title">{escape(title)}</metadata>\n'
        ' <metadata name="Designer">Greta\'s Space</metadata>\n'
        ' <resources>\n'
        f'  <basematerials id="1"><base name="White" displaycolor="{WHITE}FF"/>'
        f'<base name="Green" displaycolor="{GREEN}FF"/></basematerials>\n  '
        + "\n  ".join(res) + "\n </resources>\n <build>\n  " + "\n  ".join(build)
        + "\n </build>\n</model>\n")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("3D/3dmodel.model", model)


def plate_layout(badges, tags):
    """Two columns on the 180 mm bed, badges first, tags underneath."""
    gap = 8.0
    cols = [PLATE / 2 - (BADGE_W + gap) / 2, PLATE / 2 + (BADGE_W + gap) / 2]
    rows = [[p for p in badges[i:i + 2]] for i in range(0, len(badges), 2)]
    rows += [[p for p in tags[i:i + 2]] for i in range(0, len(tags), 2)]
    heights = [max(p["h"] for p in row) for row in rows]
    total = sum(heights) + gap * (len(rows) - 1)
    y = PLATE / 2 + total / 2
    placed = []
    for row, rh in zip(rows, heights):
        y -= rh / 2
        for k, p in enumerate(row):
            placed.append((p, cols[k], y))
        y -= rh / 2 + gap
    return placed


def main():
    font = Font(FONT)
    badges = [badge(font, n) for n in NAMES]
    tags = [tag(font, word, style) for word, style in TAGS]
    pieces = badges + tags

    out = os.path.join(ROOT, "print")
    stl_dir = os.path.join(out, "stl")
    os.makedirs(stl_dir, exist_ok=True)
    files = []
    for p in pieces:
        fn = os.path.join(stl_dir, f"{p['id']}.stl")
        write_stl(fn, p["whole"], p["title"])
        files.append(fn)
        fn = os.path.join(out, f"{p['id']}.3mf")
        write_3mf(fn, [(p, PLATE / 2, PLATE / 2)], p["title"])
        files.append(fn)

    placed = plate_layout(badges, tags)
    plate = os.path.join(out, "first-aid-badges-plate.3mf")
    write_3mf(plate, placed, "First aid club badges")
    files.insert(0, plate)

    with zipfile.ZipFile(os.path.join(out, "first-aid-badges-files.zip"), "w", zipfile.ZIP_DEFLATED) as z:
        for fn in files:
            z.write(fn, os.path.relpath(fn, out))

    manifest = {
        "plate": PLATE, "baseT": BASE_T, "topT": TOP_T,
        "colours": {"base": WHITE, "top": GREEN},
        "pieces": [{
            "id": p["id"], "title": p["title"], "w": p["w"], "h": p["h"],
            "x": x, "y": y,
            "stl": f"print/stl/{p['id']}.stl",
            "file": f"print/{p['id']}.3mf",
        } for p, x, y in placed],
    }
    with open(os.path.join(ROOT, "pieces.json"), "w") as f:
        json.dump(manifest, f, indent=1)

    for p, x, y in placed:
        print(f"{p['title']:<14} {p['w']:.0f} x {p['h']:.0f} mm  at ({x:.0f}, {y:.0f})  "
              f"base {p['base'].volume() / 1000:.2f} cm3, top {p['top'].volume() / 1000:.2f} cm3, "
              f"{len(p['top'].f)} triangles  {p.get('note', '')}")
    print(f"Wrote {len(files)} files to {out}")


if __name__ == "__main__":
    main()
