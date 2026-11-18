"""Work out how to ask the re-platformed govmap open-data layer for one
parcel. The layer resolves as lowercase parcel_all; what is unsettled is
which attributes hold gush/helka and whether CQL_FILTER works at all."""
import json, os, re, time
import requests

WFS = "https://open.govmap.gov.il/geoserver/opendata/wfs"
OUT = os.environ.get("OUTDIR", "out")
os.makedirs(OUT, exist_ok=True)
GUSH = os.environ.get("GUSH", "4774").strip()
HELKA = os.environ.get("HELKA", "20").strip()
LAYER = os.environ.get("LAYER", "parcel_all").strip()

lines = []
def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:4000], flush=True); lines.append(s)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": UA,
    "Accept": "application/json,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.govmap.gov.il/",
    "Connection": "keep-alive",
})


def ask(label, params, tries=2):
    """One WFS call, retried once, reporting what actually came back."""
    p = {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
         "outputFormat": "application/json", "srsName": "EPSG:2039",
         "typeNames": LAYER}
    p.update(params)
    for attempt in range(1, tries + 1):
        try:
            r = SESSION.get(WFS, params=p, timeout=180)
        except Exception as e:
            log(f"  {label}: ERROR {type(e).__name__} {str(e)[:150]}")
            time.sleep(2)
            continue
        body = r.text or ""
        if r.status_code != 200:
            kind = "html" if body.lstrip()[:9].lower().startswith("<!doctype") else "other"
            log(f"  {label}: HTTP {r.status_code} ({kind}) try{attempt} "
                f"len={len(r.content)} :: {body[:120].replace(chr(10), ' ')}")
            time.sleep(2)
            continue
        if not body.strip():
            log(f"  {label}: HTTP 200 EMPTY BODY try{attempt}")
            time.sleep(2)
            continue
        try:
            js = r.json()
        except Exception:
            log(f"  {label}: HTTP 200 non-json try{attempt} :: {body[:120]}")
            time.sleep(2)
            continue
        feats = js.get("features") or []
        log(f"  {label}: OK {len(feats)} feature(s)")
        if feats:
            pr = feats[0].get("properties", {})
            gm = feats[0].get("geometry") or {}
            keep = {k: pr.get(k) for k in
                    ("blocknumber", "parcelnumber", "gush_num", "parcel",
                     "subblocknumber", "legal_area", "statedarea",
                     "shape_area", "landtypedesc", "status_text",
                     "blockname", "name")}
            log("     props:", json.dumps(keep, ensure_ascii=False))
            log("     geom:", gm.get("type"),
                "rings:", len(gm.get("coordinates") or []))
        return feats
    return None


log(f"layer={LAYER} gush={GUSH} helka={HELKA}")

log("=" * 70)
log("1. does the layer answer an unfiltered request")
ask("count=1, no filter", {"count": "1"})

log("=" * 70)
log("2. does CQL_FILTER work at all (filter on objectid)")
ask("CQL objectid=1", {"count": "1", "CQL_FILTER": "objectid=1"})

log("=" * 70)
log("3. which attribute pair holds gush/helka")
for g in ("blocknumber", "gush_num"):
    for p in ("parcelnumber", "parcel"):
        ask(f"CQL {g}={GUSH} AND {p}={HELKA}",
            {"count": "5", "CQL_FILTER": f"{g}={GUSH} AND {p}={HELKA}"})

log("=" * 70)
log("4. gush only, to see the parcel numbering in that block")
feats = ask(f"CQL blocknumber={GUSH}",
            {"count": "2000", "CQL_FILTER": f"blocknumber={GUSH}"})
if feats:
    nums = sorted({f.get("properties", {}).get("parcelnumber")
                   for f in feats if f.get("properties", {}).get("parcelnumber")
                   is not None})
    log("  parcelnumbers in block:", nums[:120])
    log("  helka", HELKA, "present:", int(HELKA) in nums)

log("=" * 70)
log("5. alternatives, in case CQL stays blocked")
ask("OGC filter param",
    {"count": "5",
     "filter": ("<Filter><And>"
                f"<PropertyIsEqualTo><PropertyName>blocknumber</PropertyName>"
                f"<Literal>{GUSH}</Literal></PropertyIsEqualTo>"
                f"<PropertyIsEqualTo><PropertyName>parcelnumber</PropertyName>"
                f"<Literal>{HELKA}</Literal></PropertyIsEqualTo>"
                "</And></Filter>")})
ask("WFS 1.1.0 + CQL",
    {"version": "1.1.0", "count": "5", "maxFeatures": "5",
     "CQL_FILTER": f"blocknumber={GUSH} AND parcelnumber={HELKA}"})
ask("typeName (singular) + CQL",
    {"count": "5", "typeName": LAYER,
     "CQL_FILTER": f"blocknumber={GUSH} AND parcelnumber={HELKA}"})

with open(os.path.join(OUT, "parcel_layers.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines) + "\n")
print("wrote", os.path.join(OUT, "parcel_layers.txt"))
