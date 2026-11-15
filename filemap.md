docs/SPEC.md — goals, data contract, stack
docs/PLAN.md — task order and tiers
docs/research/ — data.md (NISAR access), solution.md (judging, MVP), singapore.md (local context)
pipeline/ — offline Python: fetch NISAR GCOV clips, make overlays/stats, upload to Supabase
web/ — Next.js map app (README.md)
web/app/ — layout, globals.css (tokens, all styles), page
web/components/ — App (state, chapters), SwipeMap (two synced MapLibre maps), PassRuler, Loader, Scramble, StatsChart, About
web/lib/data.ts — GIBS tile URLs, default dates/bounds, Supabase + manifest.json loader
web/public/overlays/ — pipeline drops PNGs + manifest.json here
