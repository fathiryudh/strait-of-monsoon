import { createClient } from "@supabase/supabase-js";

export type Scene = {
  aoi: string;
  date: string;
  date_from?: string | null;
  kind: "hv" | "change";
  png_url: string;
  bounds: [number, number, number, number];
  maturity?: string | null;
};
export type Stat = { aoi: string; poly_id: string; poly_name: string; date: string; mean_hv_db: number };
export type Overlays = { scenes: Scene[]; stats: Stat[] };

export const SG_DATES = [
  "2026-07-08", "2026-07-20", "2026-08-13", "2026-08-25", "2026-09-06",
  "2026-09-18", "2026-09-30", "2026-10-12", "2026-10-24", "2026-11-05",
];
// NISAR passes over Riau (a different track from Singapore), probed against GIBS tile coverage.
export const RIAU_DATES = ["2026-08-20","2026-08-23","2026-09-01","2026-09-04","2026-09-13","2026-09-16","2026-09-25","2026-09-28","2026-10-07","2026-10-10"];
export const RIAU_BOUNDS: [number, number, number, number] = [101.5, 0.8, 102.5, 1.6];
export const SG_BOUNDS: [number, number, number, number] = [103.55, 1.15, 104.1, 1.65];
export const DATE_MIN = "2025-10-29";
export const DATE_MAX = "2026-11-13";

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
export const tiles = {
  nisar: (d: string) => `${GIBS}/NISAR_L2_Geocoded_Polarimetric_Covariance/default/${d}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`,
  modis: (d: string) => `${GIBS}/MODIS_Terra_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
  // GIBS serves VIIRS fires as vector tiles; the WMS endpoint rasterises them for MapLibre raster sources.
  fires: (d: string) =>
    `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=VIIRS_NOAA20_Thermal_Anomalies_375m_All&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE&TIME=${d}`,
};
// GIBS NISAR tiles above z9 currently come back as striped placeholders, so overzoom z9.
export const maxzoom = { nisar: 9, modis: 9, fires: 14 };

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
