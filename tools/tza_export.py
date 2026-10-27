"""Render an aerial (tza) image for Israeli cadastral parcels.

For each parcel in PARCELS ("gush/helka,gush/helka,...") it writes:
  out/tza_<gush>_<helka>.png        aerial + parcel outline
  out/tza_<gush>_<helka>_yeud.png   the same, with mavat land-use shaded over it
  out/zoning_<gush>_<helka>.json    the land-use records the parcel falls in

Sources: parcel geometry from govmap open data (PARCEL_ALL), imagery from Esri
World Imagery, land-use from the planning administration's Xplan service.
Runs on a GitHub Actions runner, which has open internet access.
"""
import io
import json
import math
import os
import re
import ssl
import time
import traceback

import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
from PIL import Image, ImageDraw
from pyproj import Transformer

OUT = "out"
os.makedirs(OUT, exist_ok=True)
PARCELS = os.environ.get("PARCELS", "2547/10,8561/13")
PARCEL_LAYER = os.environ.get("PARCEL_LAYER") or "opendata:PARCEL_ALL"
PAD = float(os.environ.get("PAD_M", "260"))
SIZE = 1500
XPLAN = ("https://ags.iplan.gov.il/arcgisiplan/rest/services/"
         "PlanningPublic/Xplan/MapServer")
YEUD_LAYER = 4
APPROVED = 3010  # station code for an approved (statutory) plan

diag = []


def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:3000], flush=True)
    diag.append(s)


class LegacyTLS(HTTPAdapter):
    """ags.iplan.gov.il still negotiates legacy TLS."""

    def init_poolmanager(self, connections, maxsize, block=False, **kw):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.minimum_version = ssl.TLSVersion.TLSv1
        try:
            ctx.options |= 0x4
            ctx.set_ciphers("DEFAULT@SECLEVEL=1")
        except Exception:  # noqa: BLE001
            pass
        self.poolmanager = PoolManager(num_pools=connections, maxsize=maxsize,
                                       block=block, ssl_context=ctx, **kw)


S = requests.Session()
S.mount("https://", LegacyTLS())
S.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) "
                                "Chrome/124.0.0.0 Safari/537.36",
                  "Accept": "*/*"})

to_wgs = Transformer.from_crs("EPSG:2039", "EPSG:4326", always_xy=True)
to_itm = Transformer.from_crs("EPSG:4326", "EPSG:2039", always_xy=True)


def get(url, params=None, quiet=False):
    try:
        r = S.get(url, params=params, timeout=90)
        if not quiet:
            log("GET", r.status_code, len(r.content), r.url[:190])
        return r
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:180], url[:160])
        return None


def parcel_rings(gush, helka):
    gush = str(gush)
    if "-" in gush:
        gnum, gsuf = gush.split("-", 1)
        cql = (f"GUSH_NUM={gnum} AND GUSH_SUFFI={gsuf} AND PARCEL={helka}")
    else:
        cql = f"GUSH_NUM={gush} AND PARCEL={helka}"
    r = get("https://open.govmap.gov.il/geoserver/opendata/wfs",
            {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
             "typeNames": PARCEL_LAYER,
             "outputFormat": "application/json", "srsName": "EPSG:2039",
             "count": "5", "CQL_FILTER": cql})
    if r is None or r.status_code != 200:
        return None
    try:
        feats = r.json().get("features") or []
    except Exception:  # noqa: BLE001
        return None
    if not feats:
        log("no parcel found for", gush, helka)
        return None
    if len(feats) > 1:
        log("   WARNING", len(feats), "parcels match — sub-gushim:",
            [f.get("properties", {}).get("ID") for f in feats],
            "— using the first; pass gush-suffi/helka to disambiguate")
    props = feats[0].get("properties", {})
    log("   parcel attributes:", json.dumps(props, ensure_ascii=False)[:600])
    geom = feats[0]["geometry"]
    coords = geom["coordinates"]
    rings = ([r0 for poly in coords for r0 in poly]
             if geom["type"] == "MultiPolygon" else coords)
    return [[(float(p[0]), float(p[1])) for p in ring] for ring in rings]


