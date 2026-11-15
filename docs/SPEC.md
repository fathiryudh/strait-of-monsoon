# Through the Haze — SPEC

NASA Space Apps 2026, challenge "Dancing with the SARs". Solo, deadline 2026-11-15 23:59 SGT (submit by 23:30).
Idea (user's own): show what Singapore can't see through haze and cloud: Riau peat fires/burn scars and Singapore's reclaimed land, using NISAR L-band radar.

## Goals
- Wow in 5 seconds: swipe between hazy/cloudy optical imagery and NISAR radar of the same place.
- Chapter 1 "The haze": Riau peatland (~101.5-102.5E, 0.8-1.6N). Optical true colour + fire hotspots vs NISAR; HV change overlay (burn scars / peat change).
- Chapter 2 "The land we made": Tuas + Pulau Tekong + Johor Strait (bbox 103.55,1.15,104.10,1.65). NISAR time-lapse (track 011_A_002, 12-day repeats 2026-07-08..11-05) + HV change overlay + per-area HV dB chart.
- Explore mode: free pan, any date, NISAR GIBS layer worldwide.
- Science notes: why HV (volume scattering from vegetation; loss = clearing/burn/sand), drivers (peat drainage + dry season/El Nino fires; reclamation sand fill, construction).

## Non-goals (cut tonight)
Live Python API, auth, user-drawn AOIs, InSAR/deformation processing, mobile-first polish beyond "works at 375px".

## Stack
- web/: Next.js (App Router, TypeScript), maplibre-gl, @supabase/supabase-js, Recharts. Deployed on Vercel.
- pipeline/: Python 3.12 via uv. asf_search, fsspec/aiohttp, h5py/h5netcdf, xarray, rioxarray, rasterio, numpy, matplotlib, supabase. Run once offline on the laptop.
- Supabase: public Storage bucket `overlays`; tables below.

## Live tile sources (no backend)
- NISAR: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/NISAR_L2_Geocoded_Polarimetric_Covariance/default/{YYYY-MM-DD}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png
- Optical: GIBS `MODIS_Terra_CorrectedReflectance_TrueColor` (and/or VIIRS SNPP true colour) same URL pattern, check TileMatrixSet in capabilities.
- Fires: GIBS VIIRS thermal anomalies layer (exact id from https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml).

## Data contract (pipeline → Supabase → web)
```sql
create table scenes (
  id bigserial primary key,
  aoi text not null,            -- 'riau' | 'sg_reclaim'
  date date not null,           -- for kind='change': the later date
  date_from date,               -- for kind='change': the baseline date
  kind text not null,           -- 'hv' | 'change'
  png_url text not null,        -- public Storage URL
  bounds jsonb not null,        -- [west, south, east, north] EPSG:4326
  maturity text                 -- 'PROVISIONAL' | 'VALIDATED'
);
create table stats (
  aoi text not null, poly_id text not null, poly_name text not null,
  date date not null, mean_hv_db real not null,
  primary key (aoi, poly_id, date)
);
-- RLS on, public select policy on both, no public insert.
```
Overlay PNGs: EPSG:4326-aligned rectangle (so MapLibre `image` source with 4 corners from bounds is exact), transparent nodata.
Change PNG colormap: diverging, -6..+6 dB, |dHV|<3 dB transparent.

## Env
`.env.local` at repo root: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY. Earthdata via ~/.netrc (already set up). Never commit .env*.

## MVP done
Deployed URL with both chapters + explore; swipe works; time-lapse plays; at least one change overlay and one chart from Supabase; README with data sources, references, AI-use disclosure.
