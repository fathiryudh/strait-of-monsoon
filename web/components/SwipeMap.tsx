"use client";
import { useEffect, useRef, useState } from "react";
import type { ImageSource, Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { POP_TILES, maxzoom, tiles, type Scene } from "@/lib/data";
import type { Bounds, Marker } from "@/lib/tour";

type Key = "modis" | "nisar";
const ORDER = ["modis", "nisar", "pop", "proc", "water", "change"];
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

const laterThan = (map: MLMap, key: string) => map.getStyle().layers.find((l) => ORDER.indexOf(keyOf(l.id)) > ORDER.indexOf(key))?.id;

/** One image-source layer (our processed PNGs); updateImage swaps the PNG without flicker. */
function setImg(map: MLMap, id: "proc" | "water" | "change", scene: Scene | null, opacity: number) {
  if (!scene) {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    return;
  }
  const [w, s, e, n] = scene.bounds;
  const spec = { url: scene.png_url, coordinates: [[w, n], [e, n], [e, s], [w, s]] as [[number, number], [number, number], [number, number], [number, number]] };
  const src = map.getSource(id) as ImageSource | undefined;
  if (src) return src.updateImage(spec);
  map.addSource(id, { type: "image", ...spec });
  map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opacity, "raster-fade-duration": 0 } }, laterThan(map, id));
}

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
    const later = laterThan(map, key);
    map.addLayer(
      { id, type: "raster", source: id, paint: { "raster-opacity": 0, "raster-opacity-transition": { duration: 700, delay: 0 } } },
      later,
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
  leftDate: string | null; // compare mode: radar on this date left of the line instead of the camera
  date: string;
  nextDate: string | null;
  view: Bounds | null;
  proc: Scene | null;
  water: Scene | null;
  change: Scene | null;
  pop: boolean;
  swipeTo: { pos: number } | null; // a new object glides the divider to pos
  markers: Marker[];
  onSwipe: (pos: number) => void;
  onCenter: (s: string) => void;
  onLoad: () => void;
};

