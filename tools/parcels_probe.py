"""Probe the MAPI open parcels layer on data.gov.il without downloading it.

The resource is a ~636 MB zipped shapefile. This script reads only the ZIP
central directory and the first bytes of the .dbf and .prj members over HTTP
range requests, so it costs a few hundred KB instead of 636 MB.

It answers the three questions a loader needs settled first:
  1. does data.gov.il serve this file to a GitHub runner at all,
  2. does it support range requests (if not, a loader must stream the lot),
  3. what are the DBF field names and the .prj coordinate system.

Writes out/parcels_probe.txt. Read-only: downloads nothing to keep.
"""
import io
import json
import os
import struct
import sys
import zipfile

import requests

URL = os.environ.get("PARCELS_URL", "")
OUT = "out"
os.makedirs(OUT, exist_ok=True)
LOG = []
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def log(*a):
    line = " ".join(str(x) for x in a)
    print(line, flush=True)
    LOG.append(line)


class RangeFile(io.RawIOBase):
    """Minimal seekable file over HTTP range requests."""

    def __init__(self, url, size):
        self.url = url
        self.size = size
        self.pos = 0
        self.reqs = 0
        self.bytes = 0
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, off, whence=0):
        if whence == 0:
            self.pos = off
        elif whence == 1:
            self.pos += off
        else:
            self.pos = self.size + off
        return self.pos

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.size - self.pos
        if n == 0 or self.pos >= self.size:
            return b""
        end = min(self.pos + n, self.size) - 1
        r = self.s.get(self.url, headers={"Range": f"bytes={self.pos}-{end}"},
                       timeout=120)
        if r.status_code not in (200, 206):
            raise IOError(f"range {self.pos}-{end} -> HTTP {r.status_code}")
        data = r.content
        self.reqs += 1
        self.bytes += len(data)
        self.pos += len(data)
        return data


def dbf_fields(head):
    """Parse field descriptors out of a DBF header."""
    nrec = struct.unpack("<I", head[4:8])[0]
    hlen = struct.unpack("<H", head[8:10])[0]
    rlen = struct.unpack("<H", head[10:12])[0]
    fields = []
    off = 32
    while off + 32 <= len(head) and head[off] != 0x0D:
        raw = head[off:off + 32]
        name = raw[0:11].split(b"\x00")[0].decode("latin-1").strip()
        ftype = chr(raw[11])
        flen = raw[16]
        dec = raw[17]
        fields.append({"name": name, "type": ftype, "len": flen, "dec": dec})
        off += 32
    return nrec, hlen, rlen, fields


def main():
    if not URL:
        log("ERROR: PARCELS_URL not set")
        return 2

    s = requests.Session()
    s.headers["User-Agent"] = UA

    log("=== HEAD ===")
    try:
        h = s.head(URL, timeout=90, allow_redirects=True)
        log("status", h.status_code)
        log("final url", h.url)
        for k in ("Content-Length", "Content-Type", "Accept-Ranges",
                  "Last-Modified", "ETag", "Server"):
            if k in h.headers:
                log(f"{k}: {h.headers[k]}")
    except Exception as e:
        log("HEAD failed:", type(e).__name__, str(e)[:300])
        h = None

    size = int(h.headers.get("Content-Length", 0)) if h is not None else 0

    # Confirm ranges really work: ask for 16 bytes and check we get 206.
    log("=== range support ===")
    try:
        r = s.get(URL, headers={"Range": "bytes=0-15"}, timeout=90)
        log("status", r.status_code, "len", len(r.content),
            "content-range", r.headers.get("Content-Range", "-"))
        log("first bytes", r.content[:4].hex(), "(504b0304 = PK zip)")
        ranges_ok = r.status_code == 206 and len(r.content) == 16
    except Exception as e:
        log("range GET failed:", type(e).__name__, str(e)[:300])
        ranges_ok = False
    log("ranges usable:", ranges_ok)

    if not (ranges_ok and size):
        log("Cannot inspect without a full download. Stopping here on purpose.")
        return 1

    log("=== zip members ===")
    rf = RangeFile(URL, size)
    zf = zipfile.ZipFile(rf)
    members = zf.infolist()
    for m in members:
        log(f"{m.filename}  stored={m.compress_size}  real={m.file_size}  "
            f"method={m.compress_type}")

    # .prj -> coordinate system
    log("=== prj ===")
    for m in members:
        if m.filename.lower().endswith(".prj"):
            log(m.filename, "->", zf.read(m).decode("latin-1", "replace")[:500])

    # .dbf -> field names, via a partial read of the member
    log("=== dbf header ===")
    for m in members:
        if m.filename.lower().endswith(".dbf"):
            with zf.open(m) as fh:
                head = fh.read(4096)
            nrec, hlen, rlen, fields = dbf_fields(head)
            log(m.filename, "records:", nrec, "header_len:", hlen,
                "record_len:", rlen)
            for f in fields:
                log(f"   {f['name']:<12} {f['type']} len={f['len']} dec={f['dec']}")
            log("field names json:",
                json.dumps([f["name"] for f in fields], ensure_ascii=False))

    log("=== cost ===")
    log("range requests:", rf.reqs, "bytes pulled:", rf.bytes,
        f"({rf.bytes / 1e6:.2f} MB of {size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    try:
        rc = main()
    except Exception:
        import traceback
        log("FATAL")
        log(traceback.format_exc()[:3000])
        rc = 1
    with open(os.path.join(OUT, "parcels_probe.txt"), "w",
              encoding="utf-8") as fh:
        fh.write("\n".join(LOG) + "\n")
    sys.exit(0)
