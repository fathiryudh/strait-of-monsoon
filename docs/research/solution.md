# Dancing with the SARs: what to build tonight

Researched 2026-11-15, 16:30-17:00 SGT. "Verified" means I fetched the source or ran a request myself. "(unverified)" means it comes from memory or a secondary source.

## TL;DR

Build **Tonle Sap Pulse**: a map-first web app that shows Cambodia's Tonle Sap lake flooding through the 2026 monsoon, one NISAR pass every 12 days (June 19 to Oct 29).

- **The core is cheap.** NASA GIBS already serves NISAR GCOV false-colour tiles for every day and the whole globe, with no login and no processing needed. I checked this: 11 full-coverage passes over the lake, and the change is plainly visible.
- **The science angle is NISAR-specific.** L-band passes through the forest canopy. Flooded forest brightens in co-pol (HH) through double-bounce, while open water goes dark.
- **Python's job is small.** It runs offline and does one thing: compute flooded area in km² per date from the real GCOV HDF5 files.
- **Supabase stores one thing:** visitor observation pins.

**Eligibility risks to check first (verified rules):**
- A **solo** builder is only eligible for Global Judging if registered at a **Local Event**. Universal Event teams need at least 2 people.
- The demo is either a **video of 30 seconds or less** or **7 slides or fewer**. Going over either limit makes the project ineligible.
- The Space Apps guide says AI ("SI") "should not be used to come up with your idea of how to solve the challenge". This document is AI-generated concept research, so **you must pick and own the concept yourself**. You must also disclose AI-assisted code in the project text.

---

## 1. How Space Apps judges, and what won

### Judging (verified, [Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/))

Every judging level scores 1 to 5 on five criteria:

| Criterion | What a 5 means, paraphrased from the guide |
|---|---|
| Impact | Addresses a significant problem, reaches a large audience |
| Creativity | A novel approach or a meaningful improvement on existing ideas |
| Validity | Scientifically sound, technically feasible, **fully developed, usable and user-friendly** |
| Relevance | Fully addresses the challenge. **NASA data is integral, not a superficial addition** |
| Presentation | Clear, engaging storytelling. Judges score the demo *and* the full project |

- The guide tells teams to weight presentation equally with the other four.
- The submission guide says "the majority of judges' evaluation will be based on your project submission" page, and that the demo mostly lifts the Presentation score.
- The 10 Global Awards include Best Use of Science (scientific method), Best Use of Data (makes space data accessible), Galactic Impact, Best Storytelling, Art & Technology and Local Impact.
- 2026 timeline: Global Nominees announced Dec 3, Finalists Dec 17, Winners Jan 26, 2027.

### Past global winners, 2023-2025 (verified from NASA's announcements)

Out of 30 Global Winners, about 7 used Earth-observation data:

- **2024 Best Use of Data:** GaamaRamma, "Waterwise". Water management for farmers during drought, from EO data.
- **2024 Galactic Impact:** NVS-knot. Soil moisture plus evapotranspiration turned into planting-risk advice for farmers.
- **2024 Best Mission Concept:** AsturExplorers, "Landsat Connect". Landsat pass alerts and reflectance data on demand.
- **2025 Best Use of Technology:** Twisters, "SkySense". Hyperlocal weather risk from NASA EO data plus AI.
- **2025 Local Impact:** QUEÑARIS (Peru). Satellite data plus drones to restore queñua forest near Arequipa.
- **2023 Galactic Impact:** Ocean Gardens visualisation of NASA ocean data.
- **2023 Local Impact:** biodiversity hotspot mapping with imaging spectroscopy (Taiwan).
- **No SAR project** appears among the 2023-2025 Global Winners. That is a gap you could fill, but it also means there is no SAR precedent to copy.