export default function SwipeMap({ swipe, leftDate, date, nextDate, view, proc, water, change, pop, swipeTo, markers, onSwipe, onCenter, onLoad }: Props) {
  const optEl = useRef<HTMLDivElement>(null);
  const radEl = useRef<HTMLDivElement>(null);
  const opt = useRef<MLMap | null>(null);
  const rad = useRef<MLMap | null>(null);
  const cb = useRef({ onCenter, onLoad, onSwipe });
  useEffect(() => {
    cb.current = { onCenter, onLoad, onSwipe };
  });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState(swipeTo?.pos ?? 50);
  const [glide, setGlide] = useState(false);
  const [prevTo, setPrevTo] = useState(swipeTo);
  if (swipeTo !== prevTo) {
    setPrevTo(swipeTo);
    if (swipeTo) {
      setGlide(swipeTo.pos !== pos); // cleared on transitionend; no transition when the value is unchanged
      setPos(swipeTo.pos);
    }
  }
  const dragging = useRef(false);
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    cb.current.onSwipe(pos);
  }, [pos]);

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
      b.addControl(new AttributionControl({ compact: true, customAttribution: "Imagery: NASA GIBS (NISAR, MODIS)" }), "top-right");
      // compact control opens itself on wide screens and covers the radar side; start it collapsed (credits also in About)
      b.once("load", () => radEl.current?.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show"));
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
      const emit = () => {
        const c = b.getCenter();
        cb.current.onCenter(fmt(c.lat, c.lng));
      };
      b.on("moveend", emit);
      b.on("load", emit);
      b.on("dataloading", (e) => "sourceId" in e && e.sourceId.startsWith("nisar") && setBusy(true));
      b.on("idle", () => setBusy(false));
      let n = 0;
      for (const m of maps) {
        m.on("error", () => {}); // tile 404s outside NISAR coverage are expected
        m.once("load", () => ++n === 2 && !dead && setReady(true));
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
    const first = !rad.current.getStyle().layers.some((l) => keyOf(l.id) === "nisar");
    showDates(rad.current, "nisar", date, nextDate);
    if (first) rad.current.once("idle", () => cb.current.onLoad()); // loader waits for the first NISAR tiles
    showDates(opt.current, "modis", swipe && !leftDate ? date : null);
    showDates(opt.current, "nisar", swipe ? leftDate : null);
  }, [ready, date, nextDate, swipe, leftDate]);

  const first = useRef(true);
  useEffect(() => {
    if (!ready || !view || !rad.current) return;
    const small = window.innerWidth <= 768;
    rad.current.fitBounds([[view[0], view[1]], [view[2], view[3]]], {
      padding: small ? { top: 100, bottom: window.innerHeight * 0.55, left: 20, right: 20 } : { top: 90, bottom: 110, left: 40, right: 470 },
      duration: first.current ? 0 : 1600, // MapLibre jumps instead under prefers-reduced-motion
      maxZoom: 12,
    });
    first.current = false;
  }, [ready, view]);

  useEffect(() => {
    const m = rad.current;
    if (!ready || !m) return;
    setImg(m, "proc", proc, 1);
    setImg(m, "water", water, 0.7);
    setImg(m, "change", change, 0.85);
  }, [ready, proc, water, change]);

  useEffect(() => {
    const m = rad.current;
    if (!ready || !m) return;
    const upd = () => setPts(markers.map((k) => m.project(k.lngLat)));
    const raf = requestAnimationFrame(upd);
    m.on("move", upd);
    m.on("resize", upd);
    return () => {
      cancelAnimationFrame(raf);
      m.off("move", upd);
      m.off("resize", upd);
    };
  }, [ready, markers]);

  useEffect(() => {
    const m = rad.current;
    if (!ready || !m) return;
    if (pop && !m.getSource("pop-gpw")) {
      m.addSource("pop-gpw", { type: "raster", tiles: [POP_TILES], tileSize: 256, maxzoom: 7 });
      m.addLayer({ id: "pop-gpw", type: "raster", source: "pop-gpw", paint: { "raster-opacity": 0.35 } }, laterThan(m, "pop"));
    } else if (!pop && m.getLayer("pop-gpw")) {
      m.removeLayer("pop-gpw");
      m.removeSource("pop-gpw");
    }
  }, [ready, pop]);

  const setFromX = (x: number) => {
    const r = radEl.current?.getBoundingClientRect();
    if (r) setPos(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
  };

  return (
    <div className="maps">
      <div ref={radEl} className="map" />
      <div ref={optEl} className={`map ${glide ? "glide" : ""}`} style={{ clipPath: `inset(0 ${swipe ? 100 - pos : 100}% 0 0)` }} />
      {swipe && (
        <>
          <span className="chip chip-l">{leftDate ? `Before · ${leftDate}` : "Optical · MODIS Terra"}</span>
          <span className="chip chip-r">{leftDate ? `After · ${date}` : "Radar · NISAR L-band"}</span>
          <div className={`scan ${glide ? "glide" : ""}`} style={{ left: `${pos}%` }} />
          <div className={`divider ${glide ? "glide" : ""}`} style={{ left: `${pos}%` }} onTransitionEnd={() => setGlide(false)}>
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
                setGlide(false);
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
      {markers.map((k, i) =>
        pts[i] ? (
          <span key={k.label} className={`mk mk-${k.kind}`} style={{ transform: `translate(${pts[i].x}px, ${pts[i].y}px)` }}>
            <i />
            {k.label}
          </span>
        ) : null,
      )}
      {busy && <span className="chip chip-s" role="status"><i className="pulse" />receiving L-band tiles…</span>}
      <span className="reticle" aria-hidden="true" />
      {!swipe && <span className="chip chip-r">Radar · NISAR L-band</span>}
    </div>
  );
}
