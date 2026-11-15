import { createClient } from "@supabase/supabase-js";

export type Scene = {
  aoi: string;
  date: string;
  date_from?: string | null;
  kind: "hv" | "hh" | "change" | "change_hh" | "water";
  png_url: string;
  bounds: [number, number, number, number];
  maturity?: string | null;
};
export type Stat = { aoi: string; poly_id: string; poly_name: string; date: string; mean_hv_db?: number | null; mean_hh_db?: number | null; water_km2?: number | null };
export type Overlays = { scenes: Scene[]; stats: Stat[] };

export const SG_DATES = [
  "2026-07-08", "2026-07-20", "2026-08-13", "2026-08-25", "2026-09-06",
  "2026-09-18", "2026-09-30", "2026-10-12", "2026-10-24", "2026-11-05",
];
// NISAR passes over Riau (a different track from Singapore), from the pipeline manifest.
export const RIAU_DATES = ["2026-07-03","2026-07-15","2026-08-20","2026-09-01","2026-09-13","2026-09-25","2026-10-07","2026-10-19","2026-10-31"];
// Tonle Sap, track 076 descending, frame 082 (full coverage checked on GIBS).
export const TONLE_DATES = ["2026-06-19","2026-07-01","2026-07-13","2026-07-25","2026-08-18","2026-08-30","2026-09-11","2026-09-23","2026-10-05","2026-10-17","2026-10-29"];
export const TONLE_BOUNDS: [number, number, number, number] = [103.3, 12.35, 104.05, 13.35];
export const RIAU_BOUNDS: [number, number, number, number] = [101.7, 1.0, 102.2, 1.5];
export const SG_BOUNDS: [number, number, number, number] = [103.55, 1.15, 104.1, 1.65];
export const DATE_MIN = "2025-10-29";
export const DATE_MAX = "2026-11-13";

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
export const tiles = {
  nisar: (d: string) => `${GIBS}/NISAR_L2_Geocoded_Polarimetric_Covariance/default/${d}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`,
  modis: (d: string) => `${GIBS}/MODIS_Terra_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
};
// GIBS NISAR tiles above z8 come back as striped placeholders or HTTP 500 at random (z9 too); z8 never failed, so overzoom z8.
export const maxzoom = { nisar: 8, modis: 9 };
// GPW population density 2020 (static, GoogleMapsCompatible_Level7 only).
export const POP_TILES = `${GIBS}/GPW_Population_Density_2020/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;

const abs = (u: string) => (/^(https?:)?\//.test(u) ? u : `/overlays/${u}`);

function clean(o: unknown): Overlays | null {
  const x = o as { scenes?: Scene[]; stats?: Stat[] } | Scene[] | null;
  const scenes = (Array.isArray(x) ? x : x?.scenes) ?? [];
  const stats = (Array.isArray(x) ? [] : x?.stats) ?? [];
  if (!scenes.length && !stats.length) return null;
  return { scenes: scenes.map((s) => ({ ...s, png_url: abs(s.png_url) })), stats };
}

/** Supabase first, then /overlays/manifest.json, else null. Never throws. */
export async function loadOverlays(): Promise<Overlays | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const sb = createClient(url, key);
      const [s, t] = await Promise.all([sb.from("scenes").select("*").order("date"), sb.from("stats").select("*").order("date")]);
      if (!s.error && s.data?.length) return clean({ scenes: s.data, stats: t.data ?? [] });
    }
  } catch {}
  try {
    const r = await fetch("/overlays/manifest.json");
    if (r.ok) return clean(await r.json());
  } catch {}
  return null;
}
