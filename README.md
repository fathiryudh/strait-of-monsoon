# Through the Haze

My project for NASA Space Apps Challenge 2026, "Dancing with the SARs".
Live: https://through-the-haze.vercel.app

When the haze comes, normal satellite photos of Riau and Singapore are mostly just smoke and cloud. NISAR's L-band radar can still see the ground, so I put the two next to each other and used NISAR GCOV data to track what changes every 12 days.

The app has three parts. In 01 Haze you swipe between MODIS true colour and NISAR radar over Riau's peatland (around Giam Siak Kecil-Bukit Batu, Bengkalis), with an HV change map from Jul 3 to Oct 19, 2026. 02 Land is a 10-pass time-lapse over Tuas, Pulau Tekong and the Johor Strait, Jul 8 to Nov 5, 2026. 03 Explore lets you look at NISAR anywhere on any date through NASA GIBS.

## What I found
- In Riau, one plantation block lost 5.1 dB of HV backscatter from July to October, which looks like clearing or burning. A regrowth block went up 3.2 dB, and the intact peat swamp forest stayed flat at about -10 dB.
- HV picked up the clearing way better than HH did (HH only moved -1.7 dB in the same block). HV mostly comes from the canopy, so it drops a lot when the canopy is gone.
- Singapore's reclaimed land barely moved, within ±0.6 dB over the four months. Settlement there is millimetres, so you'd need InSAR to see it, and that's what I'd do next. HH did catch construction at Changi East.

## How it works
`pipeline/` is Python 3.12 (uv). It searches ASF for NISAR L2 GCOV, reads only the HDF5 chunks over each area through HTTPS, turns HV/HH into dB at 40 m, makes change maps (±3 dB, with water and patches under 8 ha masked) and per-area stats, then uploads it all to Supabase. Granule IDs and caveats are in `pipeline/README.md`.

`web/` is Next.js with MapLibre, Supabase and Recharts. The live tiles come straight from NASA GIBS (NISAR GCOV, MODIS Terra, VIIRS thermal anomalies, GPW population). More in `web/README.md`.

## Data
NISAR L2 GCOV (NASA/ISRO, via ASF DAAC), NASA GIBS, MODIS Terra corrected reflectance, VIIRS NOAA-20 thermal anomalies, SEDAC GPW v4 population density. My research notes and sources are in `docs/research/`.

## AI use
I wrote the code with help from AI (Claude Code). The idea, the places, the data choices and the story are mine.

## License
MIT
