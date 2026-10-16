"""Render an aerial (tza) image for an Israeli cadastral parcel.

Runs on a GitHub Actions runner (which has open internet access) and writes
out/tza_<gush>_<helka>.png plus out/diag.txt.
"""
import json
import os
import io
import math
import traceback

import requests
from PIL import Image, ImageDraw
from pyproj import Transformer

GUSH = int(os.environ.get("GUSH", "2547"))
HELKA = int(os.environ.get("HELKA", "10"))
# Fallback centre in ITM (EPSG:2039) if the parcel geometry cannot be fetched.
FALLBACK_ITM = (float(os.environ.get("ITM_X", "176595")),
                float(os.environ.get("ITM_Y", "627998")))
PAD = float(os.environ.get("PAD_M", "260"))  # metres around the parcel

OUT = "out"
os.makedirs(OUT, exist_ok=True)
diag = []


def log(*a):
    line = " ".join(str(x) for x in a)
    print(line, flush=True)
    diag.append(line)


to_wgs = Transformer.from_crs("EPSG:2039", "EPSG:4326", always_xy=True)

S = requests.Session()
S.headers.update({
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "*/*",
})


def try_get(url, **kw):
    try:
        r = S.get(url, timeout=45, **kw)
        log("GET", r.status_code, len(r.content), url[:180])
        return r
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:200], url[:180])
        return None


# ---------------------------------------------------------------- parcel geometry
def parcel_rings_itm():
    """Return list of rings [[(x,y), ...]] in ITM, or None."""
    # 1) govmap open data WFS
    caps = try_get("https://open.govmap.gov.il/geoserver/opendata/wfs"
                   "?service=WFS&version=2.0.0&request=GetCapabilities")
    names = []
    if caps is not None and caps.status_code == 200:
        import re
        names = re.findall(r"<Name>([^<]+)</Name>", caps.text)
        log("WFS layers:", json.dumps(names[:120], ensure_ascii=False))
        open(os.path.join(OUT, "wfs_capabilities.xml"), "w",
             encoding="utf-8").write(caps.text[:400000])

    cands = [n for n in names if any(k in n.lower() for k in
             ("parcel", "helka", "chelka", "cadas", "gush", "block"))]
    log("parcel-ish layers:", json.dumps(cands, ensure_ascii=False))

    for layer in cands[:8]:
        for fld_g, fld_h in (("GUSH_NUM", "PARCEL"), ("gush_num", "parcel"),
                             ("GUSH", "HELKA"), ("gush", "helka"),
                             ("GUSH_SUFFIX", "PARCEL_NUM"),
                             ("gush_num", "parcel_num")):
            cql = f"{fld_g}={GUSH} AND {fld_h}={HELKA}"
            r = try_get("https://open.govmap.gov.il/geoserver/opendata/wfs",
                        params={"service": "WFS", "version": "2.0.0",
                                "request": "GetFeature", "typeNames": layer,
                                "outputFormat": "application/json",
                                "srsName": "EPSG:2039", "count": "5",
                                "CQL_FILTER": cql})
            if r is None or r.status_code != 200:
                continue
            try:
                j = r.json()
            except Exception:  # noqa: BLE001
                continue
            feats = j.get("features") or []
            if not feats:
                continue
            log("HIT", layer, cql, "features:", len(feats))
            geom = feats[0]["geometry"]
            coords = geom["coordinates"]
            if geom["type"] == "MultiPolygon":
                rings = [r0 for poly in coords for r0 in poly]
            else:
                rings = coords
            return [[(float(p[0]), float(p[1])) for p in ring] for ring in rings]

    # 2) govmap ArcGIS parcel service (layer ids vary; probe the directory)
    d = try_get("https://ags.govmap.gov.il/arcgis/rest/services?f=json")
    if d is not None and d.status_code == 200:
        open(os.path.join(OUT, "ags_services.json"), "w",
             encoding="utf-8").write(d.text[:200000])
        log("ags services:", d.text[:1500])
    return None


