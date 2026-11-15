# PLAN (order / tier / deps)
1. pipeline — Heavy — none. Stream clipped NISAR GCOV for sg_reclaim + riau, HV dB PNGs, change PNGs, polygon stats, create Supabase schema + upload. Fallback ladder documented in brief.
2. web — Medium — none (parallel with 1, separate dir). Next.js app per SPEC + design spec; reads Supabase, degrades to GIBS-only if no rows.
3. integrate + review — orchestrator — 1,2. Browse screenshots, fix, deploy Vercel.
4. submission copy — orchestrator — 3. Team name/description, project page text, 30s video script, README refs + AI disclosure.
