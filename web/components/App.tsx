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

const WHY =
  "HV (cross-pol) responds to volume scattering from canopy, so clearing or burn shows as a strong HV drop. HH (co-pol) is more sensitive to surface and double-bounce scattering: buildings, flooded vegetation, water. Red dots on the optical side are VIIRS fire detections for the chosen date.";

const COPY = {
  1: {
    eyebrow: "01 · The haze",
    head: "Smoke hides the fire. Radar sees the ground.",
    body: "Riau's drained peatlands burn in the dry season, and the haze drifts about 300 km to Singapore. Optical imagery shows smoke and cloud; NISAR's L-band radar sees the ground beneath. Pantau Gambut counted 13,608 hotspots across 303 peatland units in July 2025.",
    why: WHY,
    drivers: "Plantation clearing and peat drainage on the Giam Siak Kecil-Bukit Batu peat dome near Sungai Pakning and Bengkalis. In the processed data, loss blocks dropped about 5 dB from July to October (clearing or burn), regrowth blocks rose about 3 dB, and intact peat forest stayed flat. Drained peat burns easily, most of all in El Niño years; 2026 is one, according to the Jakarta Post.",
  },
  2: {
    eyebrow: "02 · The land we made",
    head: "The land we made, every 12 days.",
    body: "Singapore reclaimed about 74.5 km² of land between 2000 and 2023, and the Pulau Tekong polder adds roughly 800 ha below sea level. NISAR passes every 12 days and sees through cloud. Press play to step through the dates over Tuas, Tekong and the Johor Strait.",
    why: WHY,
    drivers: "Reclaimed areas stayed stable within ±0.6 dB over these four months; settlement is millimetre-scale and needs InSAR, a future step. Visible change is land clearing in Johor and work inside the Tekong polder. The radar still shows the island through near-total cloud where MODIS sees white.",
  },
  3: {
    eyebrow: "03 · Explore",
    head: "Anywhere, any date.",
    body: "Pan and zoom anywhere on Earth and pick any date. NISAR passes every 12 days; some dates have no coverage here.",
    why: WHY,
    drivers: "Try the Singapore dates from chapter 02, or look for NISAR swaths elsewhere by moving the date.",
  },
} as const;

export default function App() {
  const [chapter, setChapter] = useState<Chapter>(1);
  const [date, setDate] = useState(RIAU_DATES[3]);
  const [playing, setPlaying] = useState(false);
  const [showChange, setShowChange] = useState(true);
  const [showProc, setShowProc] = useState(false);
  const [showPop, setShowPop] = useState(false);
  const [polSel, setPolSel] = useState<"hv" | "hh">("hv");
  const [open, setOpen] = useState<"why" | "drivers" | null>(null);
  const [about, setAbout] = useState(false);
  const [data, setData] = useState<Overlays | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState("1.250°N 101.950°E");

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
  const hasHH = scenes.some((s) => s.kind === "hh" || s.kind === "change_hh");
  const pol = hasHH ? polSel : "hv";
  const change = useMemo(() => scenes.filter((s) => s.kind === (pol === "hh" ? "change_hh" : "change")).sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null, [scenes, pol]);
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
    setShowChange(c === 1);
    setShowProc(false);
    setShowPop(false);
    setOpen(null);
    setDate(c === 2 ? SG_DATES[0] : c === 1 ? RIAU_DATES[3] : date);
  };

  const proc = showProc ? (scenes.find((s) => s.kind === pol && s.date === effDate) ?? null) : null;
  const hasProc = scenes.some((s) => s.kind === pol);
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
        proc={proc}
        change={showChange ? change : null}
        pop={showPop}
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
            <button className="btn" aria-expanded={open === "why"} onClick={() => setOpen(open === "why" ? null : "why")}>Which polarization?</button>
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
          {chapter !== 3 && (
            <div className="toggles" style={{ flexWrap: "wrap" }}>
              {hasChange && (
                <button className="btn" aria-pressed={showChange} onClick={() => setShowChange(!showChange)}>
                  {showChange ? "Hide change" : "Show change"} ({change.date_from ?? "?"} to {change.date}{change.maturity ? `, ${change.maturity.toLowerCase()}` : ""})
                </button>
              )}
              {hasHH && (
                <div className="seg" role="group" aria-label="Polarization">
                  {(["hv", "hh"] as const).map((p) => (
                    <button key={p} className="btn" aria-pressed={pol === p} onClick={() => setPolSel(p)}>{p.toUpperCase()}</button>
                  ))}
                </div>
              )}
              {hasProc && (
                <button className="btn" aria-pressed={showProc} onClick={() => setShowProc(!showProc)}>Processed {pol.toUpperCase()}</button>
              )}
              <button className="btn" aria-pressed={showPop} onClick={() => setShowPop(!showPop)}>Population</button>
            </div>
          )}
          {hasChange && showChange && chapter !== 3 && (
            <div className="chart" aria-label="Change layer legend">
              <div className="ramp" />
              <div className="label ramp-l"><span>signal loss (clearing, burn, new water)</span><span>signal gain (regrowth, new structures)</span></div>
              <div className="label">±3 dB threshold; water and &lt;8 ha masked</div>
            </div>
          )}
          {stats.length > 0 && <StatsChart stats={stats} date={effDate} pol={pol} />}
        </section>
      </div>

      <About open={about} onClose={() => setAbout(false)} />
      <Loader mapReady={mapReady} />
    </main>
  );
}
