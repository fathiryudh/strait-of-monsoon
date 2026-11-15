# Submission text (copy into the Space Apps project page)

## Project Name
Strait of Monsoon

## High-Level Summary
The monsoon hits all of Southeast Asia, but it does different things in different places, and during the monsoon most satellite photos are just cloud. NISAR's L-band radar sees through cloud, so I built a guided map, simple enough for kids, that shows what the monsoon does to the ground. It starts in Singapore (cloud vs radar, and how to read the radar colours), goes to Cambodia's Tonle Sap, where you press play and watch the lake grow almost 4 times between June and October 2026, then to central Thailand, where you swipe between before and after radar of this year's floods. After the tour you can explore on your own.

## Link to Project Demo
<YouTube/Drive link to the 30 s video, test it in incognito>

## Link to Final Project
https://through-the-haze.vercel.app
Code: https://github.com/fathiryudh/through-the-haze

## Detailed Description
It opens with an 11-step guided tour. Each step moves the map, turns on the right layers, points at what to look at, and asks you to do something (drag the line, press play). In Singapore you see a camera image that's almost all cloud on 8 July 2026, drag a line to reveal NISAR radar underneath, learn what the colours mean (green is plants, orange is buildings, dark blue is calm water), and see the land Singapore made at Pulau Tekong and Changi East. At Tonle Sap you press play through the 2026 passes and watch the lake spread, with a chart of open water area. In central Thailand you compare radar from 6 September and 12 October and see the new floodwater around the Chao Phraya and Bang Pakong rivers. After that there are free chapters for Singapore, Tonle Sap, the Thailand floods, Riau's forests in Indonesia, and NISAR anywhere.

What I found: Tonle Sap's open water grew from 323 km² on 19 June to 1,239 km² on 17 October, almost 4 times (this NISAR frame covers the western two-thirds of the lake, so those numbers are for that part). The drop to 965 km² on 29 October might partly be a calibration change, since it's the first VALIDATED date. The driver is the monsoon: the Mekong gets so full it reverses the Tonle Sap River and pushes water into the lake, which brings fish and rich mud for rice. In Thailand, weeks of heavy rain filled the rivers until they spilled over. In Chachoengsao province about 437 km² was flooded and nearly 59,000 households were affected by early October, and the radar shows it draining by 5 November. Singapore's reclaimed land stayed steady within ±0.6 dB over July to November.

Polarization: flooded forest at Tonle Sap comes back very bright because the echo bounces off the water and then the tree trunks, while open water looks dark. In Riau, HV picked up tree harvesting much better than HH (-5.1 dB vs -1.7 dB in the same block), because HV mostly comes from the canopy.

How it works: a Python pipeline searches ASF for NISAR L2 GCOV granules and reads only the HDF5 chunks over each area through HTTPS (about 100 MB per date instead of about 5 GB). It turns HH and HV into dB, makes water masks (fixed -17 dB HH threshold for Tonle Sap), change maps and per-area stats, and uploads them to Supabase. The Next.js and MapLibre site reads from Supabase and pulls live tiles from NASA GIBS.

Who it could help: teachers and students who want to see the region's monsoon rhythm, not just a weather report. Flood and water planners on the Mekong, who could get the lake's size every 12 days even under cloud. Land and coastal agencies watching reclaimed land and forests through the wet season.

What I'd do next: flood maps that update with every pass during a storm, spotting slopes that are about to slide, InSAR to measure land slowly sinking, and crop calendars for rice from the radar alone.

**Why I built this.** I'm Indonesian and I've been staying in Singapore since 2003. Both countries share the same monsoon, the same clouds and the same seasons, and I've always wondered what's actually happening on the ground across the region. NISAR's radar lets me look.

**Tools.** Python 3.12, uv, asf_search, h5py, NumPy, rasterio, matplotlib, supabase-py; Next.js, TypeScript, MapLibre GL, Recharts, supabase-js; Supabase (Postgres and Storage); Vercel.

## AI usage
I wrote the code with help from AI (Claude Code). The idea, the places, the data choices and the story are mine. There are no AI-generated images.

## NASA Data
- NISAR L2 GCOV (Geocoded Polarimetric Covariance), NASA/ISRO, via ASF DAAC: https://search.asf.alaska.edu
- NASA GIBS (WMTS): https://gibs.earthdata.nasa.gov, using the layers NISAR_L2_Geocoded_Polarimetric_Covariance, MODIS_Terra_CorrectedReflectance_TrueColor and GPW_Population_Density_2020 (SEDAC)
- NISAR colour key: ASF NISAR Worldview docs, https://nisar-docs.asf.alaska.edu/worldview/

## References
- Challenge: https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/
- ASF NISAR Cookbook: https://github.com/ASFOpenSARlab/NISAR_Cookbook
- Thailand flood impact: Nation Thailand / DDPM and other sources listed in docs/research/monsoon-events.md
- Singapore reclamation facts: docs/research/singapore.md
- Basemap: Esri World Dark Gray Canvas (Esri, HERE, Garmin, OpenStreetMap contributors)
- Libraries: Next.js, MapLibre GL JS, Recharts, Supabase, asf_search, h5py, NumPy, rasterio, matplotlib

# 30-second video script

| Time | On screen | Voice / caption |
|---|---|---|
| 0-3 s | Title: STRAIT OF MONSOON | "Strait of Monsoon, by Fathir." |
| 3-8 s | Tour step 1, Singapore all cloud | "NASA Space Apps, Dancing with the SARs. In the monsoon, satellite photos of Southeast Asia are mostly cloud." |
| 8-13 s | Drag the line, radar appears | "NISAR's radar sees through it, every 12 days." |
| 13-20 s | Tonle Sap, press play, lake spreads, chart rises | "In Cambodia, the monsoon made Tonle Sap almost 4 times bigger by October." |
| 20-26 s | Thailand before/after swipe | "In Thailand, it showed this year's floods spreading, and draining." |
| 26-30 s | URL card | "Next: live flood maps and landslide warnings. through-the-haze.vercel.app" |

Keep it at 30 s or less (longer makes you ineligible). Add English captions.
