"use client";
import { useEffect, useMemo, useState } from "react";
import About from "./About";
import Loader from "./Loader";
import PassRuler from "./PassRuler";
import Scramble from "./Scramble";
import StatsChart from "./StatsChart";
import SwipeMap from "./SwipeMap";
import { DATE_MAX, DATE_MIN, RIAU_BOUNDS, RIAU_DATES, SG_BOUNDS, SG_DATES, loadOverlays, type Overlays } from "@/lib/data";

type Chapter = 1 | 2 | 3;
const TABS: [Chapter, string][] = [[1, "01 Haze"], [2, "02 Land"], [3, "03 Explore"]];

const COPY = {
  1: {
    eyebrow: "01 · The haze",
    head: "Smoke hides the fire. Radar sees the ground.",
    body: "Riau's drained peatlands burn in the dry season, and the haze drifts about 300 km to Singapore. Optical imagery shows smoke and cloud; NISAR's L-band radar sees the ground beneath. Pantau Gambut counted 13,608 hotspots across 303 peatland units in July 2025.",
    why: "HV is cross-polarised backscatter, mostly from volume scattering inside vegetation. When vegetation burns or is cleared, HV drops, so a drop in HV marks loss. Red dots on the optical side are VIIRS fire detections for the chosen date.",
    drivers: "Peat drained for palm oil and pulpwood dries out and burns easily, most of all in dry El Niño seasons. 2026 is an El Niño year, according to the Jakarta Post.",
  },
  2: {
    eyebrow: "02 · The land we made",
    head: "The land we made, every 12 days.",
    body: "Singapore reclaimed about 74.5 km² of land between 2000 and 2023, and the Pulau Tekong polder adds roughly 800 ha below sea level. NISAR passes every 12 days and sees through cloud. Press play to step through the dates over Tuas, Tekong and the Johor Strait.",
    why: "HV backscatter comes from volume scattering. Loss (negative change) can mean clearing, new water or sand fill; gain can mean new structures or vegetation growth. The change layer hides anything under 3 dB.",
    drivers: "Reclamation sand fill and construction. Four months of change is subtle: expect small patches, not dramatic shifts. Orange streaks over open sea are processing artifacts.",
  },
  3: {
    eyebrow: "03 · Explore",
    head: "Anywhere, any date.",
    body: "Pan and zoom anywhere on Earth and pick any date. NISAR passes every 12 days; some dates have no coverage here.",
    why: "The false-colour NISAR layer from NASA GIBS is a polarimetric composite. Vegetation volume scattering shows up in the cross-polarised (HV) channel.",
    drivers: "Try the Singapore dates from chapter 02, or look for NISAR swaths elsewhere by moving the date.",
  },
} as const;

