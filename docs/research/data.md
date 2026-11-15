# NISAR data research: what is usable tonight

Researched 2026-11-15, 16:30-17:00 SGT. **[V]** = I checked it myself (CMR query, HTTP request, or looked at the image). **[unverified]** = taken from docs or not tested.

## 1. Challenge Resources tab (complete list)

The source was the challenge page's embedded data at https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/ [V]

**NASA Data & Resources**

| Name | URL | What it is |
|---|---|---|
| NASA Earthdata Search | https://search.earthdata.nasa.gov/search | Searches all NASA Earth data, NISAR included |
| ASF Data Search Vertex | https://search.asf.alaska.edu/ | ASF's map-based SAR search and download tool. NISAR is filed under `prodConfig=PR` |
| NISAR Data User Guide | https://nisar-docs.asf.alaska.edu/ | ASF's reference for NISAR products, access, tools and tutorials |
| Intro to Remote Sensing | https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/remote-sensing | Background reading |
| Intro to SAR | https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar | Background on frequency, polarization and scattering |
| NASA ARSET Trainings | https://appliedsciences.nasa.gov/get-involved/training | Online trainings, including a 2026 NISAR course (e.g. https://www.earthdata.nasa.gov/s3fs-public/2026-07/arset-2026-nisar-part2.pdf) |
| NISAR StoryMaps | https://nisar.jpl.nasa.gov/applications/arcgis-storymaps/ | StoryMaps on floods, wildfire, subsidence, oil slicks and glaciers. Useful for UX ideas |
| NISAR Applications White Papers | https://nisar.jpl.nasa.gov/applications/societal-benefit/ | Two-page overviews of applications. Useful for pitch narrative |
| UAVSAR Postcards | https://uavsar.jpl.nasa.gov/education/postcards.html | False-color airborne L-band composites |

**Space Agency Partner Resources** (all need registration or are slow to obtain, so skip them tonight)

| Name | URL | What it is |
|---|---|---|
| CSA RCM data | https://donnees-data.asc-csa.gc.ca/en/dataset/rcm | RADARSAT Constellation C-band data |
| CSA SAR Python tutorial | https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial | SAR with Python and QGIS |
| CSA RADARSAT-1 data | https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1 | Archive from 1995-2013, open license |
| CONAE SAOCOM catalogue | https://catalogos.conae.gov.ar/catalogo/catalogoSatSaocomInfo.html | Argentine L-band SAR. Requires the registration below |
| SAOCOM registration | https://www.argentina.gob.ar/noticias/la-informacion-saocom-cada-vez-mas-accesible | Sets up the "ONE CLICK" login |

## 2. What NISAR data is public right now

Sources: https://nisar-docs.asf.alaska.edu/availability-overview/ and CMR [V]

| Maturity | Released | Acquisitions covered | CMR short names |
|---|---|---|---|
| VALIDATED (L0-L2, no SME2) | 2026-11-06 | 2026-10-21 onward | `NISAR_L2_GCOV_V1`, `NISAR_L2_GUNW_V1`, `NISAR_L2_GSLC_V1`, `NISAR_L2_GOFF_V1`, `NISAR_L1_*_V1` |
| PROVISIONAL (L0-L3) | 2026-07-20 | 2026-06-17 to about 2026-10-23. Permanent gap from 2026-07-27 to 2026-08-10 | `NISAR_L2_GCOV_PROVISIONAL_V1`, `..._GUNW_...`, `..._GSLC_...`, `..._GOFF_...`, `NISAR_L3_SME2_PROVISIONAL_V1` |
| BETA (pre-calibration) | 2026-02-27 | Subset of 2025-10-17 to 2026-01-20, up to 8 acquisitions per track | `NISAR_L2_GCOV_BETA_V1` etc. |
| Urgent Response | rolling | Event-triggered | `NISAR_UR_L1`, `NISAR_UR_L2` (GCOV, GSLC, GUNW, GOFF) |
| S-band | ISRO | Samples only | https://bhoonidhi.nrsc.gov.in/NISAR/NisarProducts.html (separate login) |

ASF plans to reprocess pre-2026-10-21 data to VALIDATED in 2027. ASF warns that mixing PROVISIONAL and BETA (or VALIDATED) introduces processing differences, so do change detection within a single maturity.

