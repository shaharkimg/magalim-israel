# Offline simulator of the OCI CLI for tests/run-oci-sim.sh (evaluates the real JMESPath queries).
import sys, json, os, jmespath
D = os.environ.get("SIM_STATE_DIR") or os.path.dirname(os.path.abspath(__file__)); SF = os.path.join(D, "state.json")
st = json.load(open(SF)) if os.path.exists(SF) else {"instances": [], "vcns": [], "igws": [], "subnets": []}
argv = sys.argv[1:]
open(os.path.join(D, "calls.log"), "a").write(" ".join(argv) + "\n")
def opt(name):
    return argv[argv.index(name) + 1] if name in argv else None
cmd = " ".join(a for a in argv[:4] if not a.startswith("--"))
def out(data):
    q = opt("--query"); res = {"data": data}
    if q: res = jmespath.search(q, res)
    if "--raw-output" in argv and isinstance(res, str): print(res)
    else: print(json.dumps(res, indent=4) if res is not None else "")
    json.dump(st, open(SF, "w"))
if cmd.startswith("iam region-subscription list"):
    out([{"region-name": "il-jerusalem-1", "is-home-region": False}, {"region-name": "eu-frankfurt-1", "is-home-region": True}])
elif cmd.startswith("compute instance list-vnics"):
    out([{"public-ip": "203.0.113.10", "private-ip": "10.0.0.2"}])
elif cmd.startswith("compute instance list"):
    out([i for i in st["instances"] if i["display-name"] == opt("--display-name")])
elif cmd.startswith("network vcn list"):
    out(st["vcns"])
elif cmd.startswith("network vcn create"):
    v = {"id": "ocid1.vcn.oc1.test", "display-name": opt("--display-name")}; st["vcns"].append(v); out(v)
elif cmd.startswith("network vcn get"):
    out({"id": opt("--vcn-id"), "default-route-table-id": "ocid1.routetable.oc1.test"})
elif cmd.startswith("network internet-gateway list"):
    out(st["igws"])
elif cmd.startswith("network internet-gateway create"):
    g = {"id": "ocid1.internetgateway.oc1.test"}; st["igws"].append(g); out(g)
elif cmd.startswith("network route-table update"):
    rules = json.loads(opt("--route-rules")); assert rules[0]["networkEntityId"].startswith("ocid1.internetgateway"); out({"id": opt("--rt-id")})
elif cmd.startswith("network subnet list"):
    out(st["subnets"])
elif cmd.startswith("network subnet create"):
    s = {"id": "ocid1.subnet.oc1.test"}; st["subnets"].append(s); out(s)
elif cmd.startswith("compute image list"):
    out([{"id": "ocid1.image.minimal", "display-name": "Canonical-Ubuntu-24.04-Minimal-aarch64-2026.10.01-0"},
         {"id": "ocid1.image.standard", "display-name": "Canonical-Ubuntu-24.04-aarch64-2026.10.01-0"}])
elif cmd.startswith("iam availability-domain list"):
    out([{"name": "Uocm:EU-FRANKFURT-1-AD-1"}, {"name": "Uocm:EU-FRANKFURT-1-AD-2"}, {"name": "Uocm:EU-FRANKFURT-1-AD-3"}])
elif cmd.startswith("compute instance launch"):
    if os.environ.get("SIM_NO_CAPACITY") or opt("--availability-domain").endswith("AD-1"):
        print('ServiceError:\n{"code": "InternalError", "message": "Out of host capacity.", "status": 500}', file=sys.stderr); sys.exit(1)
    sc = json.loads(opt("--shape-config")); ud = open(opt("--user-data-file")).read(); key = open(opt("--ssh-authorized-keys-file")).read()
    assert sc == {"ocpus": 1, "memoryInGBs": 4}, sc
    assert ud.startswith("#cloud-config") and "openclaw-install" in ud
    assert key.startswith("ssh-ed25519 ")
    assert opt("--image-id") == "ocid1.image.standard" and opt("--assign-public-ip") == "true"
    i = {"id": "ocid1.instance.oc1.eu-frankfurt-1.test", "display-name": opt("--display-name"), "lifecycle-state": "RUNNING"}
    st["instances"].append(i)
    print('Action completed. Waiting until the resource has entered state: (\'RUNNING\',)', file=sys.stderr); out(i)
else:
    print("SIM: unhandled " + cmd, file=sys.stderr); sys.exit(2)
