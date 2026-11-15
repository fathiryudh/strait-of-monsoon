docs/SPEC.md — goals, data contract, stack
docs/PLAN.md — task order and tiers
docs/research/ — data.md (NISAR access), solution.md (judging, MVP), singapore.md (local context)
pipeline/ — offline Python: fetch NISAR GCOV clips, make overlays/stats, upload to Supabase
pipeline/run.py — AOI config + polygons, ASF search, chunk-level HDF5 streaming, HV/change PNGs, stats, `upload` and `web` commands
pipeline/schema.sql — Supabase tables scenes/stats, RLS public select, public bucket `overlays` (run in SQL editor)
pipeline/README.md — how to run, method, granule IDs, thresholds, caveats
pipeline/out/ — generated PNGs per AOI + manifest.json (scenes, stats, polys); copied to web/public/overlays/
pipeline/data/raw/ — gitignored .npy cache of fetched clips
web/ — Next.js map app (README.md)
web/app/ — layout, globals.css (tokens, all styles), page
web/components/ — App (state, chapters), SwipeMap (two synced MapLibre maps), PassRuler, Loader, Scramble, StatsChart, About
web/lib/data.ts — GIBS tile URLs, default dates/bounds, Supabase + manifest.json loader
web/public/overlays/ — pipeline drops PNGs + manifest.json here
