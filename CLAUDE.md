# Strait of Monsoon
NASA Space Apps 2026 "Dancing with the SARs". Next.js (web/) + offline Python pipeline (pipeline/) + Supabase.

## Commands
- web: `cd web && npm run dev` / `npm run build` / `npm run lint`
- pipeline: `cd pipeline && uv run python run.py` (Python 3.12 via uv; system python is 3.15, don't use it)

## Conventions
- Secrets live in `.env.local` at repo root; never print or commit them. Earthdata auth is ~/.netrc.
- Overlays are EPSG:4326-aligned PNGs + bounds [w,s,e,n]; MapLibre image sources use those corners.
- Live imagery comes straight from NASA GIBS WMTS; no backend proxy.
- Deadline 2026-11-15 23:59 SGT: prefer the fallback that ships over the method that's nicer.

See docs/SPEC.md, docs/PLAN.md, docs/research/, filemap.md.
