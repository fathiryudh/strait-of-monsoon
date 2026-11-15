# pipeline: NISAR GCOV to overlays, change maps and stats

Offline, run once on a laptop. Python 3.12 via uv (system python 3.15 lacks wheels).

## Run
```sh
cd pipeline
uv sync
uv run python run.py                 # all AOIs: search, fetch, render, out/manifest.json, copy to ../web/public/overlays
uv run python run.py render riau     # one AOI, no web copy
uv run python run.py web             # copy out/ to ../web/public/overlays only
uv run python run.py upload          # PNGs -> Storage bucket `overlays/<aoi>/...`, rows -> scenes + stats
uv run python run.py selftest        # offline check of the HDF5 chunk decoder
```
- Earthdata auth: `~/.netrc` (urs.earthdata.nasa.gov). No token needed.
- Upload needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `../.env.local`, and `schema.sql` applied once in the Supabase SQL editor (tables `scenes`, `stats`, RLS with public select, public bucket `overlays`). Upload creates the public bucket if missing, upserts PNGs, replaces all `scenes` rows of each AOI and upserts `stats`. If the tables are missing it uploads the PNGs and exits with a hint to run `schema.sql` (the secret key cannot run DDL; use the SQL editor).
- Fetched clips are cached as `data/raw/<aoi>/hv_<date>.npy` (gitignored); delete them to refetch.

## Method
1. `asf_search`: `dataset=NISAR, processingLevel=GCOV, productionConfiguration=PR`, one repeat stack per AOI, PROVISIONAL + VALIDATED.
2. Stream only the AOI: resolve the EDL redirect once to the presigned CloudFront URL, read the HDF5 chunk index with h5py, then fetch just the covering 512x512 chunks of `/science/LSAR/GCOV/grids/frequencyA/HVHV` and `HHHH` (10 m) with 16 parallel HTTP range requests and decode them (byte shuffle + deflate) in numpy. About 100 MB per polarization per date instead of a 4.5 GB granule. (h5py straight over fsspec was 84 s for 16 chunks; too slow.)
3. 4x4 multilook in linear power (10 m to 40 m), nearest-neighbour resample from UTM (EPSG:32648) onto a regular EPSG:4326 grid that exactly spans the AOI bounds.
4. Outputs in `out/<aoi>/`:
   - `hv_<date>.png`: HV gamma0 in dB, grayscale, -30 (black) .. -5 dB (white), transparent nodata.
   - `hh_<date>.png`: HH gamma0 in dB, same grid and grayscale, -25 .. 0 dB.
   - `change_<from>_<to>.png` (HV) and `change_hh_<from>_<to>.png` (HH, same rules): dHV = HV(to) - HV(from) in dB after a 3x3 mean (linear) to suppress speckle. RdBu diverging, -6 (red, HV loss) .. +6 dB (blue, HV gain); transparent where |dHV| < 3 dB, where the median HV over all dates is below -21 dB (open water), and for change blobs under 50 px (8 ha). The last two hide ships moving between anchorage slots, which otherwise dominate the Singapore map.
   - stats: `mean_hv_db` and `mean_hh_db` per hand-drawn polygon per date (mean of linear power, then dB). Polygons are in `run.py` `AOIS[...]["polys"]` and in `manifest.json` `polys`.
5. `out/manifest.json`: `{scenes: [...], stats: [...], polys: [...]}`. `scenes` rows match the `scenes` table (plus `granule`); `kind` is `hv`, `hh`, `change` (HV) or `change_hh`, with `png_url` relative to `out/` (e.g. `sg_reclaim/hv_2026-07-08.png`); `upload` swaps in the public Storage URL.

## AOIs and granules
**sg_reclaim** bounds `[103.55, 1.15, 104.1, 1.65]` [w,s,e,n]. Singapore, Tuas, Pulau Tekong, Johor Strait. Stack `011_A_002` (track 11, ascending, frame 2), checked inside both PROVISIONAL and VALIDATED footprints.