rings = None
try:
    rings = parcel_rings_itm()
except Exception:  # noqa: BLE001
    log("parcel lookup failed:\n" + traceback.format_exc()[:1500])

if rings:
    xs = [p[0] for r in rings for p in r]
    ys = [p[1] for r in rings for p in r]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    log("parcel bbox ITM:", minx, miny, maxx, maxy,
        "size_m:", round(maxx - minx), round(maxy - miny))
else:
    cx, cy = FALLBACK_ITM
    minx = maxx = cx
    miny = maxy = cy
    log("no parcel geometry; using fallback centre", FALLBACK_ITM)

minx -= PAD
maxx += PAD
miny -= PAD
maxy += PAD

# square the extent so the picture is not distorted
w = maxx - minx
h = maxy - miny
if w > h:
    c = (miny + maxy) / 2
    miny, maxy = c - w / 2, c + w / 2
else:
    c = (minx + maxx) / 2
    minx, maxx = c - h / 2, c + h / 2

lon0, lat0 = to_wgs.transform(minx, miny)
lon1, lat1 = to_wgs.transform(maxx, maxy)
log("bbox wgs84:", lon0, lat0, lon1, lat1)

SIZE = 1500


def fetch_base():
    # Esri World Imagery, no API key needed
    url = ("https://server.arcgisonline.com/ArcGIS/rest/services/"
           "World_Imagery/MapServer/export")
    r = try_get(url, params={"bbox": f"{lon0},{lat0},{lon1},{lat1}",
                             "bboxSR": "4326", "imageSR": "3857",
                             "size": f"{SIZE},{SIZE}", "format": "png24",
                             "transparent": "false", "f": "image"})
    if r is not None and r.status_code == 200 and r.content[:4] == b"\x89PNG":
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    # fallback: govmap orthophoto WMS
    for base in ("https://open.govmap.gov.il/geoserver/opendata/wms",
                 "https://ags.govmap.gov.il/arcgis/services/orthophoto/"
                 "MapServer/WMSServer"):
        r = try_get(base, params={"service": "WMS", "version": "1.1.1",
                                  "request": "GetMap",
                                  "bbox": f"{minx},{miny},{maxx},{maxy}",
                                  "srs": "EPSG:2039",
                                  "width": SIZE, "height": SIZE,
                                  "layers": "orthophoto", "format": "image/png"})
        if r is not None and r.status_code == 200 and r.content[:4] == b"\x89PNG":
            return Image.open(io.BytesIO(r.content)).convert("RGB")
    return None


img = fetch_base()
if img is None:
    log("NO BASE IMAGERY")
    img = Image.new("RGB", (SIZE, SIZE), (32, 32, 32))

draw = ImageDraw.Draw(img, "RGBA")


def to_px(x, y):
    return ((x - minx) / (maxx - minx) * SIZE,
            (1 - (y - miny) / (maxy - miny)) * SIZE)


if rings:
    for ring in rings:
        pts = [to_px(x, y) for x, y in ring]
        draw.line(pts + [pts[0]], fill=(255, 215, 0, 255), width=6)
        draw.polygon(pts, fill=(255, 215, 0, 40))
else:
    cx, cy = to_px(*FALLBACK_ITM)
    draw.line([(cx - 40, cy), (cx + 40, cy)], fill=(255, 215, 0, 255), width=5)
    draw.line([(cx, cy - 40), (cx, cy + 40)], fill=(255, 215, 0, 255), width=5)

label = f"Gush {GUSH} / Helka {HELKA}"
draw.rectangle([20, 20, 20 + 13 * len(label), 70], fill=(0, 0, 0, 170))
draw.text((34, 36), label, fill=(255, 255, 255, 255))

name = os.path.join(OUT, f"tza_{GUSH}_{HELKA}.png")
img.save(name)
log("wrote", name, os.path.getsize(name), "bytes")

open(os.path.join(OUT, "diag.txt"), "w", encoding="utf-8").write("\n".join(diag))
