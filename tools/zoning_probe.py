"""Find the service behind govmap's "land-use (mavat)" layer.

Dumps the iplan error body and mines govmap's own JS bundles for the map
service URLs it calls. Results land in out/zoning_probe.txt.
"""
import json
import os
import re
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
            ctx.options |= 0x4
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
S.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
})


def get(url, **params):
    try:
        r = S.get(url, params=params or None, timeout=60)
        log("GET", r.status_code, len(r.content), r.url[:230])
        return r
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:220], url[:200])
        return None


log("=== iplan error body ===")
r = get("https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/Xplan/"
        "MapServer", f="json")
if r is not None:
    body = re.sub(r"\s+", " ", r.text)
    log(body[:1800])

log("=== govmap bundles ===")
home = get("https://www.govmap.gov.il/")
srcs = []
if home is not None and home.status_code == 200:
    srcs = re.findall(r'src="([^"]+\.js[^"]*)"', home.text)
    srcs += re.findall(r'href="([^"]+\.js[^"]*)"', home.text)
    log("scripts:", json.dumps(srcs[:40], ensure_ascii=False))

urls = set()
for s in srcs[:25]:
    u = s if s.startswith("http") else "https://www.govmap.gov.il/" + s.lstrip("/")
    rj = get(u)
    if rj is None or rj.status_code != 200:
        continue
    for m in re.findall(r"https?://[A-Za-z0-9_.\-]+/[A-Za-z0-9_/.\-]*"
                        r"(?:MapServer|FeatureServer|geoserver|wms|wfs|api)"
                        r"[A-Za-z0-9_/.\-]*", rj.text):
        urls.add(m)

log("service-ish urls found:", len(urls))
for u in sorted(urls)[:200]:
    log("  ", u)

log("=== direct api guesses ===")
for u in ("https://www.govmap.gov.il/api/layers-catalog/catalog",
          "https://www.govmap.gov.il/api/layers/catalog",
          "https://www.govmap.gov.il/api/layers-catalog/layers",
          "https://www.govmap.gov.il/api/search-service/layers"):
    rr = get(u)
    if rr is not None and rr.status_code == 200:
        log("   body:", rr.text[:1200])

open(os.path.join(OUT, "zoning_probe.txt"), "w",
     encoding="utf-8").write("\n".join(lines))
