"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { maxzoom, tiles, type Scene } from "@/lib/data";

type Key = "modis" | "nisar" | "fires";
const ORDER = ["modis", "nisar", "fires", "change"];
const keyOf = (id: string) => id.split("-")[0];

const BASE: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tileSize: 256,
      // CARTO's keyless tiles now return an "API key required" watermark, so use Esri's free dark gray canvas.
      tiles: ["https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
      maxzoom: 16,
      attribution: "Esri, HERE, Garmin, OpenStreetMap contributors",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};

/** Keep one raster layer per wanted date; crossfade by opacity, drop layers already faded out. */
function showDates(map: MLMap, key: Key, date: string | null, next?: string | null) {
  const want = [date, next].filter(Boolean) as string[];
  const layers = map.getStyle().layers.filter((l) => keyOf(l.id) === key);
  for (const l of layers) {
    const d = l.id.slice(key.length + 1);
    if (!want.includes(d) && map.getPaintProperty(l.id, "raster-opacity") === 0) {
      map.removeLayer(l.id);
      map.removeSource(l.id);
    }
  }
  for (const d of want) {
    const id = `${key}-${d}`;
    if (map.getSource(id)) continue;
    map.addSource(id, { type: "raster", tiles: [tiles[key](d)], tileSize: 256, maxzoom: maxzoom[key] });
    const later = map.getStyle().layers.find((l) => ORDER.indexOf(keyOf(l.id)) > ORDER.indexOf(key));
    map.addLayer(
      { id, type: "raster", source: id, paint: { "raster-opacity": 0, "raster-opacity-transition": { duration: 700, delay: 0 } } },
      later?.id,
    );
  }
  for (const l of map.getStyle().layers.filter((l) => keyOf(l.id) === key)) {
    map.setPaintProperty(l.id, "raster-opacity", l.id === `${key}-${date}` ? 1 : 0);
  }
}

const fmt = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? "E" : "W"}`;

type Props = {
  swipe: boolean;
  date: string;
  nextDate: string | null;
  fires: boolean;
  view: [number, number, number, number] | null;
  change: Scene | null;
  onCenter: (s: string) => void;
  onLoad: () => void;
};

export default function SwipeMap({ swipe, date, nextDate, fires, view, change, onCenter, onLoad }: Props) {
  const optEl = useRef<HTMLDivElement>(null);
  const radEl = useRef<HTMLDivElement>(null);
  const opt = useRef<MLMap | null>(null);
  const rad = useRef<MLMap | null>(null);
  const cb = useRef({ onCenter, onLoad });
  useEffect(() => {
    cb.current = { onCenter, onLoad };
  });
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  useEffect(() => {
    let dead = false;
    let maps: MLMap[] = [];
    (async () => {
      const { Map: ML, AttributionControl, setWorkerUrl } = await import("maplibre-gl");
      setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); // bundlers cannot resolve the v6 worker; copied by the pre* scripts
      if (dead || !optEl.current || !radEl.current) return;
      const mk = (el: HTMLElement) =>
        new ML({ container: el, style: BASE, center: [102, 1.2], zoom: 7, maxPitch: 0, attributionControl: false, fadeDuration: 0 });
      const a = mk(optEl.current);
      const b = mk(radEl.current);
      maps = [a, b];
      opt.current = a;
      rad.current = b;
      b.addControl(new AttributionControl({ compact: true, customAttribution: "Imagery: NASA GIBS (NISAR, MODIS, VIIRS)" }), "top-right");
      let lock = false;
      const link = (s: MLMap, d: MLMap) =>
        s.on("move", () => {
          if (lock) return;
          lock = true;
          d.jumpTo({ center: s.getCenter(), zoom: s.getZoom(), bearing: s.getBearing() });
          lock = false;
        });
      link(a, b);
      link(b, a);
      b.on("moveend", () => {
        const c = b.getCenter();
        cb.current.onCenter(fmt(c.lat, c.lng));
      });
      let n = 0;
      for (const m of maps) {
        m.on("error", () => {}); // tile 404s outside NISAR coverage are expected
        m.once("load", () => {
          if (++n === 2 && !dead) {
            setReady(true);
            cb.current.onLoad();
          }
        });
      }
    })();
    return () => {
      dead = true;
      maps.forEach((m) => m.remove());
      opt.current = rad.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !opt.current || !rad.current) return;
    showDates(rad.current, "nisar", date, nextDate);
    showDates(opt.current, "modis", swipe ? date : null);
    showDates(opt.current, "fires", swipe && fires ? date : null);
  }, [ready, date, nextDate, swipe, fires]);

  const first = useRef(true);
  useEffect(() => {
    if (!ready || !view || !rad.current) return;
    const small = window.innerWidth <= 768;
    rad.current.fitBounds([[view[0], view[1]], [view[2], view[3]]], {
      padding: small ? { top: 100, bottom: window.innerHeight * 0.55, left: 20, right: 20 } : { top: 80, bottom: 60, left: 60, right: 60 },
      duration: first.current ? 0 : 2200,
      maxZoom: 12,
    });
    first.current = false;
  }, [ready, view]);

  useEffect(() => {
    const m = rad.current;
    if (!ready || !m) return;
    if (m.getLayer("change")) m.removeLayer("change");
    if (m.getSource("change")) m.removeSource("change");
    if (!change) return;
    const [w, s, e, n] = change.bounds;
    m.addSource("change", { type: "image", url: change.png_url, coordinates: [[w, n], [e, n], [e, s], [w, s]] });
    m.addLayer({ id: "change", type: "raster", source: "change", paint: { "raster-opacity": 0.85, "raster-fade-duration": 0 } });
  }, [ready, change]);

  const setFromX = (x: number) => {
    const r = radEl.current?.getBoundingClientRect();
    if (r) setPos(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
  };

  return (
    <div className="maps">
      <div ref={radEl} className="map" />
      <div ref={optEl} className="map" style={{ clipPath: `inset(0 ${swipe ? 100 - pos : 100}% 0 0)` }} />
      {swipe && (
        <>
          <span className="chip chip-l">Optical · MODIS Terra</span>
          <span className="chip chip-r">Radar · NISAR L-band</span>
          <div className="scan" style={{ left: `${pos}%` }} />
          <div className="divider" style={{ left: `${pos}%` }}>
            <div
              className="handle"
              role="slider"
              tabIndex={0}
              aria-label="Swipe divider between optical and radar"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pos)}
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => dragging.current && setFromX(e.clientX)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 2));
                if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 2));
              }}
            >
              <span aria-hidden="true">◀ ▶</span>
            </div>
          </div>
        </>
      )}
      <span className="reticle" aria-hidden="true" />
      {!swipe && <span className="chip chip-r">Radar · NISAR L-band</span>}
    </div>
  );
}