def blank(img):
    """True when the tile server returned its grey 'no data' filler."""
    import numpy as np

    a = np.asarray(img.convert("RGB").resize((200, 200))).astype(int)
    spread = a.max(axis=2) - a.min(axis=2)
    grey = (spread < 12) & (a[..., 0] > 180) & (a[..., 0] < 225)
    return grey.mean() > 0.5


def aerial(lon0, lat0, lon1, lat1, span_m):
    """Fetch imagery, backing off to coarser levels where none is published."""
    for target_mpp in (span_m / SIZE, 0.5, 1.0, 2.0):
        px = max(400, min(SIZE, int(span_m / max(target_mpp, 0.05))))
        for attempt in range(2):
            r = get("https://server.arcgisonline.com/ArcGIS/rest/services/"
                    "World_Imagery/MapServer/export",
                    {"bbox": f"{lon0},{lat0},{lon1},{lat1}", "bboxSR": "4326",
                     "imageSR": "3857", "size": f"{px},{px}", "format": "png24",
                     "transparent": "false", "f": "image"})
            if r is not None and r.status_code == 200 and r.content[:4] == b"\x89PNG":
                img = Image.open(io.BytesIO(r.content)).convert("RGB")
                if not blank(img):
                    log(f"   imagery at {span_m / px:.2f} m/px")
                    return img.resize((SIZE, SIZE), Image.LANCZOS)
                log(f"   no imagery published at {span_m / px:.2f} m/px")
                break
            time.sleep(3 * (attempt + 1))
    log("export failed; stitching tiles instead")
    return aerial_tiles(lon0, lat0, lon1, lat1)


