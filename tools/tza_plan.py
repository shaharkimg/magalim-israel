"""Render a tight aerial over a single plan's footprint (e.g. one nahala)."""
import json
import os

from PIL import ImageDraw
from shapely.geometry import shape
from shapely.ops import unary_union

import tza_export as T

PLAN = os.environ.get("PLAN", "651-0484089")
LABEL = os.environ.get("LABEL", "nahala-65")
PAD = float(os.environ.get("PLAN_PAD_M", "90"))
SIZE = T.SIZE

rr = T.S.post(f"{T.XPLAN}/{T.YEUD_LAYER}/query", timeout=120, data={
    "where": f"pl_number='{PLAN}'", "outFields": "*", "outSR": "2039",
    "returnGeometry": "true", "f": "geojson"})
T.log("POST", rr.status_code, len(rr.content), "plan geometry")
feats = rr.json().get("features", []) if rr.status_code == 200 else []

parts, geoms = [], []
for f in feats:
    if not f.get("geometry"):
        continue
    g = shape(f["geometry"]).buffer(0)
    geoms.append(g)
    p = f.get("properties", {})
    parts.append({"yeud": p.get("mavat_name"), "status": p.get("station_desc"),
                  "m2": round(g.area, 1), "geom": g})
if not geoms:
    T.log("NO PLAN GEOMETRY")
    raise SystemExit(0)

u = unary_union(geoms)
minx, miny, maxx, maxy = u.bounds
minx, miny, maxx, maxy = minx - PAD, miny - PAD, maxx + PAD, maxy + PAD
w, h = maxx - minx, maxy - miny
if w > h:
    c = (miny + maxy) / 2
    miny, maxy = c - w / 2, c + w / 2
else:
    c = (minx + maxx) / 2
    minx, maxx = c - h / 2, c + h / 2

lon0, lat0 = T.to_wgs.transform(minx, miny)
lon1, lat1 = T.to_wgs.transform(maxx, maxy)
base = T.aerial(lon0, lat0, lon1, lat1, maxx - minx)
if base is None:
    T.log("NO BASE IMAGERY")
    raise SystemExit(0)


def to_px(x, y):
    return ((x - minx) / (maxx - minx) * SIZE,
            (1 - (y - miny) / (maxy - miny)) * SIZE)


def rings_of(g):
    gs = g.geoms if g.geom_type == "MultiPolygon" else [g]
    return [list(p.exterior.coords) for p in gs]


COLORS = {"מגורים בישוב כפרי": (255, 90, 90), "קרקע חקלאית": (120, 255, 120)}


def draw(img, shaded):
    d = ImageDraw.Draw(img, "RGBA")
    if shaded:
        for p in parts:
            col = COLORS.get(p["yeud"], (90, 160, 255))
            for ring in rings_of(p["geom"]):
                pts = [to_px(x, y) for x, y in ring]
                d.polygon(pts, fill=col + (70,))
                d.line(pts + [pts[0]], fill=col + (255,), width=4)
    for ring in rings_of(u):
        pts = [to_px(x, y) for x, y in ring]
        d.line(pts + [pts[0]], fill=(255, 215, 0, 255), width=7)
    lab = f"{LABEL}  {PLAN}  {u.area/1000:.2f} dunam"
    d.rectangle([20, 20, 20 + 13 * len(lab), 70], fill=(0, 0, 0, 180))
    d.text((34, 36), lab, fill=(255, 255, 255, 255))
    return img


os.makedirs(T.OUT, exist_ok=True)
a = os.path.join(T.OUT, f"plan_{LABEL}.png")
draw(base.copy(), False).save(a)
b = os.path.join(T.OUT, f"plan_{LABEL}_yeud.png")
draw(base.copy(), True).save(b)
T.log("wrote", a, b)

with open(os.path.join(T.OUT, f"plan_{LABEL}.json"), "w", encoding="utf-8") as fh:
    json.dump({"plan": PLAN, "total_m2": round(u.area, 1),
               "parts": [{k: v for k, v in p.items() if k != "geom"}
                         for p in parts]}, fh, ensure_ascii=False, indent=1)
open(os.path.join(T.OUT, "diag.txt"), "w", encoding="utf-8").write("\n".join(T.diag))
