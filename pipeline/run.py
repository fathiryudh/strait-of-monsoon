"""Through the Haze pipeline: NISAR L2 GCOV -> HV dB overlays, change maps, polygon stats -> Supabase.

uv run python run.py          # search + fetch + render all AOIs, write out/manifest.json, copy to web/public/overlays
uv run python run.py upload   # upload out/ PNGs + rows to Supabase (needs SUPABASE_SECRET_KEY in ../.env.local)
uv run python run.py web      # only copy out/ to web/public/overlays
"""
import json
import shutil
import sys
import time
import zlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import asf_search as asf
import fsspec
import h5py
import numpy as np
import requests
from matplotlib import colormaps
from matplotlib.path import Path as MPath
from PIL import Image
from pyproj import Transformer
from scipy.ndimage import label, uniform_filter

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
CACHE = ROOT / "data" / "raw"
WEB = ROOT.parent / "web" / "public" / "overlays"
GRID = "/science/LSAR/GCOV/grids/frequencyA"  # 10 m posting
LOOKS = 4  # 4x4 boxcar in linear power: 10 m -> 40 m, also cuts speckle
HV_RANGE = (-30.0, -5.0)
CHANGE_MAX, CHANGE_MIN = 6.0, 3.0
WATER_DB = -21.0  # median HV over all dates below this = open water, masked in change maps
MIN_BLOB_PX = 50  # drop change blobs under 50 px (8 ha at 40 m): mostly ships moving between anchorage slots

AOIS = {
    "sg_reclaim": dict(
        bounds=[103.55, 1.15, 104.10, 1.65],
        stack=dict(relativeOrbit=11, frame=2, flightDirection="ASCENDING"),
        dates=("2026-07-08", "2026-11-05"),
        polys={
            # placed by eye on the 2026-07-08 HV image (graticule overlay)
            "tuas": ("Tuas Port reclamation (dyked basin)", [(103.612, 1.222), (103.640, 1.222), (103.640, 1.245), (103.612, 1.245)]),
            "tekong": ("Pulau Tekong polder", [(104.008, 1.412), (104.035, 1.412), (104.035, 1.437), (104.008, 1.437)]),
            "johor_plantation": ("Johor plantation/forest", [(103.845, 1.620), (103.875, 1.620), (103.875, 1.645), (103.845, 1.645)]),
            "ubin": ("Pulau Ubin mangrove/forest", [(103.945, 1.411), (103.980, 1.411), (103.980, 1.420), (103.945, 1.420)]),
        },
    ),
    "riau": dict(
        # Giam Siak Kecil-Bukit Batu peat dome + Sungai Pakning coast (Bengkalis/Siak). Known peat-fire area;
        # 2026 hotspots NOT checked (FIRMS needs a MAP_KEY).
        bounds=[101.70, 1.00, 102.20, 1.50],
        stack=dict(relativeOrbit=112, frame=2, flightDirection="ASCENDING"),
        dates=("2026-07-03", "2026-10-31"),
        # placed by eye on the 2026-07-03 -> 10-19 change map; cause of HV loss (harvest vs burn) not verified
        polys={
            "peat_forest": ("Intact peat swamp forest (GSK-BB core)", [(101.78, 1.18), (101.86, 1.18), (101.86, 1.26), (101.78, 1.26)]),
            "loss_block": ("Plantation block, HV loss (clearing or burn)", [(102.003, 1.287), (102.018, 1.287), (102.018, 1.306), (102.003, 1.306)]),
            "loss_river": ("Riverside patches, HV loss", [(102.095, 1.140), (102.115, 1.140), (102.115, 1.165), (102.095, 1.165)]),
            "regrowth": ("Plantation block, HV gain (regrowth)", [(101.950, 1.320), (101.980, 1.320), (101.980, 1.345), (101.950, 1.345)]),
        },
    ),
}


def search(aoi):
    a = AOIS[aoi]
    w, s, e, n = a["bounds"]
    wkt = f"POLYGON(({w} {s},{e} {s},{e} {n},{w} {n},{w} {s}))"
    out = {}
    for maturity in ("PROVISIONAL", "VALIDATED"):
        res = asf.search(dataset="NISAR", processingLevel="GCOV", productionConfiguration=["PR"], dataMaturity=maturity,
                         intersectsWith=wkt, start=a["dates"][0], end=a["dates"][1] + "T23:59:59Z", **a["stack"])
        for g in res:
            date = g.properties["startTime"][:10]
            h5 = [u for u in g.find_urls(extension=".h5") if "QA_STATS" not in u]
            prev = out.get(date)
            if h5 and (prev is None or g.properties["sceneName"] > prev["granule"]):  # keep latest product counter
                out[date] = dict(date=date, maturity=maturity, granule=g.properties["sceneName"], url=h5[0])
    picked = [out[d] for d in sorted(out) if "pick" not in a or d in a["pick"]]
    assert picked, f"no granules for {aoi}"
    return picked


