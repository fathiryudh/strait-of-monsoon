# Through the Haze

NASA Space Apps Challenge 2026, "Dancing with the SARs".
Live: https://through-the-haze.vercel.app

Optical satellites lose Riau and Singapore under haze and cloud for much of the year. NISAR's L-band radar doesn't. This app puts the two side by side and uses NISAR GCOV data to track surface change every 12 days.

- **01 Haze:** Riau peatland (Giam Siak Kecil-Bukit Batu area, Bengkalis). Swipe MODIS true colour against NISAR radar, then look at an HV change map from Jul 3 to Oct 19, 2026.
- **02 Land:** Singapore, Tuas, Pulau Tekong and the Johor Strait. A 10-pass time-lapse, Jul 8 to Nov 5, 2026.
- **03 Explore:** NISAR anywhere, any date (NASA GIBS).

## Findings
- Riau: a plantation block lost 5.1 dB of HV backscatter from July to October (clearing or burn), a regrowth block gained 3.2 dB, and intact peat swamp forest stayed flat at about -10 dB.
- HV shows the clearing far better than HH (HH: -1.7 dB in the same block). Canopy volume scattering drives HV, so it reacts more when the canopy goes.
- Singapore's reclaimed areas were stable within ±0.6 dB over these four months. Settlement there is mm-scale and needs InSAR, which is a next step. HH picks up construction at Changi East.

## How it works
- `pipeline/`: Python 3.12 (uv). Searches ASF for NISAR L2 GCOV, reads only the clipped HDF5 chunks over HTTPS, converts HV/HH to dB at 40 m, makes change maps (±3 dB, water and <8 ha masked) and per-area stats, and uploads them to Supabase. See `pipeline/README.md` for granule IDs and caveats.
- `web/`: Next.js, MapLibre, Supabase and Recharts. Live tiles come from NASA GIBS (NISAR GCOV, MODIS Terra, VIIRS thermal anomalies, GPW population). See `web/README.md`.

## Data
NISAR L2 GCOV (NASA/ISRO, via ASF DAAC), NASA GIBS, MODIS Terra corrected reflectance, VIIRS NOAA-20 thermal anomalies, SEDAC GPW v4 population density. Research notes and sources are in `docs/research/`.

## AI use
Code was written with AI assistance (Claude Code). The idea, data choices and story are the author's.

## License
MIT