**Patterns that won:**
1. **A named user with a decision to make** (a farmer, a local community, a planner), not a generic data viewer.
2. **A real place and a personal or local story.** Local Impact went to place-based EO projects two years running.
3. **A working interactive web app with NASA data at its core.** Validity rewards something "fully developed and usable", so a live URL beats a mock-up.
4. **The science is explained simply** for the public or kids. Storytelling and Inspirational winners were framed as education.
5. **A tight, visual demo.** With only 30 seconds or 7 slides, one dramatic before/after image does most of the work.

Sources: [2025 winners (NASA)](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/), [2024 winners (NASA)](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/), [2023 winners (NASA SMD)](https://science.nasa.gov/directorates/smd/2023-nasa-international-space-apps-challenge-announces-10-global-winners).

### What the challenge explicitly asks for (verified, [challenge page](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/))

- An interactive app using NISAR data to track one or more types of surface change. Suggested forms: change-detection maps, time-series animations, dashboards.
- Open-source and user-friendly, for scientists, managers, educators and the public.
- **Hypothesise the physical drivers** behind what you see, and **which polarizations highlight the change**.
- Optional extras the brief encourages: multiple dates, ancillary context layers, human drivers, storytelling, interactive sliders, personal context.

---

## 2. Data reality check (verified tonight)

- **NISAR L-band data is public.** VALIDATED data has been out since 2026-11-06 for acquisitions from 2026-10-21 onward. PROVISIONAL covers 2026-06-17 to 2026-10. Permanent gap: 2026-07-27 to 2026-08-10. Source: [ASF availability](https://nisar-docs.asf.alaska.edu/availability-overview/).
- **GIBS serves NISAR GCOV tiles.** I parsed the GIBS WMTS capabilities file:
  - Layer: `NISAR_L2_Geocoded_Polarimetric_Covariance`, PNG, EPSG:3857, `GoogleMapsCompatible_Level13` (about 15.6 m resampling)
  - Daily dates: 2025-10-29 to 2026-11-13
  - Tile template: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/NISAR_L2_Geocoded_Polarimetric_Covariance/default/{YYYY-MM-DD}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`
  - No authentication needed. Days without data return an empty 288-byte PNG. Dates inside the gaps return 404.
  - Docs mention a `..._12Day` rolling-mosaic layer, but it returned HTTP 400 on the epsg3857 "best" endpoint, so don't rely on it.
- **Colour key** ([ASF Worldview page](https://nisar-docs.asf.alaska.edu/worldview/)): co-pol (HH or VV) goes to red and blue, cross-pol (HV or VH) goes to green.
  - Calm water appears blue or dark.
  - Vegetation appears green.
  - Urban or bare ground appears orange or yellow.
  - The dB stretch is **not documented**, and pixel colours didn't match R=B exactly (lake median RGB is about 18,32,72). So **don't compute statistics from the PNGs**. My test classification of them was noisy.
- **Tonle Sap coverage.** Probe of tile z8/y118/x201, the NW half of the lake, scanned for every date from 2025-10-29 on.
  - Full-coverage passes every 12 days: **2026-06-19, 07-01, 07-13, 07-25, 08-18, 08-30, 09-11, 09-23, 10-05, 10-17, 10-29**.
  - Partial passes: 06-24, 07-06, 07-08, …
  - No coverage there before June 2026. The BETA products only covered a subset.
  - The June and October tiles differ sharply. In June the lake margin shows orange fields and blue paddies. By October it shows a dark flood and bright green flooded forest.
- **GCOV HDF5 granules** (CMR search, collection `NISAR_L2_GCOV_PROVISIONAL_V1`, bbox 103.6,12.4,104.6,13.2):
  - 41 granules from June to mid-November, each **1.3-1.9 GB**.
  - Consistent stack: **track 076, descending, frame 082**, every 12 days. Mostly `DHDH` (HH+HV); some dates are `SHSH` (HH only).
  - So **HH exists on every date**. Build the time series on HH.
  - Granules from 2026-10-21 onward are in `NISAR_L2_GCOV_V1` (VALIDATED). Mixing the two maturities is OK for a hackathon, but say so on the page.
- **Access:**
  - Earthdata Login (`.netrc`), then `earthaccess` or `asf_search`.
  - ASF says GDAL `/vsicurl/` can subset HDF5 without downloading the whole file ([access overview](https://nisar-docs.asf.alaska.edu/access-overview)).
  - Harmony subsetting for NISAR is still "being developed".
  - h5py walkthrough: [NISAR Cookbook](https://asfopensarlab.github.io/NISAR_Cookbook/notebooks/opening-hdf5-python).
  - Dataset path pattern: `/science/LSAR/GCOV/grids/frequencyA/HHHH` (unverified path; check the Cookbook).

---

## 3. Three concepts, ranked

| # | Concept | Pitch | Core interaction | Change type | Winnability | Feasible in 6 h solo |
|---|---|---|---|---|---|---|
| **1** | **Tonle Sap Pulse** | "Watch Southeast Asia's largest lake breathe, through monsoon clouds, with L-band radar." | Scrub or play a 12-day timeline, swipe before/after, see a flooded-area chart, read hypothesis cards, drop observation pins. An "Explore anywhere" toggle lets you pan the globe on the same layer. | Seasonal flood inundation, including flooded forest | **High** | **High.** Tiles exist; the only real risk is the stats step |
| 2 | Radar Eyes: Spot the Change | "Can you read the Earth like a radar?" | A quiz for classrooms: two NISAR dates side by side, guess the change and the polarization that shows it, reveal the explainer, scores stored in Supabase | Several (flood, crops, glacier…) | Medium. Strong for storytelling and education, weaker on Validity and data depth | High for code. Medium overall, because curating real 2026 events takes research time |
| 3 | Paddy Clock | "A rice-calendar map for the Mekong from radar alone." | Per-pixel HH/HV time series turned into planting, flooding and harvest dates, with a map for agriculture planners | Agriculture | High if it works (Validity, Impact) | **Low.** Needs about 10 GCOV granules (15+ GB) and per-pixel time-series logic |

Rejected: InSAR subsidence from GUNW (e.g., Jakarta). The impact is great, but it would need a multi-pair time-series inversion. Not tonight.

**Why #1 wins on each criterion:**
- **Impact:** Tonle Sap's flood pulse drives fisheries and rice for millions of Cambodians (unverified figure, roughly 1M+ people depend on the lake; cite a source before using it). Monsoon clouds blind optical satellites exactly when the flood peaks.
- **Creativity:** the timeline animation is the "dance", and NISAR is only months old. It is also the first SAR global-winner category entry, if it wins.
- **Validity:** the hypotheses rest on textbook L-band physics, and the km² numbers come from calibrated GCOV dB values.
- **Relevance:** NISAR is the whole product, and the polarization question is answered directly.
- **Presentation:** it is a regional story for a Singapore-based builder, and the before/after frames are dramatic.

**Hypotheses to put in the app** (standard SAR physics, worded per [Earthdata SAR intro](https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar); verify wording before quoting):
- **Open water is dark.** Specular reflection sends the signal away from the sensor, so both HH and HV are low.
- **Flooded forest and shrubs get brighter in HH.** L-band (about 24 cm) penetrates the canopy, and water plus trunks create double-bounce. That makes co-pol very bright. HV mostly tracks canopy volume. This is the NISAR edge: C-band (Sentinel-1) penetrates canopy much less (unverified as a quantitative claim).
- **Drivers:**
  - The SW monsoon (May-Oct) raises the Mekong, which reverses the Tonle Sap River into the lake. The lake then grows from roughly 2,500-3,000 km² to 10,000-16,000 km² (unverified, commonly cited) and recedes from November.
  - Human drivers: upstream Mekong dams weakening the pulse, rice cultivation cycles, flooded-forest clearing.
- **Future use:** 12-day all-weather flood maps for Cambodia's disaster agencies and fisheries management.

---

## 4. MVP for Tonle Sap Pulse

### Must-have, one page, map first

1. **Map** (MapLibre GL) with a basemap and the NISAR GIBS raster layer for the selected date. Centre about 104.0E, 12.9N, zoom 8-10.
2. **Timeline** with the 11 dates above (hard-coded JSON), a slider and a Play button. Play steps through dates for the time-lapse.
3. **Before/after swipe** between any two dates. Default: 2026-06-19 against the flood peak. Pick the peak from the stats; visually it is 10-05 or 10-17.
4. **Flood chart** (Recharts): open water and flooded vegetation in km² per date. Clicking a point jumps the map to that date.
5. **"How to read radar" legend and 3 hypothesis cards:** the colour key, which polarization shows what, and the physical drivers including human ones.
6. **Observation pins.** Click the map, pick a change type, add a note of 280 characters or fewer, and it saves to Supabase anonymously. Everyone's pins are shown.
7. **About/method panel:** data sources, method, thresholds, limitations (PROVISIONAL/VALIDATED mix, single track), SI disclosure, references.

### Should-have, if ahead of schedule

- **An optical comparison toggle** for the same date, using a GIBS MODIS true-colour layer (layer id `MODIS_Terra_CorrectedReflectance_TrueColor`, confirmed in the GIBS epsg3857 capabilities file). It shows "optical sees cloud, NISAR sees flood". This is the strongest 5-second demo beat, and it is cheap because it reuses the same tile code.
- **"Explore anywhere" mode:** unlock panning plus a date picker over all GIBS dates, with no stats. The code is almost free.
- A static change-map overlay PNG of the HH dB difference between baseline and peak, made by the Python script.

### Data flow

```
Browser ──WMTS──> GIBS NISAR tiles (live, no backend)
Browser ──fetch──> /data/stats.json, /data/dates.json (static, built by Python offline)
Browser ──supabase-js──> annotations table (live)
Python (laptop, offline): earthaccess -> GCOV HDF5 (track 076 D frame 082) -> AOI window -> dB -> thresholds -> stats.json (+ change PNG)
```

**Python, offline only, not deployed:**
- `water_stats.py`:
  1. Log in to Earthdata and find GCOV granules for track 076 frame 082 in the 11 dates.
  2. Open each over HTTPS or by download. Read only the HHHH window inside the AOI, decimated 2-4x.
  3. Compute `10*log10`. Classify **open water** as HH below a threshold, and **flooded vegetation** as HH above a high threshold. Pick both thresholds per date with Otsu on the HH dB histogram, or start near -18 dB and -3 dB (both unverified; tune by eye against the tiles).
  4. Multiply pixel counts by pixel area to get km². Write `stats.json` as `[{date, water_km2, flooded_veg_km2, granule_id, maturity}]`.
- **Time-box: 90 minutes.**
  - If Earthdata or HDF5 blocks you, process only 3 dates (June, peak, latest).
  - If that also fails, switch the chart to a "% of AOI changed vs June baseline" index computed from per-pixel RGB difference of the GIBS tiles. Label it clearly as a visual change index, not a calibrated area.

**Supabase:**
- Must: an `annotations` table (`id uuid`, `created_at`, `obs_date date`, `lng`, `lat`, `change_type text check in (...)`, `note text check length<=280`).
  - RLS: anon may `insert` and `select` only. No update or delete.
  - Validate lng/lat ranges and note length in the table's check constraints, since this is a public write path.
- Optional: `sites` and `site_stats` tables seeded from the JSON. Static JSON in the repo is enough tonight, so skip these unless you want to show multiple sites.

### Precompute vs live

| Precompute (offline) | Live |
|---|---|
| Date list, flood km² stats, change PNG, story text | GIBS tile streaming, annotation insert and select |

### Cut tonight

Auth, a live Python API, km² for user-drawn areas, more than one study site with stats, GUNW/InSAR, S-band, ML classifiers, the 12-day mosaic layer, heavy mobile polish (basic responsive layout stays; keep keyboard focus and alt text).

### Suggested schedule (SGT)

| Time | Work |
|---|---|
| 16:45-17:30 | Scaffold Next.js, MapLibre, GIBS layer, timeline. Start the Earthdata/`earthaccess` download in the background now |
| 17:30-18:45 | Swipe, Play, legend and hypothesis cards |
| 18:45-20:15 | `water_stats.py` to `stats.json`, then the chart (fallback decision at 19:45) |
| 20:15-21:00 | Supabase pins, optical toggle |
| 21:00-21:30 | Deploy to Vercel. Test in an incognito window. Optionally request FortiGuard classification |
| 21:30-23:15 | Deliverables (below) |
| 23:15-23:59 | Buffer. **Submit by 23:30**, at the latest 23:59 local time of your Local Event |

---

## 5. Submission deliverables (verified, [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))

**Project page fields:**
- Project Name
- High-Level Summary
- **Link to Project Demo**
- **Link to Final Project**
- Detailed Description: what it does, how it works, benefits, tools used
- SI usage: not shown to judges, but any AI-made images need a visible watermark, and AI-assisted code or data must be acknowledged in text or metadata
- **NASA Data used**: at least one NASA dataset is required for a Global Award. NISAR GCOV through ASF and GIBS covers this
- Space Agency Partner data / References: **list every external resource**, including code, libraries, images and basemap

Everything must be in English.

**Demo:**
- Either a **video of 30 seconds or less** (English subtitles if spoken in another language) or a **slide deck of 7 slides or fewer, including the title**. Exceeding the limit makes the project ineligible for Global Judging.
- Host it publicly (YouTube, Drive or GitHub) with no login, and test the link in an incognito window.
- Suggested 30-second script, following the guide's beats:
  - 0-2 s: name
  - 2-5 s: challenge
  - 5-10 s: title and tagline
  - 10-20 s: screen capture of the timeline playing June to October, plus the swipe
  - 20-30 s: the future (all-weather 12-day flood maps for Cambodia)
- Slides must show team name, member names, the chosen challenge, an image of the project, the user experience, and how NASA data makes it possible.

**Other requirements:**
- **Final project link:** the deployed Vercel URL and a **public GitHub repo** (the challenge asks for open source), with a README covering setup, the data method and the SI disclosure.
- **Images on the project page** may be JPG, PNG or GIF up to 10 MB. Add the before/after still and a GIF of the time-lapse.
- **Eligibility:**
  - All members registered at the same Local Event and not waitlisted. A solo builder must be at a Local Event, not the Universal Event.
  - Tick both checkboxes: the terms, and the original-work/references confirmation.
  - Click **"Submit for Judging"** before 23:59 local time.
- **Do not** use NASA logos or branding in generated content.

## Sources

- Challenge: https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/
- Judging & Awards Guide: https://www.spaceappschallenge.org/resources/judging-awards-guide/
- Project Submission Guide: https://www.spaceappschallenge.org/resources/project-submission-guide/
- 2025 winners: https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/
- 2024 winners: https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/
- 2023 winners: https://science.nasa.gov/directorates/smd/2023-nasa-international-space-apps-challenge-announces-10-global-winners
- NISAR availability: https://nisar-docs.asf.alaska.edu/availability-overview/
- NISAR products: https://nisar-docs.asf.alaska.edu/products-overview
- NISAR access: https://nisar-docs.asf.alaska.edu/access-overview
- NISAR tools: https://nisar-docs.asf.alaska.edu/tools-services-overview
- NISAR in Worldview (colour key): https://nisar-docs.asf.alaska.edu/worldview/
- GIBS WMTS capabilities (layer verified): https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
- CMR granule search (sizes and tracks verified): https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2854338529-ASF
- NISAR Cookbook (h5py): https://asfopensarlab.github.io/NISAR_Cookbook/notebooks/opening-hdf5-python
- Earthdata SAR intro: https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar
