"""Probe the national planning map service (iplan / mavat) for land-use layers.

ags.iplan.gov.il needs a relaxed TLS setup (legacy renegotiation, SECLEVEL=1),
so it gets its own adapter here. Results land in out/zoning_probe.txt.
"""
import json
import os
import ssl

import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager

OUT = "out"
os.makedirs(OUT, exist_ok=True)
lines = []


def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:4000], flush=True)
    lines.append(s)


class LegacyTLSAdapter(HTTPAdapter):
    def init_poolmanager(self, connections, maxsize, block=False, **kw):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.minimum_version = ssl.TLSVersion.TLSv1
        try:
            ctx.options |= 0x4  # OP_LEGACY_SERVER_CONNECT
        except Exception:  # noqa: BLE001
            pass
        try:
            ctx.set_ciphers("DEFAULT@SECLEVEL=1")
        except Exception:  # noqa: BLE001
            pass
        self.poolmanager = PoolManager(num_pools=connections, maxsize=maxsize,
                                       block=block, ssl_context=ctx, **kw)


S = requests.Session()
S.mount("https://", LegacyTLSAdapter())
S.headers.update({"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) "
                                "Chrome/124.0 Safari/537.36"})


def get(url, **params):
    try:
        r = S.get(url, params=params or None, timeout=60)
        log("GET", r.status_code, len(r.content), r.url[:230])
        return r
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:220], url[:200])
        return None


CANDIDATES = [
    "https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/Xplan/MapServer",
    "https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/XplanMavat/MapServer",
    "https://ags.iplan.gov.il/arcgis/rest/services",
    "https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic",
]

for url in CANDIDATES:
    r = get(url, f="json")
    if r is None or r.status_code != 200:
        continue
    try:
        j = r.json()
    except Exception:  # noqa: BLE001
        log("  (not json)", r.text[:300])
        continue
    if "folders" in j or "services" in j:
        log("  folders:", json.dumps(j.get("folders", []), ensure_ascii=False))
        log("  services:", json.dumps(
            [s.get("name") for s in j.get("services", [])], ensure_ascii=False))
    if "layers" in j:
        log("  spatialReference:", json.dumps(j.get("spatialReference", {})))
        for lyr in j.get("layers", []):
            log(f"  layer {lyr.get('id')}: {lyr.get('name')}")

open(os.path.join(OUT, "zoning_probe.txt"), "w",
     encoding="utf-8").write("\n".join(lines))