def aerial_tiles(lon0, lat0, lon1, lat1):
    """Stitch World Imagery XYZ tiles and crop to the bbox."""
    def deg2xy(lon, lat, z):
        n = 2 ** z
        x = (lon + 180.0) / 360.0 * n
        la = math.radians(lat)
        y = (1 - math.log(math.tan(la) + 1 / math.cos(la)) / math.pi) / 2 * n
        return x, y

    for z in (19, 18, 17):
        x0f, y0f = deg2xy(lon0, lat1, z)   # top-left
        x1f, y1f = deg2xy(lon1, lat0, z)   # bottom-right
        tx0, ty0, tx1, ty1 = (int(x0f), int(y0f), int(x1f), int(y1f))
        if (tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 90:
            continue
        canvas = Image.new("RGB", ((tx1 - tx0 + 1) * 256,
                                   (ty1 - ty0 + 1) * 256), (20, 20, 20))
        ok = True
        for tx in range(tx0, tx1 + 1):
            for ty in range(ty0, ty1 + 1):
                rr = get("https://server.arcgisonline.com/ArcGIS/rest/services/"
                         f"World_Imagery/MapServer/tile/{z}/{ty}/{tx}",
                         quiet=True)
                if rr is None or rr.status_code != 200:
                    ok = False
                    break
                canvas.paste(Image.open(io.BytesIO(rr.content)).convert("RGB"),
                             ((tx - tx0) * 256, (ty - ty0) * 256))
            if not ok:
                break
        if not ok:
            continue
        left = int((x0f - tx0) * 256)
        top = int((y0f - ty0) * 256)
        right = int((x1f - tx0) * 256)
        bottom = int((y1f - ty0) * 256)
        log("stitched tiles at zoom", z)
        return canvas.crop((left, top, right, bottom)).resize(
            (SIZE, SIZE), Image.LANCZOS)
    return None


def yeud_overlay(minx, miny, maxx, maxy, approved_only=True):
    params = {"bbox": f"{minx},{miny},{maxx},{maxy}", "bboxSR": "2039",
              "imageSR": "2039", "size": f"{SIZE},{SIZE}", "format": "png32",
              "transparent": "true", "layers": f"show:{YEUD_LAYER}",
              "dpi": "96", "f": "image"}
    if approved_only:
        params["layerDefs"] = json.dumps({str(YEUD_LAYER): f"station={APPROVED}"})
    r = get(XPLAN + "/export", params)
    if r is not None and r.status_code == 200 and r.content[:4] == b"\x89PNG":
        return Image.open(io.BytesIO(r.content)).convert("RGBA")
    if r is not None:
        log("   yeud export body:", r.text[:300])
    return None


def yeud_breakdown(rings, gush, helka):
    """How much of the parcel each land-use designation covers, by plan."""
    from shapely.geometry import Polygon, shape
    from shapely.ops import unary_union

    parcel = unary_union([Polygon(r0).buffer(0) for r0 in rings])
    geom = {"rings": [[[x, y] for x, y in r0] for r0 in rings],
            "spatialReference": {"wkid": 2039}}
    try:
        r = S.post(f"{XPLAN}/{YEUD_LAYER}/query", timeout=120, data={
            "geometry": json.dumps(geom), "geometryType": "esriGeometryPolygon",
            "inSR": "2039", "outSR": "2039",
            "spatialRel": "esriSpatialRelIntersects", "outFields": "*",
            "returnGeometry": "true", "f": "geojson"})
        log("POST", r.status_code, len(r.content), "yeud intersect query")
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:160])
        return []
    if r.status_code != 200:
        log("   body:", r.text[:300])
        return []
    try:
        feats = r.json().get("features", [])
    except Exception:  # noqa: BLE001
        log("   body:", r.text[:300])
        return []

    rows = {}
    for f in feats:
        if not f.get("geometry"):
            continue
        try:
            g = shape(f["geometry"]).buffer(0)
        except Exception:  # noqa: BLE001
            continue
        inter = g.intersection(parcel)
        if inter.is_empty or inter.area < 1:
            continue
        p = f.get("properties", {})
        key = (p.get("pl_number"), p.get("pl_name"), p.get("station_desc"),
               p.get("mavat_name"))
        rows[key] = rows.get(key, 0.0) + inter.area

    out = [{"pl_number": k[0], "pl_name": k[1], "status": k[2],
            "yeud": k[3], "m2": round(v, 1),
            "dunam": round(v / 1000, 3),
            "pct_of_parcel": round(100 * v / parcel.area, 1)}
           for k, v in sorted(rows.items(), key=lambda kv: -kv[1])]
    log("   breakdown:", json.dumps(out, ensure_ascii=False)[:2500])
    with open(os.path.join(OUT, f"breakdown_{gush}_{helka}.json"), "w",
              encoding="utf-8") as fh:
        json.dump({"parcel_m2": round(parcel.area, 1), "rows": out}, fh,
                  ensure_ascii=False, indent=1)
    return out


def yeud_records(minx, miny, maxx, maxy):
    r = get(f"{XPLAN}/{YEUD_LAYER}/query",
            {"geometry": f"{minx},{miny},{maxx},{maxy}",
             "geometryType": "esriGeometryEnvelope", "inSR": "2039",
             "spatialRel": "esriSpatialRelIntersects", "outFields": "*",
             "returnGeometry": "false", "f": "json"})
    if r is None or r.status_code != 200:
        return []
    try:
        return r.json().get("features", [])
    except Exception:  # noqa: BLE001
        log("   yeud query body:", r.text[:300])
        return []



