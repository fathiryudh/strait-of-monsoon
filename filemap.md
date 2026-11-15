docs/SPEC.md — goals, data contract, stack
docs/PLAN.md — task order and tiers
docs/research/ — data.md (NISAR access), solution.md (judging, MVP), singapore.md (local context)
pipeline/ — offline Python: fetch NISAR GCOV clips, make overlays/stats, upload to Supabase
pipeline/run.py — AOI config + polygons, ASF search, chunk-level HDF5 streaming (HV+HH), gray/change PNGs, stats, `upload` and `web` commands; tonle_sap lake water-mask AOI (HH only, `water_km2`)
pipeline/schema.sql — Supabase tables scenes/stats, RLS public select, public bucket `overlays` (run in SQL editor)
pipeline/README.md — how to run, method, granule IDs, thresholds, caveats
pipeline/out/ — generated PNGs per AOI + manifest.json (scenes, stats, polys); copied to web/public/overlays/
pipeline/data/raw/ — gitignored .npy cache of fetched clips
web/ — Next.js map app (README.md)
web/app/ — layout, globals.css (tokens, all styles), page
web/components/ — App (state, guided tour panel, chapters, overlay toggles), SwipeMap (two synced MapLibre maps, swipe glide, compare mode, markers, processed/water/change/population layers, tile status chip), PassRuler, Loader, Scramble, StatsChart, About
web/lib/tour.ts — guided tour steps (TOUR) and flood events (EVENTS)
web/lib/data.ts — GIBS tile URLs (NISAR, MODIS, GPW population), default dates/bounds, Supabase + manifest.json loader
web/public/overlays/ — pipeline drops PNGs + manifest.json here
