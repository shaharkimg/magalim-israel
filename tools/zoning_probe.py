"""Hunt for a public source of approved land-use (mavat) polygons."""
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


class LegacyTLS(HTTPAdapter):
    def init_poolmanager(self, connections, maxsize, block=False, **kw):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.minimum_version = ssl.TLSVersion.TLSv1
        try:
            ctx.options |= 0x4
            ctx.set_ciphers("DEFAULT@SECLEVEL=1")
        except Exception:  # noqa: BLE001
            pass
        self.poolmanager = PoolManager(num_pools=connections, maxsize=maxsize,
                                       block=block, ssl_context=ctx, **kw)


S = requests.Session()
S.mount("https://", LegacyTLS())
S.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) "
                                "Chrome/124.0.0.0 Safari/537.36",
                  "Accept": "*/*"})


def get(url, params=None, label=""):
    try:
        r = S.get(url, params=params, timeout=90)
        log("GET", r.status_code, len(r.content), label or r.url[:200])
        return r
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:180], url[:160])
        return None


log("=== iplan arcgis candidates ===")
IPLAN = [
    "https://ags.iplan.gov.il/arcgis/rest/services",
    "https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/Xplan/MapServer",
    "https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/Xplan20/MapServer",
    "https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/XPLAN/MapServer",
    "https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/Xplan_Report/MapServer",
    "https://gis.iplan.gov.il/arcgis/rest/services",
    "https://services.iplan.gov.il/arcgis/rest/services",
    "https://ags.iplan.gov.il/arcgisiplan/rest/services",
    "https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer",
]
for u in IPLAN:
    r = get(u, {"f": "pjson"})
    if r is None or r.status_code != 200:
        continue
    txt = r.text.lstrip("﻿")
    if not txt.startswith("{"):
        log("   not json:", txt[:120].replace("\n", " "))
        continue
    j = json.loads(txt)
    log("   KEYS:", json.dumps(list(j.keys())[:12]))
    if "folders" in j:
        log("   folders:", json.dumps(j["folders"], ensure_ascii=False))
        log("   services:", json.dumps(
            [s.get("name") for s in j.get("services", [])], ensure_ascii=False))
    if "layers" in j:
        for lyr in j["layers"]:
            log(f"   layer {lyr.get('id')}: {lyr.get('name')}")

log("=== data.gov.il search ===")
for q in ("ייעודי קרקע", "רצף ייעודי קרקע", "מבאת", "תכנון זמין"):
    r = get("https://data.gov.il/api/3/action/package_search",
            {"q": q, "rows": 10}, label=f"ckan:{q}")
    if r is None or r.status_code != 200:
        continue
    try:
        j = r.json()
    except Exception:  # noqa: BLE001
        log("   not json:", r.text[:200])
        continue
    for pkg in j.get("result", {}).get("results", []):
        log("  PKG:", pkg.get("title"), "|", pkg.get("name"))
        for res in pkg.get("resources", [])[:6]:
            log("      RES:", res.get("format"), res.get("name"), res.get("url"))

open(os.path.join(OUT, "zoning_probe.txt"), "w",
     encoding="utf-8").write("\n".join(lines))