| date | maturity | granule |
|---|---|---|
| 2026-07-08 | PROVISIONAL | `NISAR_L2_PR_GCOV_025_011_A_002_4005_DHDH_A_20260708T224134_20260708T224209_P05023_N_F_J_001` |
| 2026-07-20 | PROVISIONAL | `NISAR_L2_PR_GCOV_026_011_A_002_4005_DHDH_A_20260720T224134_20260720T224208_P05023_N_F_J_001` |
| 2026-08-13 | PROVISIONAL | `NISAR_L2_PR_GCOV_028_011_A_002_4005_DHDH_A_20260813T224132_20260813T224207_P05023_N_F_J_001` |
| 2026-08-25 | PROVISIONAL | `NISAR_L2_PR_GCOV_029_011_A_002_4005_DHDH_A_20260825T224132_20260825T224207_P05023_N_F_J_001` |
| 2026-09-06 | PROVISIONAL | `NISAR_L2_PR_GCOV_030_011_A_002_4005_DHDH_A_20260906T224132_20260906T224206_P05023_N_F_J_001` |
| 2026-09-18 | PROVISIONAL | `NISAR_L2_PR_GCOV_031_011_A_002_4005_DHDH_A_20260918T224132_20260918T224206_P05023_F_F_J_001` |
| 2026-09-30 | PROVISIONAL | `NISAR_L2_PR_GCOV_032_011_A_002_4005_DHDH_A_20260930T224132_20260930T224207_P05023_N_F_J_001` |
| 2026-10-12 | PROVISIONAL | `NISAR_L2_PR_GCOV_033_011_A_002_4005_DHDH_A_20261012T224132_20261012T224207_P05023_N_F_J_001` |
| 2026-10-24 | VALIDATED | `NISAR_L2_PR_GCOV_034_011_A_002_4005_DHDH_A_20261024T224132_20261024T224207_P05036_N_F_J_001` |
| 2026-11-05 | VALIDATED | `NISAR_L2_PR_GCOV_035_011_A_002_4005_DHDH_A_20261105T224133_20261105T224207_P05036_N_F_J_001` |

Change map: `sg_reclaim/change_2026-07-08_2026-10-12.png` (2026-07-08 to 2026-10-12, both PROVISIONAL).

Polygons: `tuas` Tuas Port reclamation (dyked basin); `tekong` Pulau Tekong polder; `johor_plantation` Johor plantation/forest; `ubin` Pulau Ubin mangrove/forest.

**riau** bounds `[101.7, 1.0, 102.2, 1.5]` [w,s,e,n]. Riau peatland: Giam Siak Kecil-Bukit Batu peat dome, Sungai Pakning, Bengkalis Strait. Stack `112_A_002` (track 112, ascending, frame 2), fully inside the footprint.

| date | maturity | granule |
|---|---|---|
| 2026-07-03 | PROVISIONAL | `NISAR_L2_PR_GCOV_024_112_A_002_4005_DHDH_A_20260703T224954_20260703T225029_P05023_N_F_J_001` |
| 2026-07-15 | PROVISIONAL | `NISAR_L2_PR_GCOV_025_112_A_002_4005_DHDH_A_20260715T224954_20260715T225028_P05023_N_F_J_001` |
| 2026-08-20 | PROVISIONAL | `NISAR_L2_PR_GCOV_028_112_A_002_4005_DHDH_A_20260820T224952_20260820T225026_P05023_N_F_J_001` |
| 2026-09-01 | PROVISIONAL | `NISAR_L2_PR_GCOV_029_112_A_002_4005_DHDH_A_20260901T224952_20260901T225026_P05023_N_F_J_001` |
| 2026-09-13 | PROVISIONAL | `NISAR_L2_PR_GCOV_030_112_A_002_4005_DHDH_A_20260913T224951_20260913T225026_P05023_N_F_J_001` |
| 2026-09-25 | PROVISIONAL | `NISAR_L2_PR_GCOV_031_112_A_002_4005_DHDH_A_20260925T224951_20260925T225026_P05023_N_F_J_001` |
| 2026-10-07 | PROVISIONAL | `NISAR_L2_PR_GCOV_032_112_A_002_4005_DHDH_A_20261007T224951_20261007T225026_P05023_N_F_J_001` |
| 2026-10-19 | PROVISIONAL | `NISAR_L2_PR_GCOV_033_112_A_002_4005_DHDH_A_20261019T224952_20261019T225026_P05023_N_F_J_001` |
| 2026-10-31 | VALIDATED | `NISAR_L2_PR_GCOV_034_112_A_002_4005_DHDH_A_20261031T224952_20261031T225026_P05036_N_F_J_001` |

Change map: `riau/change_2026-07-03_2026-10-19.png` (2026-07-03 to 2026-10-19, both PROVISIONAL).

Polygons: `peat_forest` Intact peat swamp forest (GSK-BB core); `loss_block` Plantation block, HV loss (clearing or burn); `loss_river` Riverside patches, HV loss; `regrowth` Plantation block, HV gain (regrowth).

**tonle_sap** bounds `[103.30, 12.35, 104.05, 13.35]` [w,s,e,n]. Tonle Sap lake, Cambodia: open-water area per pass. Stack `076_D_082` (track 76, descending, frame 82), full frames only (`..._N_F_J_001`; the `N_P` partial frames are skipped). The frame footprint is a tilted quad whose east edge runs from lon 103.69 at 12.35N to 103.94 at 13.35N, so only the **western part of the lake is covered** (valid=68% of the AOI; the rest stays transparent). water_km2 is for the covered part only. HH only (20 m posting x 4 = 80 m pixels, so the blob filter is 13 px = 8 ha). Dates: 2026-06-19, 07-01, 07-13, 07-25, 08-18, 08-30, 09-11, 09-23, 10-05, 10-17 (PROVISIONAL), 10-29 (VALIDATED). Granule IDs: `uv run python run.py render tonle_sap` / manifest `scenes[].granule`.

Water method: HH dB below a fixed **-17.0 dB** on every date (`LAKE_DB`), 3x3 median, drop blobs under 13 px (8 ha), drawn as `water_<date>.png` (#3B82F6 at 70%). Otsu was tried first: it gave -10.5 dB (land/water split, flags dark paddy and fallow fields as water), and -20 dB missed the lake itself (June lake median is -18 dB, wind and range falloff), so fixed -17 was kept. Area = pixel count x per-row cell area (cos(lat), spherical R=6371 km). `stats` row per date: `poly_id` `lake`, `mean_hv_db` holds the **mean HH dB over the AOI** (column is NOT NULL; no HV is fetched for this AOI), new nullable `water_km2`. Run `alter table stats add column if not exists water_km2 real;` once in the Supabase SQL editor (upload falls back to stats without it and says so).

| date | water_km2 |
|---|---|
| 2026-06-19 | 323 |
| 2026-07-01 | 375 |
| 2026-07-13 | 351 |
| 2026-07-25 | 358 |
| 2026-08-18 | 418 |
| 2026-08-30 | 498 |
| 2026-09-11 | 551 |
| 2026-09-23 | 743 |
| 2026-10-05 | 1144 |
| 2026-10-17 | 1239 |
| 2026-10-29 | 965 |

Caveats: wind-roughened water and flooded forest/vegetation are missed by a simple threshold, so km2 is a lower bound of open water. Flooded paddy and floodplain fields count as water in Sep-Oct (that is most of the growth beyond the lake itself), and some dark land (paddy, burn, fallow) can be flagged on any date; June has a few small false patches west of the lake. 10-29 is VALIDATED, the rest PROVISIONAL, so part of the 10-17 to 10-29 drop may be calibration. The fixed threshold was set by eye from one June and one October mask.

## Caveats
- Calibration: 2026-10-21 onward is VALIDATED (`NISAR_L2_GCOV_V1`); earlier is PROVISIONAL (`NISAR_L2_GCOV_PROVISIONAL_V1`). ASF warns mixing maturities introduces processing differences, so change maps compare two PROVISIONAL dates only. VALIDATED frames are in the time-lapse and stats, but a step in the chart at 10-24 may be calibration, not ground change.
- 2026-07-27..08-10 is a permanent PROVISIONAL data gap (no 08-01 scene).
- Change maps are one pair (first vs last PROVISIONAL date). Changes under 8 ha and anything on open water are hidden by design; a few large ships still pass. Soil moisture and rain also move HV by 1-2 dB.
- Findings: Riau `loss_block` falls steadily -12.0 to -17.2 dB from Jul to Oct (gradual clearing/harvest, not a single-date event), `regrowth` rises -15.8 to -12.6 dB, intact peat forest stays at about -10.1 dB. Singapore polygons are flat within ±0.6 dB over 4 months; the visible change there is land clearing in Johor/Pasir Gudang and work inside the Tekong polder. VALIDATED vs PROVISIONAL shows no obvious step in these polygons (<0.4 dB).
- Which polarization shows the change (from the PNGs and polygon stats, first vs last PROVISIONAL date):
  - riau: **HV, clearly.** HV flags the harvested/cleared plantation blocks and the regrowth blocks, but HH barely flags them (`loss_block` HV -5.1 dB vs HH -1.7 dB; `regrowth` HV +3.2 vs HH +1.8). Only the riverside patches show up about equally in both. Volume scattering from canopy drives HV; HH mixes in surface and trunk-ground returns that change less when the canopy goes.
  - sg_reclaim: **HV for vegetation clearing** (the Johor/Pasir Gudang patches are stronger in HV). **HH adds the construction at Changi East** (double-bounce from structures), but brings more sea streaks and ship-wake artifacts. Polygon means move under 1.2 dB in either polarization.
- Polygons were placed by eye on the rendered HV images, not from official boundaries.
- Riau AOI is a known peat-fire landscape (Giam Siak Kecil-Bukit Batu, Bengkalis/Siak); 2026 hotspots were not cross-checked against FIRMS.
- Nearest-neighbour resample; GCOV is already RTC-corrected. The open-water mask for both change maps comes from the HV median.
- Timing on a Singapore home connection: ~45 s per polarization per date (about 100 MB of chunks); renders from cache in seconds.