def resolve_point(spec):
    """POINTS entry "a,b" -> "gush/helka" for the parcel containing that point.

    Accepts ITM/EPSG:2039 "x,y" (values > 100000) or WGS84 "lat,lon".
    """
    a, b = [float(v.strip()) for v in spec.split(",")[:2]]
    if abs(a) > 100000 or abs(b) > 100000:
        x, y = a, b
    else:
        x, y = to_itm.transform(b, a)  # spec is lat,lon -> transform(lon,lat)
    log(f"=== point {spec} -> ITM {x:.2f},{y:.2f} ===")
    d = 3.0
    r = get("https://open.govmap.gov.il/geoserver/opendata/wfs",
            {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
             "typeNames": PARCEL_LAYER,
             "outputFormat": "application/json", "srsName": "EPSG:2039",
             "count": "25",
             "bbox": f"{x - d},{y - d},{x + d},{y + d},EPSG:2039"})
    if r is None or r.status_code != 200:
        log("   point lookup failed")
        return None
    try:
        feats = r.json().get("features") or []
    except Exception:  # noqa: BLE001
        return None
    log(f"   {len(feats)} candidate parcel(s) near point")
    if not feats:
        log("   no parcel at point", spec)
        return None
    from shapely.geometry import Point, shape
    pt = Point(x, y)
    hit = None
    for f in feats:
        try:
            if shape(f["geometry"]).buffer(0).contains(pt):
                hit = f
                break
        except Exception:  # noqa: BLE001
            continue
    if hit is None:
        hit = feats[0]
        log("   no polygon strictly contains the point; using nearest candidate")
    pr = hit.get("properties", {})
    g, h = pr.get("GUSH_NUM"), pr.get("PARCEL")
    log(f"   point resolves to gush {g} helka {h}",
        pr.get("LOCALITY_N"), "legal_area", pr.get("LEGAL_AREA"))
    return f"{g}/{h}"


def list_layers():
    """Log every WFS feature type the govmap opendata service publishes."""
    r = get("https://open.govmap.gov.il/geoserver/opendata/wfs",
            {"service": "WFS", "version": "2.0.0",
             "request": "GetCapabilities"})
    if r is None or r.status_code != 200:
        log("   capabilities failed")
        return
    import re as _re
    names = _re.findall(r"<(?:wfs:)?Name>([^<]+)</(?:wfs:)?Name>", r.text)
    names = sorted(set(n for n in names if ":" in n))
    log(f"   {len(names)} feature types")
    for n in names:
        log("     ", n)


def sample_layer(name):
    """Log the property keys and a sample row of a WFS feature type."""
    r = get("https://open.govmap.gov.il/geoserver/opendata/wfs",
            {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
             "typeNames": name, "outputFormat": "application/json",
             "srsName": "EPSG:2039", "count": "2"})
    if r is None or r.status_code != 200:
        log("   sample failed", name)
        return
    try:
        feats = r.json().get("features") or []
    except Exception:  # noqa: BLE001
        log("   sample not json", r.text[:200])
        return
    if not feats:
        log("   no features in", name)
        return
    pr = feats[0].get("properties", {})
    log("   keys:", sorted(pr))
    log("   row:", json.dumps(pr, ensure_ascii=False)[:500])


def probe_url(u):
    """GET an arbitrary URL and log a truncated response (layer discovery)."""
    r = get(u)
    if r is None:
        return
    log("   status", r.status_code, "len", len(r.content))
    log("   body:", r.text[:3000])


def resolve_locality(spec):
    """LOCALITY_PARCELS entry "locality/helka" -> "gush/helka".

    Finds a parcel by locality name when the card's gush number is wrong.
    A helka of "*" just lists the gush numbers registered to that locality.
    """
    if spec.strip() == "layers":
        list_layers()
        return None
    if spec.strip().startswith("probe:"):
        probe_url(spec.strip()[6:])
        return None
    if spec.strip().startswith("sample:"):
        sample_layer(spec.strip()[7:])
        return None
    loc, helka = spec.rsplit("/", 1)
    loc, helka = loc.strip(), helka.strip()
    log(f"=== locality {loc} helka {helka} ===")
    if loc.startswith("mun:"):
        base = f"REG_MUN_NA LIKE '%{loc[4:]}%'"
    elif loc.isdigit():
        base = f"GUSH_NUM={loc}"
    else:
        base = f"LOCALITY_N LIKE '%{loc}%'"
    cql = base if helka == "*" else f"{base} AND PARCEL={helka}"
    r = get("https://open.govmap.gov.il/geoserver/opendata/wfs",
            {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
             "typeNames": PARCEL_LAYER,
             "outputFormat": "application/json", "srsName": "EPSG:2039",
             "count": "1000", "CQL_FILTER": cql})
    if r is None or r.status_code != 200:
        log("   locality lookup failed")
        return None
    try:
        feats = r.json().get("features") or []
    except Exception:  # noqa: BLE001
        return None
    if not feats:
        log("   no parcel found for locality", loc, "helka", helka)
        return None
    if helka == "*":
        seen, locs = {}, {}
        for f in feats:
            pr = f.get("properties", {})
            seen.setdefault(pr.get("GUSH_NUM"), []).append(pr.get("PARCEL"))
            locs.setdefault(pr.get("GUSH_NUM"), []).append(
                pr.get("LOCALITY_N") or "(blank)")
        for g in sorted(seen, key=lambda v: (v is None, v)):
            hs = sorted(x for x in seen[g] if x is not None)
            log(f"   gush {g}: {len(hs)} parcels, "
                f"min {hs[0] if hs else '-'} max {hs[-1] if hs else '-'}")
            log(f"      helkot {hs}")
            log(f"      localities {sorted(set(locs.get(g, [])))}")
        return None
    for f in feats[:20]:
        pr = f.get("properties", {})
        cx = cy = None
        try:
            from shapely.geometry import shape as _sh
            c = _sh(f["geometry"]).buffer(0).centroid
            cx, cy = round(c.x), round(c.y)
        except Exception:  # noqa: BLE001
            pass
        log("   candidate", pr.get("ID"), "gush", pr.get("GUSH_NUM"),
            "suffi", pr.get("GUSH_SUFFI"), "helka", pr.get("PARCEL"),
            repr(pr.get("LOCALITY_N")), pr.get("REG_MUN_NA"),
            "area", pr.get("LEGAL_AREA"), "centroid", cx, cy)
    pr = feats[0].get("properties", {})
    return f"{pr.get('GUSH_NUM')}/{pr.get('PARCEL')}"


SPECS = [p.strip() for p in PARCELS.split(",") if p.strip()]
for _pt in [p.strip() for p in os.environ.get("POINTS", "").split(";") if p.strip()]:
    try:
        _res = resolve_point(_pt)
    except Exception as e:  # noqa: BLE001
        log("   point error", type(e).__name__, str(e)[:160])
        _res = None
    if _res and _res not in SPECS:
        SPECS.append(_res)

for _lp in [p.strip() for p in os.environ.get("LOCALITY_PARCELS", "").split(",")
            if p.strip()]:
    try:
        _res = resolve_locality(_lp)
    except Exception as e:  # noqa: BLE001
        log("   locality error", type(e).__name__, str(e)[:160])
        _res = None
    if _res and _res not in SPECS:
        SPECS.append(_res)