**Access and auth**
- **Search:** CMR, Vertex, Earthdata Search and asf_search all work without login [V CMR].
  - asf_search keys: `dataset="NISAR"`, `processingLevel="GCOV"`, `productionConfiguration=["PR"]`, `dataMaturity="PROVISIONAL"|"VALIDATED"`, `relativeOrbit`, `frame`, `flightDirection`, `intersectsWith=<WKT>`.
- **HDF5 download or stream:** needs a free Earthdata Login (EDL).
  - Without auth, a GET returns 401 and redirects to `urs.earthdata.nasa.gov` [V].
  - With `~/.netrc` (already present on this machine) and a cookie jar, an HTTP range read returns 206 and the `\x89HDF` signature [V].
  - HTTPS range reads work from a laptop. Direct S3 access (`s3://sds-n-cumulus-prod-nisar-products/...`) only works inside AWS us-west-2.
  - The Cookbook streams with an EDL **Bearer token** generated at https://urs.earthdata.nasa.gov/profile, under "Generate Token".
- **No login needed** [V]:
  - Browse PNGs and KMLs: `https://nisar.asf.earthdatacloud.nasa.gov/BROWSE/<collection>/<granule>/<granule>_LATLON.png` plus `_LATLON.kml`, which holds the lat/lon quad bounds.
  - GIBS tiles (see section 3).
  - HEAD requests (they return the file size).

**Formats and sizes** (CMR `granule_size` plus one HEAD request [V]):

| Product | What it is | Posting | Size per frame |
|---|---|---|---|
| L2 **GCOV** | RTC gamma0 backscatter, linear power, UTM. Path `/science/LSAR/GCOV/grids/frequencyA/HHHH` (plus `HVHV`, `mask`, `numberOfLooks`, `rtcGammaToSigmaFactor`). Singapore stack: freqA 40 MHz at 10 m, freqB 5 MHz at 80 m, dual-pol HH+HV | 10/20/80 m | **4.3-5.8 GB**. Example `.h5` = 4,546,625,536 bytes |
| L2 GUNW | Unwrapped interferogram | 80 m | about 2.2 GB |
| L2 GOFF | Pixel offsets | 80 m | about 0.6-0.8 GB |
| L2 GSLC | Complex SLC | 5-40 m | 12-22 GB |
| L3 SME2 | Soil moisture (provisional, not fully calibrated) | 200 m | **70-100 MB** |
| Browse `_LATLON.png` | Colorized quicklook plus KML | n/a | about 2-3 MB |

