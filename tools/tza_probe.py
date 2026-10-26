"""Find the cadastral parcel for a named plan, and list the parcels in a gush.

Writes out/probe.json. Reuses the session/TLS setup of tza_export.py.
"""
import json
import os

from tza_export import S, XPLAN, YEUD_LAYER, get, log, OUT  # noqa: F401

PLAN = os.environ.get("PLAN", "651-0484089")
GUSH = os.environ.get("PROBE_GUSH", "100805")

res = {"plan": PLAN, "gush": GUSH}

# 1. all parcels in the gush
r = get("https://open.govmap.gov.il/geoserver/opendata/wfs",
        {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
         "typeNames": "opendata:PARCEL_ALL", "outputFormat": "application/json",
         "srsName": "EPSG:2039", "count": "400",
         "CQL_FILTER": f"GUSH_NUM={GUSH}"})
parcels = []
if r is not None and r.status_code == 200:
    for f in r.json().get("features", []):
        p = f.get("properties", {})
        parcels.append({"helka": p.get("PARCEL"),
                        "legal_area": p.get("LEGAL_AREA"),
                        "locality": p.get("LOCALITY_N")})
    parcels.sort(key=lambda d: (d["helka"] is None, d["helka"]))
res["parcels_in_gush"] = parcels
log(f"{len(parcels)} parcels in gush {GUSH}")

# 2. geometry of the plan, then which parcel contains its centroid
try:
    rr = S.post(f"{XPLAN}/{YEUD_LAYER}/query", timeout=120, data={
        "where": f"pl_number='{PLAN}'", "outFields": "*", "outSR": "2039",
        "returnGeometry": "true", "f": "geojson"})
    log("POST", rr.status_code, len(rr.content), "plan geometry query")
    feats = rr.json().get("features", []) if rr.status_code == 200 else []
except Exception as e:  # noqa: BLE001
    log("ERR", type(e).__name__, str(e)[:200])
    feats = []

res["plan_parts"] = []
if feats:
    from shapely.geometry import shape
    from shapely.ops import unary_union
    geoms = []
    for f in feats:
        if not f.get("geometry"):
            continue
        try:
            g = shape(f["geometry"]).buffer(0)
        except Exception:  # noqa: BLE001
            continue
        geoms.append(g)
        p = f.get("properties", {})
        res["plan_parts"].append({"pl_name": p.get("pl_name"),
                                  "yeud": p.get("mavat_name"),
                                  "status": p.get("station_desc"),
                                  "m2": round(g.area, 1)})
    if geoms:
        u = unary_union(geoms)
        c = u.representative_point()
        res["plan_centroid_itm"] = [round(c.x, 2), round(c.y, 2)]
        res["plan_total_m2"] = round(u.area, 1)
        log("plan centroid ITM", c.x, c.y, "total m2", u.area)
        import tza_export as T
        res["resolved"] = T.resolve_point(f"{c.x},{c.y}")
        log("plan sits in parcel:", res["resolved"])

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "probe.json"), "w", encoding="utf-8") as fh:
    json.dump(res, fh, ensure_ascii=False, indent=1)
log("probe done")
