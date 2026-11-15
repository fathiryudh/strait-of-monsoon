# Submission text (copy into the Space Apps project page)

## Project Name
Through the Haze

## High-Level Summary
Every dry season the smoke from Indonesia's peat fires drifts over to Singapore, and most satellite photos of the ground turn into grey haze. NISAR's L-band radar sees through cloud and smoke, so I built a map where you can swipe from the hazy photo to the radar view of the same place, play the 12-day passes as a time-lapse, and look at change maps I made from the raw NISAR data. Over Riau's peatland you can see plantation blocks getting cleared between July and October 2026 while the intact peat forest next to them stays the same. Over Singapore you can still see the reclaimed coastline when the optical image is almost all cloud.

## Link to Project Demo
<YouTube/Drive link to the 30 s video, test it in incognito>

## Link to Final Project
https://through-the-haze.vercel.app
Code: https://github.com/fathiryudh/through-the-haze

## Detailed Description
It's a web map with three parts. 01 Haze is Riau's peatland near Bengkalis: MODIS true colour on one side, NISAR radar on the other, an HV change map from Jul 3 to Oct 19, 2026, and a chart of how the radar signal changed in each area. 02 Land is a time-lapse of 10 NISAR passes over Tuas, Pulau Tekong and the Johor Strait, from Jul 8 to Nov 5, 2026. 03 Explore lets you look at NISAR imagery anywhere, on any date. You can flip between HV and HH, turn on fire hotspots or population density, and read what I think is causing each change.

What I found: in Riau, one plantation block lost 5.1 dB of HV from July to October, which looks like clearing or burning. A regrowth block went up 3.2 dB, and the intact peat swamp forest stayed at about -10 dB the whole time. HV showed the clearing much better than HH did (-5.1 vs -1.7 dB in the same block), because HV mostly comes from the canopy and drops hard once it's gone. Singapore's reclaimed land was steady within ±0.6 dB over the four months. Settlement there is millimetres, which needs InSAR, but HH did pick up construction at Changi East. For drivers, I think it's mostly people: peat drainage and plantation clearing in Riau, made worse by the dry season and El Niño, and reclamation and construction around Singapore.

How it works: a Python pipeline searches ASF for NISAR L2 GCOV granules and reads only the HDF5 chunks over each area through HTTPS, so it's about 100 MB per date instead of about 5 GB. It turns HV and HH into dB at 40 m, makes change maps with a ±3 dB threshold (water and patches under 8 ha masked out), works out per-area stats and uploads everything to Supabase. The Next.js and MapLibre site reads from Supabase and pulls live tiles from NASA GIBS.

Who it could help: the radar sees the ground every 12 days no matter the weather, so haze and peat monitoring groups could get clearing alerts in the months when optical satellites are blind. Singapore's coastal and land agencies could follow reclamation through monsoon cloud. And normal people like me could see where the haze actually comes from, not just the PSI number.

What I'd do next: InSAR ground motion for reclaimed land, and for Marina Bay and the East Coast against sea-level rise. Peat moisture and subsidence from L-band as an early warning for fire risk. Automatic 12-day clearing alerts for peat domes. Flood maps for Johor and Singapore.

**Why I built this.** I'm Indonesian and I've been staying in Singapore since 2003. There were times I wondered why people back home kept burning the trees, but I didn't really think about it until the haze got so bad I could barely see the road 20 metres ahead of me when I was riding. If it's that bad in Singapore, I can't imagine what it's like in Riau or Kalimantan where it starts. I'm kind of on the fence about it. I'm affected because I live here, but I'm still Indonesian by blood, and honestly I just don't want to see them destroy nature.

**Tools.** Python 3.12, uv, asf_search, h5py, NumPy, rasterio, matplotlib, supabase-py; Next.js, TypeScript, MapLibre GL, Recharts, supabase-js; Supabase (Postgres and Storage); Vercel.

## AI usage
I wrote the code with help from AI (Claude Code). The idea, the places, the data choices and the story are mine. There are no AI-generated images.

## NASA Data
- NISAR L2 GCOV (Geocoded Polarimetric Covariance), NASA/ISRO, via ASF DAAC: https://search.asf.alaska.edu
- NASA GIBS (WMTS/WMS): https://gibs.earthdata.nasa.gov, using the layers NISAR_L2_Geocoded_Polarimetric_Covariance, MODIS_Terra_CorrectedReflectance_TrueColor, VIIRS_NOAA20_Thermal_Anomalies_375m_All and GPW_Population_Density_2020 (SEDAC)

## References
- Challenge: https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/
- ASF NISAR Cookbook: https://github.com/ASFOpenSARlab/NISAR_Cookbook
- Basemap: Esri World Dark Gray Canvas (Esri, HERE, Garmin, OpenStreetMap contributors)
- Libraries: Next.js, MapLibre GL JS, Recharts, Supabase, asf_search, h5py, NumPy, rasterio, matplotlib
- Context sources (peat hotspots, reclamation figures, InSAR studies of Singapore): see docs/research/singapore.md in the repo

# 30-second video script

| Time | On screen | Voice / caption |
|---|---|---|
| 0-3 s | Title card: THROUGH THE HAZE | "Through the Haze, by Fathir." |
| 3-7 s | Real haze photo or the hazy MODIS side | "NASA Space Apps, Dancing with the SARs. When the haze comes, satellites can't see the ground." |
| 7-14 s | App, chapter 01: drag the swipe from haze to radar | "NISAR's L-band radar can, through smoke and cloud, every 12 days." |
| 14-21 s | Change map plus the chart line dropping | "In Riau, it caught plantation blocks being cleared from July to October, while the peat forest stayed the same." |
| 21-26 s | Chapter 02: time-lapse over Singapore | "Over Singapore, it watches the land we built, even under full cloud." |
| 26-30 s | URL card | "Next: settlement and fire-risk alerts. through-the-haze.vercel.app" |

Keep it at 30 s or less (longer makes you ineligible). Add English captions.