for spec in SPECS:
    try:
        gush, helka = [int(x) for x in re.split(r"[/\-]", spec)]
        log(f"=== gush {gush} helka {helka} ===")
        rings = parcel_rings(gush, helka)
        if not rings:
            continue
        signed = 0.0
        for ring in rings:
            s = 0.0
            for i in range(len(ring) - 1):
                x1, y1 = ring[i]
                x2, y2 = ring[i + 1]
                s += x1 * y2 - x2 * y1
            signed += s / 2.0
        area_m2 = abs(signed)
        log(f"   area: {area_m2:.1f} m2 = {area_m2 / 1000:.3f} dunam")

        xs = [p[0] for r0 in rings for p in r0]
        ys = [p[1] for r0 in rings for p in r0]
        minx, maxx, miny, maxy = min(xs) - PAD, max(xs) + PAD, min(ys) - PAD, max(ys) + PAD
        w, h = maxx - minx, maxy - miny
        if w > h:
            c = (miny + maxy) / 2
            miny, maxy = c - w / 2, c + w / 2
        else:
            c = (minx + maxx) / 2
            minx, maxx = c - h / 2, c + h / 2
        lon0, lat0 = to_wgs.transform(minx, miny)
        lon1, lat1 = to_wgs.transform(maxx, maxy)

        with open(os.path.join(OUT, f"geo_{gush}_{helka}.json"), "w",
                  encoding="utf-8") as fh:
            json.dump({"gush": gush, "helka": helka, "rings": rings,
                       "bbox_itm": [minx, miny, maxx, maxy], "size_px": SIZE,
                       "area_m2": area_m2}, fh)

        base = aerial(lon0, lat0, lon1, lat1, maxx - minx)
        if base is None:
            log("NO BASE IMAGERY")
            continue

        def to_px(x, y):
            return ((x - minx) / (maxx - minx) * SIZE,
                    (1 - (y - miny) / (maxy - miny)) * SIZE)

        def stamp(img, label, fill=False):
            d = ImageDraw.Draw(img, "RGBA")
            for ring in rings:
                pts = [to_px(x, y) for x, y in ring]
                if fill:
                    d.polygon(pts, fill=(255, 215, 0, 35))
                d.line(pts + [pts[0]], fill=(255, 215, 0, 255), width=6)
            d.rectangle([20, 20, 20 + 13 * len(label), 70], fill=(0, 0, 0, 170))
            d.text((34, 36), label, fill=(255, 255, 255, 255))
            return img

        plain = stamp(base.copy(), f"Gush {gush} / Helka {helka}")
        name = os.path.join(OUT, f"tza_{gush}_{helka}.png")
        plain.save(name)
        log("wrote", name, os.path.getsize(name))

        ov_all = yeud_overlay(minx, miny, maxx, maxy, approved_only=False)
        if ov_all is not None:
            ov_all.save(os.path.join(OUT, f"overlay_{gush}_{helka}.png"))

        ov = ov_all
        if ov is not None:
            ov.putalpha(ov.getchannel("A").point(lambda v: int(v * 0.5)))
            comp = base.copy().convert("RGBA")
            comp.alpha_composite(ov)
            comp = stamp(comp.convert("RGB"),
                         f"Gush {gush} / Helka {helka} - land use (mavat)")
            name2 = os.path.join(OUT, f"tza_{gush}_{helka}_yeud.png")
            comp.save(name2)
            log("wrote", name2, os.path.getsize(name2))
        else:
            log("no land-use overlay")

        try:
            yeud_breakdown(rings, gush, helka)
        except Exception:  # noqa: BLE001
            log("breakdown failed:", traceback.format_exc()[:900])

        recs = yeud_records(minx, miny, maxx, maxy)
        log("land-use records in view:", len(recs))
        if recs:
            keys = list(recs[0]["attributes"].keys())
            log("   fields:", json.dumps(keys, ensure_ascii=False))
            seen = []
            for f in recs:
                a = f["attributes"]
                row = {k: a.get(k) for k in keys
                       if any(t in k.upper() for t in
                              ("YEUD", "NAME", "PL_", "STATION", "AREA",
                               "NUMBER", "DESC"))}
                if row not in seen:
                    seen.append(row)
            log("   distinct:", json.dumps(seen[:25], ensure_ascii=False))
            with open(os.path.join(OUT, f"zoning_{gush}_{helka}.json"), "w",
                      encoding="utf-8") as fh:
                json.dump([f["attributes"] for f in recs], fh,
                          ensure_ascii=False, indent=1)
    except Exception:  # noqa: BLE001
        log("FAILED", spec, traceback.format_exc()[:1200])

open(os.path.join(OUT, "diag.txt"), "w", encoding="utf-8").write("\n".join(diag))
