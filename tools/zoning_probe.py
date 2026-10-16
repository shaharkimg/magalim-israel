"""Enumerate govmap's proxied GeoServer and find the land-use (mavat) layer."""
import json
import os
import re

import requests

OUT = "out"
os.makedirs(OUT, exist_ok=True)
lines = []


def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:4000], flush=True)
    lines.append(s)


S = requests.Session()
S.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
    "Referer": "https://www.govmap.gov.il/",
})

BASES = [
    "https://www.govmap.gov.il/api/geoserver/wms",
    "https://www.govmap.gov.il/api/geoserver/multi/wms",
    "https://www.govmap.gov.il/api/geoserver/govmap/wms",
    "https://open.govmap.gov.il/geoserver/wms",
]

KEYS = ("יעוד", "ייעוד", "mavat", "mba", "taba", "tba", "zoning", "plan")

for base in BASES:
    try:
        r = S.get(base, params={"service": "WMS", "version": "1.3.0",
                                "request": "GetCapabilities"}, timeout=120)
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:160], base)
        continue
    log("GET", r.status_code, len(r.content), r.url[:200])
    if r.status_code != 200 or "<" not in r.text[:200]:
        log("   body:", r.text[:300])
        continue
    fname = os.path.join(OUT, "caps_" + re.sub(r"\W+", "_", base)[-60:] + ".xml")
    open(fname, "w", encoding="utf-8").write(r.text[:3000000])
    # pair each <Name> with the following <Title> inside <Layer> blocks
    pairs = re.findall(r"<Name>([^<]+)</Name>\s*<Title>([^<]*)</Title>", r.text)
    log("   layers:", len(pairs))
    hits = [(n, t) for n, t in pairs
            if any(k in n.lower() or k in t.lower() for k in KEYS)]
    log("   matching layers:", json.dumps(hits[:60], ensure_ascii=False))
    log("   first 60 names:", json.dumps([n for n, _ in pairs[:60]],
                                         ensure_ascii=False))

open(os.path.join(OUT, "zoning_probe.txt"), "w",
     encoding="utf-8").write("\n".join(lines))
