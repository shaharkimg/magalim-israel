"""Probe public planning (mavat / iplan) map services and dump what they offer.

Writes out/zoning_probe.txt so the next run can target the right service.
"""
import json
import os

import requests

OUT = "out"
os.makedirs(OUT, exist_ok=True)
lines = []

S = requests.Session()
S.headers.update({"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) "
                                "Chrome/124.0 Safari/537.36"})


def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:4000], flush=True)
    lines.append(s)


def get(url, **params):
    try:
        r = S.get(url, params=params or None, timeout=60)
        log("GET", r.status_code, len(r.content), r.url[:220])
        return r
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:200], url[:200])
        return None


ROOTS = [
    "https://ags.iplan.gov.il/arcgis/rest/services",
    "https://ags.govmap.gov.il/arcgis/rest/services",
    "https://open.govmap.gov.il/geoserver/opendata/wms",
]

for root in ROOTS:
    if root.endswith("wms"):
        r = get(root, service="WMS", version="1.3.0", request="GetCapabilities")
        if r is not None and r.status_code == 200:
            import re
            log("WMS layer names:", json.dumps(
                re.findall(r"<Name>([^<]+)</Name>", r.text)[:200],
                ensure_ascii=False))
        continue
    r = get(root, f="json")
    if r is None or r.status_code != 200:
        continue
    try:
        j = r.json()
    except Exception:  # noqa: BLE001
        continue
    log("folders:", json.dumps(j.get("folders", []), ensure_ascii=False))
    log("services:", json.dumps(
        [s.get("name") for s in j.get("services", [])], ensure_ascii=False))
    for folder in j.get("folders", [])[:20]:
        r2 = get(f"{root}/{folder}", f="json")
        if r2 is None or r2.status_code != 200:
            continue
        try:
            j2 = r2.json()
        except Exception:  # noqa: BLE001
            continue
        svcs = [s.get("name") for s in j2.get("services", [])]
        log(f"  {folder} services:", json.dumps(svcs, ensure_ascii=False))
        for name in svcs:
            if not any(k in name.lower() for k in
                       ("xplan", "plan", "mavat", "taba", "zoning", "yeud")):
                continue
            r3 = get(f"{root}/{name}/MapServer", f="json")
            if r3 is None or r3.status_code != 200:
                continue
            try:
                j3 = r3.json()
            except Exception:  # noqa: BLE001
                continue
            log(f"    {name} spatialRef:", json.dumps(
                j3.get("spatialReference", {}), ensure_ascii=False))
            for lyr in j3.get("layers", []):
                log(f"    layer {lyr.get('id')}: {lyr.get('name')}")

open(os.path.join(OUT, "zoning_probe.txt"), "w",
     encoding="utf-8").write("\n".join(lines))