- Each granule also includes `_QA_REPORT.pdf`, `_QA_STATS.h5`, `_QA_SUMMARY.csv` and `.iso.xml` [V].
- All science data is HDF5. ASF publishes no COGs; you make your own.
- GDAL can read NISAR HDF5 from **3.13.0** on (older GDAL needs a `NETCDF:` prefix). Syntax: `gdal_translate -of GTiff "/vsicurl/https://...h5"://science/LSAR/GCOV/grids/frequencyA/HHHH out.tif` with `--config GDAL_HTTP_NETRC=YES --config GDAL_HTTP_COOKIEFILE=/tmp/c.txt` (https://nisar-docs.asf.alaska.edu/gdal/) [unverified locally; GDAL is not installed here].

## 3. Fastest path from data to a web map

From least to most work:

1. **GIBS WMTS tiles. Zero processing, global, public, time-enabled** [V]
   - Layer `NISAR_L2_Geocoded_Polarimetric_Covariance`: "NISAR Normalized Radar Backscatter (False Color, GCOV, Best)". Daily mosaic of GCOV RGB decomposition resampled to 15.625 m, PNG, `GoogleMapsCompatible_Level13`.
   - Template: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/NISAR_L2_Geocoded_Polarimetric_Covariance/default/{YYYY-MM-DD}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`
   - Available dates: 2025-10-29 to 2026-11-13, with gaps. Each day only holds the swaths acquired that day, so use the acquisition dates listed below.
   - Fetched z10/508/807 over Singapore for 07-08, 09-06, 10-12, 10-24 and 11-05: 200 OK, about 134 KB of real imagery each. 11-04 returned an empty tile (288 B) [V].
   - The image clearly shows Singapore's south coast and Batam, with orange streak artifacts over the sea.
   - Plugs straight into MapLibre/Leaflet as a raster source, so a date slider is just a URL swap.
   - The docs also list a 12-day rolling mosaic (`..._12Day`), but it is **not** in the WMTS capabilities. It may be WMS-only (`https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi`) [unverified].
   - Limitation: colorized pixels only, no dB values, so you cannot compute stats from it.
2. **Browse PNG plus KML bounds per granule** [V]
   - Public, about 2-3 MB, already georeferenced as a lat/lon quad.
   - Drop it into a MapLibre `image` source using the KML coordinates.
   - Good for before/after sliders, and for interferograms (GUNW browse shows fringes, see section 4).
3. **GCOV subset to dB, change map, PNG/COG** (the "real" analysis, needs EDL)
   - Libraries: `asf_search`, `fsspec` with `aiohttp` (HTTP range reads), `xarray` with `h5netcdf` (`open_datatree`), `rioxarray`, `rasterio` (COG driver), `numpy`, `matplotlib` (colormap to PNG). Use `h5py` if you want plain reads.
   - The Cookbook pattern is verified to exist (code in `search_stream_NISAR_GCOV_asf_search.ipynb`):
     ```python
     fs = fsspec.filesystem("http", headers={"Authorization": f"Bearer {token}"}, cache_type="background", block_size=8*1024*1024)
     dt = xr.open_datatree(fs.open(url, "rb"), engine="h5netcdf", phony_dims="access", decode_timedelta=False, chunks="auto", group="/science/LSAR/GCOV/grids/frequencyA")
     da = dt.HHHH.rio.write_crs(f"EPSG:{dt.projection.attrs['epsg_code'].item()}").rio.clip_box(minx, miny, maxx, maxy, crs="EPSG:4326")
     db = 10*np.log10(da.where(da > 0))
     ```
   - Then `db.rio.reproject("EPSG:3857").rio.to_raster("x.tif", driver="COG")`, or colorize to PNG with fixed stretch: HH -25..0 dB, HV -30..-5 dB [stretch values are my suggestion].
   - Change: log-ratio `dB_t2 - dB_t1`, threshold at ±3 dB.
   - Streaming speed from Singapore to us-west-2 is **unverified**. A 50x50 km clip at 10 m is about 25M px, roughly 100 MB float32 per pol.
   - If streaming is slow: use `frequencyB` (80 m, 64x fewer pixels), or `numberOfLooks`-style downsampling via `.coarsen`.
4. **GUNW to displacement in cm**: `unwrappedPhase * 0.2384 / (4π)` (L-band λ ≈ 23.84 cm). More layers to understand, and the browse PNG already tells the story.

## 4. Coverage

**Singapore, Johor, Batam: well covered** [V, CMR bbox 103.5,1.15,104.1,1.5]
- 28 PROVISIONAL and 4 VALIDATED GCOV granules. No BETA (BETA has no SE Asia coverage).
- Three repeat stacks, each on a 12-day cycle:
  - **`011_A_002`** (ascending, track 11, frame 2). Footprint about -0.4..2.15 N, 103.35..106.0 E. Covers Singapore, eastern Johor (Pasir Gudang, Pengerang, Desaru), Batam and Bintan. Dates:
    - PROVISIONAL: 2026-07-08, 07-20, 08-13, 08-25, 09-06, 09-18, 09-30, 10-12
    - VALIDATED: 10-24, 11-05
    - Nothing around 08-01 because of the data gap.
  - `112_A_002` (ascending): 07-03, 07-15, 08-20, 09-01, 09-13, 09-25, 10-07, 10-19 (PROVISIONAL), 10-31 (VALIDATED)
  - `047_D_088` (descending): 07-11, 07-23, 08-16, 08-28, 09-09, 09-21, 10-03, 10-15 (PROVISIONAL), 10-27 (VALIDATED)
- Example granule: `NISAR_L2_PR_GCOV_035_011_A_002_4005_DHDH_A_20261105T224133_20261105T224207_P05036_N_F_J_001`.
- GUNW (25 pairs, about 2.2 GB) and SME2 soil moisture (28 files, 70-100 MB) also exist over Singapore [V].

**Johor interior** (103.2-103.8 E, 1.6-2.0 N): 91 GCOV granules across several frames [V].

**Riau mainland peatland** (101.5-102.5 E, 0.8-1.6 N; Siak/Bengkalis): 30 GCOV granules, stacks `112_A_002/003`, `040_A_002` and `148_D_088` [V].
- Peat-fire burn scars should show in HV, but I did not check whether 2026 had major fires [unverified].
- I found no reports of November 2026 floods in Malaysia or Indonesia yet. The big late-November 2025 SE Asia floods (Hat Yai, Aceh) have **no** BETA coverage [V, CMR returned 0].

**High-signal locations ready to use:**
1. **M7.0 earthquake, Tibet, 2026-10-22** (USGS us6000u43g, 32.34N 93.78E) [V]
   - Urgent Response coseismic interferograms exist:
     - `NISAR_L2_UR_GUNW_033_112_A_018_034_2000_SH_20261019T225848_20261019T225923_20261031T225848_20261031T225923_P05023_F_F_J_001` (pre 10-19, post 10-31)
     - `..._033_040_A_018_034_..._20261014..._20261026...` (pre 10-14, post 10-26)
   - I downloaded the public `_LATLON.png` of the 112 pair and looked at it: **clear concentric coseismic fringe lobe**, plus a linear ramp (ionosphere/orbit).
   - Matching GOFF and UR GCOV products also exist. This is the most dramatic visual available and needs zero processing via the browse PNG plus KML.
2. **Mozambique Limpopo floods, January 2026** (NASA SVS showcase https://svs.gsfc.nasa.gov/5661)
   - BETA GCOV on stack `114_A_165`: 2025-11-30, 12-12, 12-24, **2026-01-05, 2026-01-17** [V CMR, bbox 33.0-33.8 E, 24.4-25.2 S].
   - A classic flood before/after (water goes dark in HH). BETA means pre-calibration, which is fine for visuals.
3. **Pokhara, Nepal**: the Cookbook's GCOV time series example (monsoon soil moisture). PROVISIONAL, `relativeOrbit=26, frame=16`, ascending, AOI `POLYGON((83.8858 28.142,84.3554 28.142,84.3554 28.4825,83.8858 28.4825,83.8858 28.142))`.
   - The Cookbook drops 2026-07-09 and 2026-07-21 as bad products. Reusable code end to end.
4. Also mentioned in NASA news but not checked: a Venezuela earthquake (June 2026), South African agriculture and Antarctica [unverified].

**Fallbacks** (not needed, since NISAR coverage is good)
- Sentinel-1 via OPERA RTC-S1 COGs on ASF [unverified coverage over SE Asia]. Note that OPERA is not on the Resources tab, and the challenge asks for NISAR.
- The listed partner sources (RCM, RADARSAT-1, SAOCOM) all need registration, and UAVSAR postcards are static images. Too slow for tonight.

## 5. Reusable notebooks and tutorials

- **NISAR Cookbook** (ASF OpenSARLab): https://asfopensarlab.github.io/NISAR_Cookbook/, repo https://github.com/ASFOpenSARlab/NISAR_Cookbook. Notebooks:
  - `search_stream_NISAR_GCOV_asf_search.ipynb`: search, HTTPS/S3 streaming, time-series xarray. **Most useful.**
  - `NISAR_GCOV_Time_Series_Example.ipynb`: Pokhara. Subset, Zarr, dB, GIF animation, mean time series.
  - `NISAR_GCOV_SARChangeDetectionMethods.ipynb`: percentile/variance/CV thresholds, log-ratio pairwise change, **GeoTIFF export**. Needs local files and isce3 env for parts [unverified which parts].
  - `search_download_NISAR_GCOV_asf_search.ipynb`, `search_NISAR_GCOV_earthaccess.ipynb`, `Opening_HDF5_Python.ipynb`, `load_subset_reproject_xr.ipynb`, `GSLC_Interferogram.ipynb`, `NISAR_Pixel_Conversion.ipynb`, `set_up_Earthdata_Login.md`.
- NISAR Data User Guide pages: `/asf-search`, `/earthaccess`, `/gdal`, `/aws-s3-access`, `/worldview`, `/gcov`, `/gunw`, `/provisional-known-issues`, `/naming-conventions`.
- S3 read benchmarks: https://gist.github.com/hrodmn/5a377531c19da6f6d2c2bb149c450b3d
- ARSET 2026 NISAR training (includes a flood case study using NISAR amplitude): https://www.earthdata.nasa.gov/s3fs-public/2026-07/arset-2026-nisar-part2.pdf
- CSA SAR tutorial (Python/QGIS): https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial

## Recommended dataset and pipeline for tonight

**Story:** "Singapore and its neighbours, every 12 days through the clouds", plus a "global quake" hero layer.

**Layer A (0 processing, about 20 min of frontend work):** GIBS WMTS NISAR GCOV false-color as the global base layer, with a date picker.
- Default to Singapore with the `011_A_002` dates: 2026-07-08, 07-20, 08-13, 08-25, 09-06, 09-18, 09-30, 10-12, 10-24, 11-05.
- This meets "interactive app using NISAR data" even if everything else fails.

**Layer B (the analysis, about 90 min):** GCOV stack `011_A_002`, AOI Singapore/Johor Strait/Pasir Gudang/north Batam.
- bbox `103.55,1.15,104.10,1.65` sits inside the footprint, but I estimated that from the footprint polygon; check it after the first load.
- Use 2026-07-08 → 2026-10-12 (both PROVISIONAL, 96 days apart) for the change map.
- Use all 8 PROVISIONAL dates for the time-series slider. Add 10-24 and 11-05 VALIDATED with a "different calibration" note.

Steps:
1. Environment. System Python is 3.15, so wheels may be missing:
   `uv venv --python 3.12 && uv pip install asf_search fsspec aiohttp h5netcdf h5py xarray rioxarray rasterio numpy matplotlib dask`
2. Get an EDL bearer token from https://urs.earthdata.nasa.gov/profile → Generate Token, and put it in `.env` as `EDL_TOKEN`. `~/.netrc` already works for curl/GDAL.
3. Search:
   `asf.search(dataset="NISAR", processingLevel="GCOV", productionConfiguration=["PR"], dataMaturity="PROVISIONAL", relativeOrbit=11, frame=2, flightDirection="ASCENDING", intersectsWith=AOI_WKT)`
   Then `.find_urls(extension=".h5", pattern=r'^(?!.*QA_STATS).*')`. Keep the latest CRID per product (Cookbook regex).
4. For each URL, stream `frequencyA` with `open_datatree(..., group=...)` (code in section 3) and `clip_box` to the AOI.
   - Take `HHHH` and `HVHV`, convert to dB with `10*log10`, reproject to EPSG:3857, and write a COG.
   - Also write a colorized PNG (HV dB, -30..-5, gray or viridis) plus a bounds JSON.
   - If it is slow, switch to `frequencyB` (80 m) or `.coarsen(x=4, y=4).mean()` before computing.
5. Change: `dHV = HV_dB(10-12) - HV_dB(07-08)`. Mask: `>+3 dB` gain (new structures, vegetation growth), `<-3 dB` loss (clearing, new water, reclamation sand). Use a diverging colormap and export a PNG. Also compute the mean dB per date for 3-4 hand-drawn polygons (e.g. Tuas reclamation, Pulau Tekong, a Johor plantation, a mangrove) and store them as time series.
6. Upload the PNGs/COGs to a public Supabase Storage bucket. Store a table `scenes(date, maturity, granule, pol, bounds, png_url)` and `stats(poly_id, date, mean_db)`. The Next.js MapLibre map uses `image` sources with the bounds, a date slider, a before/after swipe, and a Recharts or similar line chart from `stats`.

**Layer C (0 processing, about 15 min):** Tibet M7.0 coseismic GUNW browse PNG (`..._GUNW_033_112_A_018_034_..._LATLON.png`) as an image overlay, positioned with the coordinates from its `_LATLON.kml`. It is public and needs no login. Label it "12-day pair spanning the 2026-10-22 quake; each color cycle ≈ 11.9 cm line-of-sight motion".
- Fringe interpretation, and whether the ramp is ionospheric, is unverified.
- **Backup hero:** Mozambique flood BETA GCOV, 2026-01-05 vs 01-17 (browse PNGs, same pattern).

**Risks**
- HTTPS streaming throughput from SG is untested; frequencyB at 80 m is the escape hatch.
- PROVISIONAL products can have artifacts (the Cookbook dropped two Nepal scenes), so look at each browse PNG first.
- The orange streaks over the sea in the Singapore scenes are artifacts; mask the water or mention them.
- Four months of Singapore change will be subtle (reclamation, construction, vegetation), not dramatic. The quake and flood layers carry the "wow".
