"""Call the official GovMap JS API in a headless browser and dump the result."""
import json
import os
import threading
import http.server
import socketserver

from playwright.sync_api import sync_playwright

OUT = os.environ.get("OUTDIR", "out")
os.makedirs(OUT, exist_ok=True)
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "govmap_web")
GX = float(os.environ.get("GX", "160890"))
GY = float(os.environ.get("GY", "589470"))
RADIUS = float(os.environ.get("RADIUS", "200"))
TOKEN = os.environ.get("GOVMAP_TOKEN", "")
PORT = 8765

lines = []


def log(*a):
    s = " ".join(str(x) for x in a)
    print(s[:3000], flush=True)
    lines.append(s)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def log_message(self, *a):
        pass


srv = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
log(f"serving {HERE} on :{PORT}")

with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--no-sandbox"])
    pg = b.new_page()
    pg.on("console", lambda m: log("  console:", m.type, m.text[:300]))
    pg.on("pageerror", lambda e: log("  pageerror:", str(e)[:300]))
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load", timeout=60000)
    pg.wait_for_timeout(5000)
    log("govmap defined:", pg.evaluate("typeof window.govmap"))
    pg.evaluate("([x,y,r,t]) => window.runProbe(x,y,r,t)", [GX, GY, RADIUS, TOKEN])
    for _ in range(40):
        if pg.evaluate("window.__done"):
            break
        pg.wait_for_timeout(1000)
    for ln in pg.evaluate("window.__log") or []:
        log("  page:", ln)
    res = pg.evaluate("window.__result")
    log("result:", json.dumps(res, ensure_ascii=False)[:4000] if res else "None")
    if res:
        with open(os.path.join(OUT, "govmap_layerdata.json"), "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
    b.close()

srv.shutdown()
with open(os.path.join(OUT, "govmap_api.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
log("done")
