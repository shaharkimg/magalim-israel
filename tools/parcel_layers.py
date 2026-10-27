"""Find a parcel that opendata:PARCEL_ALL does not carry, by trying the
other cadastral layers on the same GeoServer and by enumerating a bbox."""
import json, os, re, sys
import requests

WFS = "https://open.govmap.gov.il/geoserver/opendata/wfs"
OUT = os.environ.get("OUTDIR", "out")
os.makedirs(OUT, exist_ok=True)
GUSH = os.environ.get("GUSH", "100812").strip()
HELKA = os.environ.get("HELKA", "143").strip()
BBOX = os.environ.get("BBOX", "160474,588977,161792,590152").strip()
LAYERS = ["opendata:PARCEL_ALL", "opendata:Parcels_ITM",
          "opendata:nechalim1", "opendata:SUB_GUSH_ALL"]

lines = []
def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:4000], flush=True); lines.append(s)

def wfs(params, timeout=120):
    p = {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
         "outputFormat": "application/json", "srsName": "EPSG:2039"}
    p.update(params)
    try:
        r = requests.get(WFS, params=p, timeout=timeout)
    except Exception as e:
        log("   ERROR", type(e).__name__, str(e)[:200]); return None
    if r.status_code != 200:
        log("   HTTP", r.status_code, r.text[:300]); return None
    try:
        return r.json()
    except Exception:
        log("   non-json", r.text[:300]); return None

result = {"gush": GUSH, "helka": HELKA, "layers": {}}

for lyr in LAYERS:
    log("=" * 70); log("LAYER", lyr)
    entry = {"fields": [], "filter_hits": [], "bbox_matches": []}

    # 1. sample one feature to learn the schema
    js = wfs({"typeNames": lyr, "count": "1"})
    if not js or not js.get("features"):
        log("  no sample feature"); result["layers"][lyr] = entry; continue
    props = js["features"][0].get("properties", {})
    entry["fields"] = sorted(props.keys())
    log("  fields:", ", ".join(entry["fields"]))
    log("  sample:", json.dumps(props, ensure_ascii=False)[:700])

    gf = [k for k in props if re.search(r"gush", k, re.I)]
    pf = [k for k in props if re.search(r"parcel|helka|chelka", k, re.I)]
    log("  gush-like:", gf, " parcel-like:", pf)

    # 2. direct filter on every plausible field pairing
    for g in gf:
        for p in pf:
            for q in ("", "'"):
                cql = f"{g}={q}{GUSH}{q} AND {p}={q}{HELKA}{q}"
                js2 = wfs({"typeNames": lyr, "count": "5", "CQL_FILTER": cql})
                n = len(js2.get("features", [])) if js2 else 0
                if n:
                    log("  HIT", cql, "->", n)
                    entry["filter_hits"].append(
                        {"cql": cql, "n": n,
                         "properties": js2["features"][0].get("properties", {})})

    # 3. enumerate the bbox and look for the helka there
    js3 = wfs({"typeNames": lyr, "count": "3000", "bbox": BBOX + ",EPSG:2039"})
    feats = (js3 or {}).get("features", [])
    log("  bbox features:", len(feats))
    seen = {}
    for ft in feats:
        pr = ft.get("properties", {})
        gv = next((pr.get(k) for k in gf if pr.get(k) not in (None, "")), None)
        pv = next((pr.get(k) for k in pf if pr.get(k) not in (None, "")), None)
        if gv is None:
            continue
        seen.setdefault(str(gv), set()).add(str(pv))
        if str(gv) == GUSH and str(pv) == HELKA:
            entry["bbox_matches"].append(pr)
            log("  BBOX MATCH:", json.dumps(pr, ensure_ascii=False)[:600])
    for gv, pvs in sorted(seen.items()):
        sl = sorted(pvs, key=lambda s: (len(s), s))
        log(f"  gush {gv}: {len(pvs)} parcels ->", ", ".join(sl[:60]))
    entry["bbox_summary"] = {k: sorted(v, key=lambda s: (len(s), s))[:200]
                             for k, v in seen.items()}
    result["layers"][lyr] = entry

with open(os.path.join(OUT, "parcel_layers.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, "parcel_layers.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
log("done")