def _get(url, off, size):
    for attempt in range(4):
        try:
            r = requests.get(url, headers={"Range": f"bytes={off}-{off + size - 1}"}, timeout=120)
            r.raise_for_status()
            assert len(r.content) == size, "short read"
            return r.content
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def decode_chunk(buf, shape):
    """HDF5 deflate + 4-byte shuffle filter -> float32 array."""
    return np.frombuffer(zlib.decompress(buf), np.uint8).reshape(4, -1).T.copy().view("<f4").reshape(shape)


def selftest():
    import io
    a = np.random.default_rng(0).random((64, 64), np.float32)
    bio = io.BytesIO()
    with h5py.File(bio, "w") as h:
        h.create_dataset("x", data=a, chunks=(32, 32), shuffle=True, compression="gzip")
    with h5py.File(bio, "r") as h:
        _, buf = h["x"].id.read_direct_chunk((32, 0))
    assert np.array_equal(decode_chunk(buf, (32, 32)), a[32:, :32])
    print("selftest ok")


def read_clip(url, bounds, pol="HVHV"):
    """Fetch only the HDF5 chunks covering bounds; returns (linear power, x centers, y centers, epsg)."""
    # netrc auth via EDL redirect chain, ending at a presigned CloudFront URL we can range-read without auth
    signed = requests.get(url, headers={"Range": "bytes=0-0"}, timeout=120).url
    with fsspec.filesystem("http").open(signed, "rb", block_size=2**21, cache_type="blockcache") as f, h5py.File(f, "r") as h:
        g = h[GRID]
        ds = g[pol]
        epsg = int(g["projection"].attrs["epsg_code"])
        x, y = g["xCoordinates"][:], g["yCoordinates"][:]
        dcpl = ds.id.get_create_plist()
        filters = [dcpl.get_filter(i)[0] for i in range(dcpl.get_nfilters())]
        assert filters == [2, 1] and ds.dtype == np.dtype("<f4"), (filters, ds.dtype)  # shuffle + deflate, float32 LE
        ch = ds.chunks
        w, s, e, n = bounds
        lon, lat = np.meshgrid(np.linspace(w, e, 21), np.linspace(s, n, 21))
        px, py = Transformer.from_crs(4326, epsg, always_xy=True).transform(lon, lat)
        c0, c1 = max(np.searchsorted(x, px.min()) - 1, 0), min(np.searchsorted(x, px.max()) + 1, len(x))
        r0, r1 = max(np.searchsorted(-y, -py.max()) - 1, 0), min(np.searchsorted(-y, -py.min()) + 1, len(y))
        cr = range(r0 // ch[0], (r1 - 1) // ch[0] + 1)
        cc = range(c0 // ch[1], (c1 - 1) // ch[1] + 1)
        infos = [(i, j, ds.id.get_chunk_info_by_coord((i * ch[0], j * ch[1]))) for i in cr for j in cc]

    def fetch(item):
        i, j, info = item
        if info.byte_offset is None:  # unallocated chunk = fill
            return i, j, None
        assert info.filter_mask == 0
        return i, j, decode_chunk(_get(signed, info.byte_offset, info.size), ch)

    mosaic = np.full((len(cr) * ch[0], len(cc) * ch[1]), np.nan, np.float32)
    with ThreadPoolExecutor(16) as ex:
        for i, j, arr in ex.map(fetch, infos):
            if arr is not None:
                mosaic[(i - cr[0]) * ch[0]:(i - cr[0] + 1) * ch[0], (j - cc[0]) * ch[1]:(j - cc[0] + 1) * ch[1]] = arr
    ro, co = cr[0] * ch[0], cc[0] * ch[1]
    return mosaic[r0 - ro:r1 - ro, c0 - co:c1 - co], x[c0:c1], y[r0:r1], epsg


def multilook(a, x, y, k=LOOKS):
    a = np.where(a > 0, a, np.nan)
    H, W = a.shape[0] // k * k, a.shape[1] // k * k
    with np.errstate(all="ignore"):
        m = np.nanmean(a[:H, :W].reshape(H // k, k, W // k, k), axis=(1, 3))
    return m, x[:W].reshape(-1, k).mean(1), y[:H].reshape(-1, k).mean(1)


def to_latlon(a, x, y, epsg, bounds):
    """Nearest-neighbour resample of a projected grid onto a regular EPSG:4326 grid exactly spanning bounds."""
    w, s, e, n = bounds
    res = (x[1] - x[0]) / 111320.0
    W, H = round((e - w) / res), round((n - s) / res)
    lon = w + (np.arange(W) + 0.5) * (e - w) / W
    lat = n - (np.arange(H) + 0.5) * (n - s) / H
    LON, LAT = np.meshgrid(lon, lat)
    X, Y = Transformer.from_crs(4326, epsg, always_xy=True).transform(LON, LAT)
    ci = np.rint((X - x[0]) / (x[1] - x[0])).astype(int)
    ri = np.rint((Y - y[0]) / (y[1] - y[0])).astype(int)
    ok = (ci >= 0) & (ci < a.shape[1]) & (ri >= 0) & (ri < a.shape[0])
    out = np.full((H, W), np.nan, np.float32)
    out[ok] = a[ri[ok], ci[ok]]
    return out, lon, lat


def db(a):
    with np.errstate(all="ignore"):
        return 10 * np.log10(a)


def save_rgba(rgba, path):
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)
    assert path.stat().st_size < 2.5e6, f"{path} too big"


GRAY_LEVELS = 128  # 0.2 dB steps; speckle makes 256-level PNGs too big (>1.8 MB)


def hv_png(lin, path):
    """Palette PNG: index 0 transparent (nodata), 1..GRAY_LEVELS = black..white over HV_RANGE dB."""
    d = db(lin)
    v = np.nan_to_num(np.clip((d - HV_RANGE[0]) / (HV_RANGE[1] - HV_RANGE[0]), 0, 1))
    q = (np.rint(v * (GRAY_LEVELS - 1)) + 1).astype(np.uint8)
    q[np.isnan(d)] = 0
    im = Image.fromarray(q, "P")
    im.putpalette([0, 0, 0] + [round(i * 255 / (GRAY_LEVELS - 1)) for i in range(GRAY_LEVELS) for _ in range(3)])
    im.save(path, optimize=True, transparency=0)
    assert path.stat().st_size < 2.5e6, f"{path} too big"


def smooth(lin, k=3):
    """NaN-aware k x k mean in linear power (extra speckle suppression for the change map only)."""
    ok = np.isfinite(lin)
    num = uniform_filter(np.where(ok, lin, 0), k)
    den = uniform_filter(ok.astype(np.float32), k)
    with np.errstate(all="ignore"):
        return np.where(den > 0.5, num / den, np.nan)


def change_png(lin_from, lin_to, water, path):
    d = db(smooth(lin_to)) - db(smooth(lin_from))
    d[water] = np.nan
    with np.errstate(invalid="ignore"):
        for sign in (1, -1):
            lab, _ = label(sign * d >= CHANGE_MIN)
            small = np.bincount(lab.ravel()) < MIN_BLOB_PX
            small[0] = False
            d[small[lab]] = np.nan
    rgba = (colormaps["RdBu"](np.nan_to_num(np.clip((d + CHANGE_MAX) / (2 * CHANGE_MAX), 0, 1))) * 255).astype(np.uint8)
    with np.errstate(invalid="ignore"):
        rgba[np.isnan(d) | (np.abs(d) < CHANGE_MIN)] = 0  # zero RGB too, so transparent areas compress
    save_rgba(rgba, path)
    return d


def poly_mean_db(lin, lon, lat, ring):
    LON, LAT = np.meshgrid(lon, lat)
    inside = MPath(ring).contains_points(np.c_[LON.ravel(), LAT.ravel()]).reshape(LON.shape)
    vals = lin[inside & np.isfinite(lin)]
    return float(db(vals.mean())) if vals.size else None  # mean in linear power, then dB


def process(aoi):
    a = AOIS[aoi]
    bounds = a["bounds"]
    (OUT / aoi).mkdir(parents=True, exist_ok=True)
    (CACHE / aoi).mkdir(parents=True, exist_ok=True)
    t = time.time()
    grans = search(aoi)
    print(f"[{aoi}] {len(grans)} granules ({time.time() - t:.0f}s search)", flush=True)
    scenes, stats, grids = [], [], {}
    for gr in grans:
        npy = CACHE / aoi / f"hv_{gr['date']}.npy"
        t = time.time()
        if npy.exists():
            lin = np.load(npy)
        else:
            raw, x, y, epsg = read_clip(gr["url"], bounds)
            lin, _, _ = to_latlon(*multilook(raw, x, y), epsg, bounds)
            np.save(npy, lin)
        H, W = lin.shape
        w, s, e, n = bounds
        lon = w + (np.arange(W) + 0.5) * (e - w) / W
        lat = n - (np.arange(H) + 0.5) * (n - s) / H
        grids[gr["date"]] = lin
        png = f"{aoi}/hv_{gr['date']}.png"
        hv_png(lin, OUT / png)
        valid = np.isfinite(lin).mean()
        print(f"[{aoi}] {gr['date']} {gr['maturity']} {W}x{H} valid={valid:.0%} ({time.time() - t:.0f}s) {gr['granule']}", flush=True)
        scenes.append(dict(aoi=aoi, date=gr["date"], date_from=None, kind="hv", png_url=png, bounds=bounds,
                           maturity=gr["maturity"], granule=gr["granule"]))
        for pid, (pname, ring) in a["polys"].items():
            m = poly_mean_db(lin, lon, lat, ring)
            if m is not None:
                stats.append(dict(aoi=aoi, poly_id=pid, poly_name=pname, date=gr["date"], mean_hv_db=round(m, 2)))
    # change within one calibration: earliest vs latest PROVISIONAL (fall back to latest overall)
    prov = [g for g in grans if g["maturity"] == grans[0]["maturity"]]
    d0, d1 = grans[0]["date"], prov[-1]["date"]
    if d1 == d0:
        d1 = grans[-1]["date"]
    png = f"{aoi}/change_{d0}_{d1}.png"
    with np.errstate(all="ignore"):
        water = db(np.nanmedian(np.stack(list(grids.values())), axis=0)) < WATER_DB
    d = change_png(grids[d0], grids[d1], water, OUT / png)
    with np.errstate(invalid="ignore"):
        print(f"[{aoi}] change {d0}->{d1}: loss<-3dB {np.mean(d < -CHANGE_MIN):.1%}, gain>+3dB {np.mean(d > CHANGE_MIN):.1%}", flush=True)
    scenes.append(dict(aoi=aoi, date=d1, date_from=d0, kind="change", png_url=png, bounds=bounds,
                       maturity=grans[0]["maturity"], granule=None))
    polys = [dict(aoi=aoi, poly_id=pid, poly_name=pname, ring=ring) for pid, (pname, ring) in a["polys"].items()]
    return scenes, stats, polys


def copy_to_web():
    WEB.mkdir(parents=True, exist_ok=True)
    shutil.copy(OUT / "manifest.json", WEB / "manifest.json")
    for aoi in AOIS:
        if (OUT / aoi).exists():
            shutil.copytree(OUT / aoi, WEB / aoi, dirs_exist_ok=True)
    print(f"copied out/ -> {WEB}")


def load_env():
    env = {}
    p = ROOT.parent / ".env.local"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def upload():
    from supabase import create_client

    env = load_env()
    url, key = env.get("NEXT_PUBLIC_SUPABASE_URL"), env.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        sys.exit("upload skipped: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local")
    sb = create_client(url, key)
    man = json.loads((OUT / "manifest.json").read_text())
    if "overlays" not in [b.name for b in sb.storage.list_buckets()]:  # same bucket schema.sql creates
        sb.storage.create_bucket("overlays", options={"public": True})
    rows = []
    for sc in man["scenes"]:
        data = (OUT / sc["png_url"]).read_bytes()
        sb.storage.from_("overlays").upload(sc["png_url"], data, {"content-type": "image/png", "upsert": "true"})
        row = {k: sc[k] for k in ("aoi", "date", "date_from", "kind", "bounds", "maturity")}
        row["png_url"] = sb.storage.from_("overlays").get_public_url(sc["png_url"]).rstrip("?")
        rows.append(row)
        print("uploaded", sc["png_url"])
    try:
        for aoi in {r["aoi"] for r in rows}:  # scenes has no natural key: replace per AOI to stay idempotent
            sb.table("scenes").delete().eq("aoi", aoi).execute()
        sb.table("scenes").insert(rows).execute()
        sb.table("stats").upsert(man["stats"], on_conflict="aoi,poly_id,date").execute()
    except Exception as e:
        sys.exit(f"PNGs uploaded, but table write failed ({getattr(e, 'message', e)}). "
                 "Run pipeline/schema.sql in the Supabase SQL editor, then rerun `uv run python run.py upload`.")
    print(f"upserted {len(rows)} scenes, {len(man['stats'])} stats")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd == "upload":
        return upload()
    if cmd == "web":
        return copy_to_web()
    if cmd == "selftest":
        return selftest()
    aois = sys.argv[2:] or list(AOIS)
    man_path = OUT / "manifest.json"
    man = json.loads(man_path.read_text()) if man_path.exists() else dict(scenes=[], stats=[], polys=[])
    for aoi in aois:
        scenes, stats, polys = process(aoi)
        for k, v in (("scenes", scenes), ("stats", stats), ("polys", polys)):
            man[k] = [r for r in man.get(k, []) if r["aoi"] != aoi] + v
        man_path.write_text(json.dumps(man, indent=1))
    if cmd == "all":
        copy_to_web()


if __name__ == "__main__":
    main()
