# Strait of Monsoon

My project for NASA Space Apps Challenge 2026, "Dancing with the SARs".
Live: https://through-the-haze.vercel.app

The monsoon hits all of Southeast Asia, but it doesn't look the same everywhere. In Singapore it's mostly heavy rain and grey skies. In Cambodia it makes a whole lake grow. In Thailand this year it flooded farms and towns. The annoying part is that normal satellite photos during the monsoon are mostly cloud, so you can't actually see any of it. NISAR's L-band radar sees through cloud, so I used it to show what the monsoon does to the ground, every 12 days.

The site opens with a short guided tour that's meant to be easy enough for kids:

1. Singapore. What the camera sees (cloud), what the radar sees, how to read the radar colours, and the land Singapore built at Tekong and Changi East.
2. Tonle Sap, Cambodia. Press play and the lake grows from about 320 km² in June to about 1,240 km² in mid October, because the Mekong gets so full it pushes water back up into the lake. Also how flooded forest looks different to radar.
3. Central Thailand. Before and after radar of the September to October 2026 floods around the Chao Phraya and Bang Pakong rivers.
4. Your turn. What NISAR could do next, then you can explore on your own (there's also a Forests chapter for Riau, Indonesia, and NISAR anywhere through NASA GIBS).

## What I found
- Tonle Sap's open water grew almost 4 times, from 323 km² on 19 June to 1,239 km² on 17 October 2026 (western part of the lake only, which is what this NISAR frame covers). The drop to 965 km² on 29 October may partly be a calibration change, since that's the first VALIDATED date.
- In central Thailand, large areas of farmland turned to standing water between 6 September and 12 October and were draining by 5 November. Camera images on 12 October were mostly cloud.
- Singapore's reclaimed land stayed steady, within ±0.6 dB over July to November. Sinking there is millimetres a year, so you'd need InSAR for that.
- Polarization: in flooded forest at Tonle Sap the echo bounces off the water and then the trunks, so it comes back really bright, while open water looks dark. In Riau, HV picked up tree harvesting way better than HH (-5.1 dB vs -1.7 dB in the same block), because HV mostly comes from the canopy.

## How it works
`pipeline/` is Python 3.12 (uv). It searches ASF for NISAR L2 GCOV, reads only the HDF5 chunks over each area through HTTPS, turns HH/HV into dB, makes change maps and water masks (fixed -17 dB HH threshold for Tonle Sap) and per-area stats, then uploads it all to Supabase. Granule IDs, thresholds and caveats are in `pipeline/README.md`.

`web/` is Next.js with MapLibre, Supabase and Recharts. Live tiles come straight from NASA GIBS (NISAR GCOV, MODIS Terra, GPW population). The tour steps are in `web/lib/tour.ts`. More in `web/README.md`.

## Data
NISAR L2 GCOV (NASA/ISRO, via ASF DAAC), NASA GIBS, MODIS Terra corrected reflectance, SEDAC GPW v4 population density. Thailand flood impact numbers are from Thai news and government sources listed in `docs/research/monsoon-events.md`. Other research notes are in `docs/research/`.

## AI use
I wrote the code with help from AI (Claude Code). The idea, the places, the data choices and the story are mine.

## License
MIT
