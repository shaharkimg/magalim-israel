"""Probe the govmap open-data cadastral layer: which typeNames resolve, and
what attributes they carry. Layer names come from LAYERS (comma separated)."""
import json, os, re, sys
import requests

WFS = "https://open.govmap.gov.il/geoserver/opendata/wfs"
OUT = os.environ.get("OUTDIR", "out")
os.makedirs(OUT, exist_ok=True)
GUSH = os.environ.get("GUSH", "4774").strip()
HELKA = os.environ.get("HELKA", "20").strip()
BBOX = os.environ.get("BBOX", "160474,588977,161792,590152").strip()
LAYERS = [x.strip() for x in os.environ.get("LAYERS", "").split(",") if x.strip()] or [
    "parcel_all",
    "opendata:parcel_all",
    "sub_gush_all",
    "opendata:PARCEL_ALL",
]

lines = []
def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:4000], flush=True); lines.append(s)

UA = os.environ.get("UA", "").strip() or (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.govmap.gov.il/",
    "Origin": "https://www.govmap.gov.il",
    "Connection": "keep-alive",
}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def wfs(params, timeout=180):
    p = {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
         "outputFormat": "application/json", "srsName": "EPSG:2039"}
    p.update(params)
    try:
        r = SESSION.get(WFS, params=p, timeout=timeout)
    except Exception as e:
        log("   ERROR", type(e).__name__, str(e)[:200]); return None
    if r.status_code != 200:
        log("   HTTP", r.status_code,
            "via=", r.headers.get("Via", "-"),
            "x-cache=", r.headers.get("X-Cache", "-"))
        log("   body:", r.text[:200].replace("\n", " "))
        return None
    try:
        return r.json()
    except Exception:
        log("   non-json", r.text[:300]); return None


def rank(names, exact):
    return sorted(names, key=lambda k: (k.upper() != exact, len(k), k))


log("probe UA:", UA[:70])
log("layers to try:", LAYERS)
result = {"gush": GUSH, "helka": HELKA, "layers": {}}

for lyr in LAYERS:
    log("=" * 70); log("LAYER", lyr)
    entry = {"fields": [], "filter_hits": [], "resolved": False}

    js = wfs({"typeNames": lyr, "count": "1"})
    if not js or not js.get("features"):
        log("  no sample feature -> this typeName does not resolve")
        result["layers"][lyr] = entry
        continue

    entry["resolved"] = True
    props = js["features"][0].get("properties", {})
    entry["fields"] = sorted(props.keys())
    log("  RESOLVED. attributes:", json.dumps(entry["fields"], ensure_ascii=False))
    log("  sample row:", json.dumps(props, ensure_ascii=False)[:600])
    log("  geometry type:", (js["features"][0].get("geometry") or {}).get("type"))

    gf = rank([k for k in props if re.search(r"gush", k, re.I)], "GUSH_NUM")
    pf = rank([k for k in props if re.search(r"parcel|helka|chelka", k, re.I)],
              "PARCEL")
    log("  gush fields (ranked):", gf)
    log("  parcel fields (ranked):", pf)

    for g in gf:
        for p in pf:
            for q in ("", "'"):
                cql = f"{g}={q}{GUSH}{q} AND {p}={q}{HELKA}{q}"
                js2 = wfs({"typeNames": lyr, "count": "5", "CQL_FILTER": cql})
                feats = (js2 or {}).get("features", [])
                log(f"   try {cql} -> {len(feats)}")
                if feats:
                    entry["filter_hits"].append({"cql": cql, "n": len(feats)})
                    pr = feats[0].get("properties", {})
                    gm = feats[0].get("geometry") or {}
                    log("      HIT props:", json.dumps(pr, ensure_ascii=False)[:500])
                    log("      HIT geometry:", gm.get("type"),
                        "rings:", len(gm.get("coordinates") or []))

    result["layers"][lyr] = entry

with open(os.path.join(OUT, "parcel_layers.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines) + "\n")
with open(os.path.join(OUT, "parcel_layers.json"), "w", encoding="utf-8") as fh:
    json.dump(result, fh, ensure_ascii=False, indent=1)
print("wrote", os.path.join(OUT, "parcel_layers.txt"))
