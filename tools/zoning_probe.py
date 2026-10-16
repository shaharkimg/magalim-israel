"""Mine govmap's app bundle for its layers API routes and the land-use layer id."""
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


def get(url, **kw):
    try:
        r = S.get(url, timeout=90, **kw)
        log("GET", r.status_code, len(r.content), r.url[:220])
        return r
    except Exception as e:  # noqa: BLE001
        log("ERR", type(e).__name__, str(e)[:200], url[:200])
        return None


home = get("https://www.govmap.gov.il/")
src = ""
if home is not None:
    m = re.search(r'src="(/assets/index-[^"]+\.js)"', home.text)
    if m:
        rj = get("https://www.govmap.gov.il" + m.group(1))
        if rj is not None:
            src = rj.text

log("bundle chars:", len(src))

log("=== api route strings ===")
routes = sorted(set(re.findall(r'["\'`](/?api/[A-Za-z0-9_\-/{}.$]{3,80})["\'`]', src)))
for r0 in routes[:120]:
    log("  ", r0)

log("=== context around 'layers-catalog' ===")
for m in list(re.finditer(r"layers-catalog", src))[:6]:
    log("  ...", re.sub(r"\s+", " ", src[max(0, m.start() - 260):m.start() + 260]))

log("=== land-use layer mentions ===")
for kw in ("מבא", "יעודי קרקע", "ייעודי קרקע"):
    for m in list(re.finditer(re.escape(kw), src))[:4]:
        log(f"  [{kw}] ...",
            re.sub(r"\s+", " ", src[max(0, m.start() - 300):m.start() + 300]))

log("=== tile / wmts hosts ===")
hosts = sorted(set(re.findall(r"https?://[A-Za-z0-9_.\-]+", src)))
for h in hosts:
    if any(k in h for k in ("govmap", "mapi", "iplan", "gov.il", "arcgis")):
        log("  ", h)

log("=== try layers api ===")
for u in ("https://www.govmap.gov.il/api/layers-catalog/catalog?lang=he",
          "https://www.govmap.gov.il/api/layers-catalog/catalog?searchText=",
          "https://www.govmap.gov.il/api/layers-catalog/catalog/all",
          "https://www.govmap.gov.il/api/layers-catalog/search?text=%D7%99%D7%A2%D7%95%D7%93%D7%99"):
    rr = get(u)
    if rr is not None:
        log("   body:", rr.text[:1500])

open(os.path.join(OUT, "zoning_probe.txt"), "w",
     encoding="utf-8").write("\n".join(lines))
