# web: Strait of Monsoon

Next.js (App Router, TypeScript) + MapLibre GL + Supabase + Recharts. NASA Space Apps 2026.

## Run
```
cd web
npm install
npm run dev      # http://localhost:3000
npm run build && npm run lint
```
`predev`/`prebuild` copy MapLibre's worker files to `public/maplibre/` (gitignored); the bundler cannot resolve the v6 worker on its own.

## Env
Read from the repo-root `.env.local` (loaded in `next.config.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. On Vercel set the same two variables.

## Data
- Live tiles from NASA GIBS (no backend): `NISAR_L2_Geocoded_Polarimetric_Covariance` (GoogleMapsCompatible_Level13, png), `MODIS_Terra_CorrectedReflectance_TrueColor` (Level9, jpg). NISAR is capped at z8 and overzoomed (z9+ tiles fail at random).
- Basemap: Esri World Dark Gray Canvas (CARTO's keyless tiles return an API-key watermark).
- Overlays and stats: Supabase `scenes` / `stats` (see docs/SPEC.md). Fallback order: Supabase, then `/overlays/manifest.json` (`{scenes, stats}`, relative `png_url` resolved under `/overlays/`), then live GIBS tiles only (overlay and chart controls hide). The fallback fetch logs one 404 in the console when no manifest exists.
- Guided tour (default on load) is data in `lib/tour.ts` (`TOUR` steps, `EVENTS` flood steps).
- Riau, Tonle Sap and Thailand NISAR dates are on different tracks from Singapore's; defaults in `lib/data.ts` were probed against GIBS coverage.

## Credits
Sources are listed in the in-app About panel. Code written with AI assistance (Claude Code); idea, data choices and story by the author.
