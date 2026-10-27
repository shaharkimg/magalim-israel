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
LAYERS = ["opendata:PARCEL_ALL", "opendata:Parcels_ITM"]

lines = []
def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:4000], flush=True); lines.append(s)

def wfs(params, timeout=180):
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

def rank(names, exact):
    # an exact field name wins; otherwise shortest name first
    return sorted(names, key=lambda k: (k.upper() != exact, len(k), k))

result = {"gush": GUSH, "helka": HELKA, "layers": {}}

for lyr in LAYERS:
    log("=" * 70); log("LAYER", lyr)
    entry = {"fields": [], "filter_hits": [], "bbox_matches": []}

    js = wfs({"typeNames": lyr, "count": "1"})
    if not js or not js.get("features"):
        log("  no sample feature"); result["layers"][lyr] = entry; continue
    props = js["features"][0].get("properties", {})
    entry["fields"] = sorted(props.keys())

    gf = rank([k for k in props if re.search(r"gush", k, re.I)], "GUSH_NUM")
    pf = rank([k for k in props if re.search(r"parcel|helka|chelka", k, re.I)],
              "PARCEL")
    log("  gush fields (ranked):", gf)
    log("  parcel fields (ranked):", pf)

    # direct filter, every plausible pairing
    for g in gf:
        for p in pf:
            for q in ("", "'"):
                cql = f"{g}={q}{GUSH}{q} AND {p}={q}{HELKA}{q}"
                js2 = wfs({"typeNames": lyr, "count": "5", "CQL_FILTER": cql})
                n = len(js2.get("features", [])) if js2 else 0
                log("   try", cql, "->", n)
                if n:
                    entry["filter_hits"].append(
                        {"cql": cql, "n": n,
                         "properties": js2["features"][0].get("properties", {})})

    # enumerate every parcel of the target gush, by attribute not bbox
    allp = {}
    for g in gf[:1]:
        js4 = wfs({"typeNames": lyr, "count": "5000",
                   "CQL_FILTER": f"{g}={GUSH}"})
        for ft in (js4 or {}).get("features", []):
            pr = ft.get("properties", {})
            pv = pr.get(pf[0]) if pf else None
            if pv is None:
                continue
            allp[str(pv)] = {"legal_area": pr.get("LEGAL_AREA"),
                             "shape_area": pr.get("SHAPE_AREA"),
                             "locality": pr.get("LOCALITY_N"),
                             "status": pr.get("STATUS_TEX")}
    log(f"  gush {GUSH}: {len(allp)} parcels in this layer")
    log("  helkot:", ", ".join(sorted(allp, key=lambda s: (len(s), s))))
    if HELKA in allp:
        log("  *** HELKA", HELKA, "IS PRESENT:", json.dumps(allp[HELKA], ensure_ascii=False))
    else:
        log("  *** HELKA", HELKA, "ABSENT from this layer")
    # nearest numeric neighbours, to show the numbering generation
    nums = sorted(int(k) for k in allp if k.isdigit())
    log("  numeric range:", (nums[0], nums[-1]) if nums else None,
        " count:", len(nums))
    entry["parcels"] = allp
    result["layers"][lyr] = entry

with open(os.path.join(OUT, "parcel_layers.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, "parcel_layers.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
log("done")