export default function App() {
  const [chapter, setChapter] = useState<Chapter>(1);
  const [date, setDate] = useState(RIAU_DATES[3]);
  const [playing, setPlaying] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [open, setOpen] = useState<"why" | "drivers" | null>(null);
  const [about, setAbout] = useState(false);
  const [data, setData] = useState<Overlays | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState("1.200°N 102.000°E");

  useEffect(() => {
    let live = true;
    loadOverlays().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, []);

  const aoi = chapter === 1 ? "riau" : chapter === 2 ? "sg_reclaim" : null;
  const scenes = useMemo(() => (aoi && data ? data.scenes.filter((s) => s.aoi === aoi) : []), [aoi, data]);
  const stats = useMemo(() => (aoi && data ? data.stats.filter((s) => s.aoi === aoi) : []), [aoi, data]);
  const change = useMemo(() => scenes.filter((s) => s.kind === "change").sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null, [scenes]);
  const dates = useMemo(() => {
    const own = [...new Set(scenes.filter((s) => s.kind === "hv").map((s) => s.date))].sort();
    return own.length ? own : chapter === 1 ? RIAU_DATES : SG_DATES;
  }, [scenes, chapter]);
  const view = useMemo(() => {
    if (chapter === 3) return null;
    if (chapter === 2) return SG_BOUNDS;
    return scenes.find((s) => s.bounds?.length === 4)?.bounds ?? RIAU_BOUNDS;
  }, [chapter, scenes]);

  // Keep the date valid for the chapter's list when data arrives.
  const [effDate, idx] = useMemo(() => {
    if (chapter === 3) return [date, -1] as const;
    const i = dates.indexOf(date);
    return i >= 0 ? ([date, i] as const) : ([dates[dates.length - 1], dates.length - 1] as const);
  }, [chapter, dates, date]);

  useEffect(() => {
    if (!playing || chapter === 3) return;
    const id = setInterval(() => setDate(dates[(Math.max(0, dates.indexOf(date)) + 1) % dates.length]), 1200);
    return () => clearInterval(id);
  }, [playing, chapter, dates, date]);

  const go = (c: Chapter) => {
    setChapter(c);
    setPlaying(false);
    setShowChange(false);
    setOpen(null);
    setDate(c === 2 ? SG_DATES[0] : c === 1 ? RIAU_DATES[3] : date);
  };

  const next = playing && idx >= 0 ? dates[(idx + 1) % dates.length] : idx >= 0 ? (dates[idx + 1] ?? null) : null;
  const c = COPY[chapter];
  const hasChange = !!change;

  return (
    <main>
      <SwipeMap
        swipe={chapter !== 3}
        date={effDate}
        nextDate={next}
        fires={chapter === 1}
        view={view}
        change={showChange ? change : null}
        onCenter={setCenter}
        onLoad={() => setMapReady(true)}
      />
      <header className="topbar">
        <h1 className="title">Through the haze</h1>
        <nav className="tabs" aria-label="Chapters">
          {TABS.map(([n, label]) => (
            <button key={n} className={`tab ${chapter === n ? "on" : ""}`} aria-current={chapter === n ? "page" : undefined} onClick={() => go(n)}>
              {label}
            </button>
          ))}
          <button className="tab" onClick={() => setAbout(true)} aria-label="About this project">(i)</button>
        </nav>
      </header>

      <div className="dock">
        <section className="card panel" key={`card-${chapter}`}>
          <div className="label coords"><Scramble text={center} /></div>
          <div className="label">{c.eyebrow}</div>
          <Scramble as="h2" className="headline" text={c.head} />
          <p className="body">{c.body}</p>
          <div className="toggles">
            <button className="btn" aria-expanded={open === "why"} onClick={() => setOpen(open === "why" ? null : "why")}>Why HV?</button>
            <button className="btn" aria-expanded={open === "drivers"} onClick={() => setOpen(open === "drivers" ? null : "drivers")}>Drivers</button>
          </div>
          {open && <p className="body small">{c[open]}</p>}
        </section>

        <section className="panel ctrl" key={`ctrl-${chapter}`}>
          <div className="date" aria-live="polite">{effDate.replaceAll("-", "·")}</div>
          <div className="row">
            {chapter !== 3 ? (
              <>
                <button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause time-lapse" : "Play time-lapse"}>
                  {playing ? "❚❚" : "▶"}
                </button>
                <PassRuler
                  dates={dates}
                  idx={Math.max(0, idx)}
                  onPick={(i) => {
                    setPlaying(false);
                    setDate(dates[i]);
                  }}
                />
              </>
            ) : (
              <input type="date" className="datein" min={DATE_MIN} max={DATE_MAX} value={effDate} aria-label="Date" onChange={(e) => e.target.value && setDate(e.target.value)} />
            )}
          </div>
          {chapter === 3 && <p className="label">NISAR passes every 12 days; some dates have no coverage here.</p>}
          {chapter === 1 && <p className="label">Radar passes over Riau are on a different track from Singapore; empty tiles mean no coverage that day.</p>}
          {hasChange && (
            <button className="btn" aria-pressed={showChange} onClick={() => setShowChange(!showChange)}>
              {showChange ? "Hide change" : "Show change"} ({change.date_from ?? "?"} to {change.date}{change.maturity ? `, ${change.maturity.toLowerCase()}` : ""})
            </button>
          )}
          {stats.length > 0 && <StatsChart stats={stats} date={effDate} />}
        </section>
      </div>

      <About open={about} onClose={() => setAbout(false)} />
      <Loader mapReady={mapReady} />
    </main>
  );
}
