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
            "server=", r.headers.get("Server", "-"),
            "via=", r.headers.get("Via", "-"),
            "x-cache=", r.headers.get("X-Cache", "-"),
            "x-amz-cf-id=", r.headers.get("X-Amz-Cf-Id", "-")[:40])
        log("   body:", r.text[:200].replace("\n", " "))
        return None
    try:
        return r.json()
    except Exception:
        log("   non-json", r.text[:300]); return None

def rank(names, exact):
    # an exact field name wins; otherwise shortest name first
    return sorted(names, key=lambda k: (k.upper() != exact, len(k), k))

log("probe UA:", UA[:70])
result = {"gush": GUSH, "helka": HELKA, "layers": {}}

for lyr in LAYERS:
    log("=" * 70); log("LAYER", lyr)
    entry = {"fields": [], "filter_hits": [], "bbox_matches": []}

    js = wfs({"typeNames": lyr, "count": "1"})
    if not js or not js.get("features"):
        log("  no sample feature")
        result["layers"][lyr] = entry
        continue

    props = js["features"][0].get("properties", {})
    entry["fields"] = sorted(props.keys())
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
                n = len(js2.get("features", [])) if js2 else 0
                log(f"   try {cql} -> {n}")
                if n:
                    entry["filter_hits"].append({"cql": cql, "n": n})

    allp = {}
    for g in gf[:1]:
        js4 = wfs({"typeNames": lyr, "count": "5000",
                   "CQL_FILTER": f"{g}={GUSH}"})
        for f in (js4 or {}).get("features", []):
            pr = f.get("properties", {})
            for p in pf:
                if pr.get(p) is not None:
                    allp[str(pr[p])] = {k: pr.get(k) for k in
                                        ("PARCEL", "LEGAL_AREA", "STATUS_TEX",
                                         "LOCALITY_N")}
                    break

    log(f"  gush {GUSH}: {len(allp)} parcels in this layer")
    log("  helkot:", ", ".join(sorted(allp, key=lambda x: (len(x), x))))
    if HELKA in allp:
        log("  *** HELKA", HELKA, "IS PRESENT:", json.dumps(allp[HELKA], ensure_ascii=False))
    else:
        log("  *** HELKA", HELKA, "ABSENT from this layer")
    nums = sorted(int(x) for x in allp if x.isdigit())
    if nums:
        log("  numeric range:", (nums[0], nums[-1]), " count:", len(nums))
    entry["parcels"] = allp
    result["layers"][lyr] = entry

with open(os.path.join(OUT, "parcel_layers.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines) + "\n")
with open(os.path.join(OUT, "parcel_layers.json"), "w", encoding="utf-8") as fh:
    json.dump(result, fh, ensure_ascii=False, indent=1)
print("wrote", os.path.join(OUT, "parcel_layers.txt"))
