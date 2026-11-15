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
from scipy.ndimage import label, median_filter, uniform_filter

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
CACHE = ROOT / "data" / "raw"
WEB = ROOT.parent / "web" / "public" / "overlays"
GRID = "/science/LSAR/GCOV/grids/frequencyA"  # 10 m posting
LOOKS = 4  # 4x4 boxcar in linear power: 10 m -> 40 m, also cuts speckle
RANGES = {"hv": (-30.0, -5.0), "hh": (-25.0, 0.0)}  # dB stretch per polarization
POLS = {"hv": "HVHV", "hh": "HHHH"}
CHANGE_MAX, CHANGE_MIN = 6.0, 3.0
WATER_DB = -21.0  # median HV over all dates below this = open water, masked in change maps
LAKE_DB = -17.0  # tonle_sap fixed HH threshold: Otsu gave -10.5 (flags dark paddy), -20 misses the lake (June lake median -18 dB)
WATER_RGBA = (0x3B, 0x82, 0xF6, 179)  # #3B82F6 at 70%
LAKE_MIN_PX = 13  # 8 ha at this AOI's 80 m pixels (20 m posting x 4)
MIN_BLOB_PX = 50  # drop change blobs under 50 px (8 ha at 40 m): mostly ships moving between anchorage slots

AOIS = {
    "tonle_sap": dict(
        # Tonle Sap: west ~2/3 of the lake only. Frame 076_D_082 footprint edge runs from (103.49,11.55) to (104.02,13.69),
        # so the east part of the AOI is outside it and stays transparent/NaN.
        bounds=[103.30, 12.35, 104.05, 13.35],
        stack=dict(relativeOrbit=76, frame=82, flightDirection="DESCENDING"),
        dates=("2026-06-19", "2026-10-29"),
        pick=("2026-06-19", "2026-07-01", "2026-07-13", "2026-07-25", "2026-08-18", "2026-08-30", "2026-09-11",
              "2026-09-23", "2026-10-05", "2026-10-17", "2026-10-29"),
        water=True,
        polys={},
    ),
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
            if a.get("water") and "_F_J_001" not in g.properties["sceneName"]:  # skip partial (N_P) frames
                continue
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


def gray_png(lin, path, rng):
    """Palette PNG: index 0 transparent (nodata), 1..GRAY_LEVELS = black..white over rng dB."""
    d = db(lin)
    v = np.nan_to_num(np.clip((d - rng[0]) / (rng[1] - rng[0]), 0, 1))
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


def water_mask(lin):
    """Open water = HH dB below LAKE_DB, 3x3 median + blobs < 8 ha dropped."""
    d = db(lin)
    thr = LAKE_DB
    m = median_filter(np.nan_to_num(d, nan=0.0) < thr, size=3) & np.isfinite(d)
    lab, _ = label(m)
    small = np.bincount(lab.ravel()) < LAKE_MIN_PX
    small[0] = False
    return m & ~small[lab], thr


def process_lake(aoi, grans):
    a = AOIS[aoi]
    bounds = a["bounds"]
    w, s, e, n = bounds
    scenes, stats = [], []
    for gr in grans:
        try:
            npy = CACHE / aoi / f"hh_{gr['date']}.npy"
            if npy.exists():
                lin = np.load(npy)
            else:
                raw, x, y, epsg = read_clip(gr["url"], bounds, "HHHH")
                lin, _, _ = to_latlon(*multilook(raw, x, y), epsg, bounds)
                np.save(npy, lin)
        except Exception as ex:  # fallback ladder: ship the dates that work
            print(f"[{aoi}] {gr['date']} FAILED: {ex!r}", flush=True)
            continue
        H, W = lin.shape
        lat = n - (np.arange(H) + 0.5) * (n - s) / H
        km = 111.195  # km per degree (spherical)
        px_km2 = ((e - w) / W * km) * ((n - s) / H * km) * np.cos(np.radians(lat))[:, None]
        m, thr = water_mask(lin)
        km2 = float((m * px_km2).sum())
        gray_png(lin, OUT / aoi / f"hh_{gr['date']}.png", RANGES["hh"])
        rgba = np.zeros((H, W, 4), np.uint8)
        rgba[m] = WATER_RGBA
        save_rgba(rgba, OUT / aoi / f"water_{gr['date']}.png")
        for kind in ("hh", "water"):
            scenes.append(dict(aoi=aoi, date=gr["date"], date_from=None, kind=kind, png_url=f"{aoi}/{kind}_{gr['date']}.png",
                               bounds=bounds, maturity=gr["maturity"], granule=gr["granule"]))
        mean_hh = float(db(np.nanmean(lin)))
        stats.append(dict(aoi=aoi, poly_id="lake", poly_name="Tonle Sap open water", date=gr["date"],
                          mean_hv_db=round(mean_hh, 2), water_km2=round(km2, 1)))  # mean_hv_db holds HH for this AOI
        print(f"[{aoi}] {gr['date']} {gr['maturity']} thr={thr:.1f} dB water={km2:.0f} km2 meanHH={mean_hh:.1f} valid={np.isfinite(lin).mean():.0%}", flush=True)
    assert len(stats) >= 3, "fewer than 3 dates succeeded"
    ring = [(w, s), (e, s), (e, n), (w, n)]
    return scenes, stats, [dict(aoi=aoi, poly_id="lake", poly_name="Tonle Sap open water", ring=ring)]


def process(aoi):
    a = AOIS[aoi]
    bounds = a["bounds"]
    (OUT / aoi).mkdir(parents=True, exist_ok=True)
    (CACHE / aoi).mkdir(parents=True, exist_ok=True)
    t = time.time()
    grans = search(aoi)
    print(f"[{aoi}] {len(grans)} granules ({time.time() - t:.0f}s search)", flush=True)
    if a.get("water"):
        return process_lake(aoi, grans)
    scenes, stats, grids = [], [], {"hv": {}, "hh": {}}
    w, s, e, n = bounds
    for gr in grans:
        t = time.time()
        means = {}
        for pol, ds_name in POLS.items():
            npy = CACHE / aoi / f"{pol}_{gr['date']}.npy"
            if npy.exists():
                lin = np.load(npy)
            else:
                raw, x, y, epsg = read_clip(gr["url"], bounds, ds_name)
                lin, _, _ = to_latlon(*multilook(raw, x, y), epsg, bounds)
                np.save(npy, lin)
            H, W = lin.shape
            lon = w + (np.arange(W) + 0.5) * (e - w) / W
            lat = n - (np.arange(H) + 0.5) * (n - s) / H
            grids[pol][gr["date"]] = lin
            png = f"{aoi}/{pol}_{gr['date']}.png"
            gray_png(lin, OUT / png, RANGES[pol])
            scenes.append(dict(aoi=aoi, date=gr["date"], date_from=None, kind=pol, png_url=png, bounds=bounds,
                               maturity=gr["maturity"], granule=gr["granule"]))
            means[pol] = {pid: poly_mean_db(lin, lon, lat, ring) for pid, (_, ring) in a["polys"].items()}
        print(f"[{aoi}] {gr['date']} {gr['maturity']} {W}x{H} valid={np.isfinite(lin).mean():.0%} ({time.time() - t:.0f}s) {gr['granule']}", flush=True)
        for pid, (pname, _) in a["polys"].items():
            hv, hh = means["hv"][pid], means["hh"][pid]
            if hv is not None:
                stats.append(dict(aoi=aoi, poly_id=pid, poly_name=pname, date=gr["date"], mean_hv_db=round(hv, 2),
                                  mean_hh_db=None if hh is None else round(hh, 2)))
    # change within one calibration: earliest vs latest PROVISIONAL (fall back to latest overall)
    prov = [g for g in grans if g["maturity"] == grans[0]["maturity"]]
    d0, d1 = grans[0]["date"], prov[-1]["date"]
    if d1 == d0:
        d1 = grans[-1]["date"]
    with np.errstate(all="ignore"):  # water from HV median: ships are transient, so the median stays dark water
        water = db(np.nanmedian(np.stack(list(grids["hv"].values())), axis=0)) < WATER_DB
    for pol, kind in (("hv", "change"), ("hh", "change_hh")):
        png = f"{aoi}/{kind}_{d0}_{d1}.png"
        d = change_png(grids[pol][d0], grids[pol][d1], water, OUT / png)
        with np.errstate(invalid="ignore"):
            print(f"[{aoi}] {kind} {d0}->{d1}: loss<-3dB {np.mean(d < -CHANGE_MIN):.1%}, gain>+3dB {np.mean(d > CHANGE_MIN):.1%}", flush=True)
        scenes.append(dict(aoi=aoi, date=d1, date_from=d0, kind=kind, png_url=png, bounds=bounds,
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
        try:
            sb.table("stats").upsert(man["stats"], on_conflict="aoi,poly_id,date").execute()
        except Exception as e:
            if "water_km2" not in str(e):
                raise
            print("WARNING: stats.water_km2 column missing; uploaded stats WITHOUT it. Run in the Supabase SQL editor: "
                  "alter table stats add column if not exists water_km2 real;  then rerun upload.")
            sb.table("stats").upsert([{k: v for k, v in r.items() if k != "water_km2"} for r in man["stats"]],
                                     on_conflict="aoi,poly_id,date").execute()
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
