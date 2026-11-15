"use client";
import { useEffect, useMemo, useState } from "react";
import About from "./About";
import Loader from "./Loader";
import PassRuler from "./PassRuler";
import Scramble from "./Scramble";
import StatsChart from "./StatsChart";
import SwipeMap from "./SwipeMap";
import { DATE_MAX, DATE_MIN, RIAU_BOUNDS, RIAU_DATES, SG_BOUNDS, SG_DATES, TONLE_BOUNDS, TONLE_DATES, loadOverlays, type Overlays } from "@/lib/data";
import { EVENTS, EVENT_DATES, TOUR, type Marker } from "@/lib/tour";

const TITLE = "Strait of Monsoon";
type Chapter = "sg" | "tonle" | "floods" | "forests" | "explore";
const EV = EVENTS[0];
// Floods only appears once EVENTS has entries; numbers follow the visible tabs.
const TABS = ([["sg", "Singapore"], ["tonle", "Tonle Sap"], ["floods", "Floods"], ["forests", "Forests"], ["explore", "Explore"]] as [Chapter, string][])
  .filter(([k]) => k !== "floods" || EV)
  .map(([k, name], i) => [k, `0${i + 1}`, name] as const);
const AOI = { sg: "sg_reclaim", tonle: "tonle_sap", floods: null, forests: "riau", explore: null } as const;
const DATES = { sg: SG_DATES, tonle: TONLE_DATES, floods: EVENT_DATES, forests: RIAU_DATES, explore: [] as string[] };
const START = { sg: SG_DATES[0], tonle: TONLE_DATES[0], floods: EV?.after ?? SG_DATES[0], forests: RIAU_DATES[3] };
const chapterOf = (aoi: string): Chapter => (aoi === "sg_reclaim" ? "sg" : aoi === "tonle_sap" ? "tonle" : aoi === "riau" ? "forests" : "floods");
const NO_MARKERS: Marker[] = [];
const month = (d: string) => new Date(d + "T00:00:00Z").toLocaleString("en", { month: "long", timeZone: "UTC" });

const WHY =
  "NISAR listens in different ways, called polarizations. HV hears echoes that bounce around inside leaves and branches, so it notices when trees go. HH hears more of the ground, trunks, buildings and flooded forest.";

const COPY = {
  sg: {
    head: "Land we made, every 12 days.",
    body: "Singapore made about 74.5 km² of new land from the sea between 2000 and 2023. At Pulau Tekong the new land sits below sea level. NISAR passes every 12 days and sees through cloud, even when space cameras see only white.",
    tryIt: "Drag the line, then press play",
    drivers: "The reclaimed areas stayed steady (within 0.6 dB) from July to November. Sinking there is millimetres a year and needs another NISAR technique called InSAR. The visible change is land clearing in Johor and work inside the Tekong polder.",
  },
  tonle: {
    head: "The lake that breathes.",
    body: "Tonle Sap in Cambodia is the biggest lake in Southeast Asia. Each monsoon the Mekong River gets so full that it pushes water backwards into the lake, and the lake grows several times bigger. Calm water looks dark in the radar.",
    tryIt: "Press play and watch the dark water spread",
    drivers: "The flood brings fish and rich mud for rice fields, and floating villages rise and fall with the water. Seeing the lake every 12 days, even under clouds, helps people plan fishing, farming and flood safety.",
  },
  floods: {
    head: EV ? `Floods in ${EV.country}.` : "Floods.",
    body: EV ? EV.body : "",
    tryIt: "Drag the line to compare before and after",
    drivers: "Left of the line is the radar before, right is the radar after. Both are NISAR, so clouds don't matter.",
  },
  forests: {
    head: "Tree farms on peat.",
    body: "In Riau, Indonesia, many forests are tree farms on peat, a spongy soil made of old plants. Trees grow, get cut and get planted again. Red blocks lost their trees between July and October, blue blocks are growing back.",
    tryIt: "Drag the line, then press play",
    drivers: "In the processed data, harvested blocks lost about 5 dB of echo from July to October, regrowing blocks gained about 3 dB, and the natural peat forest stayed flat.",
  },
  explore: {
    head: "Anywhere, any date.",
    body: "Pan and zoom anywhere on Earth and pick any date. NISAR passes every 12 days; some dates have no coverage here.",
    tryIt: "Pan anywhere and pick a date",
    drivers: "Try the dates from the other chapters, or look for NISAR strips elsewhere by moving the date.",
  },
} as const;

const TryIt = ({ text }: { text: string }) => (
  <p className="try"><i className="pulse" aria-hidden="true" />Try it: {text}</p>
);

export default function App() {
  const s0 = TOUR[0];
  const [tour, setTour] = useState<number | null>(0);
  const [done, setDone] = useState(false);
  const [chapter, setChapter] = useState<Chapter>(chapterOf(s0.aoi));
  const [date, setDate] = useState(s0.date);
  const [playing, setPlaying] = useState(false);
  const [showChange, setShowChange] = useState(s0.layers.change);
  const [showProc, setShowProc] = useState(s0.layers.processed);
  const [showWater, setShowWater] = useState(!!s0.layers.water);
  const [showPop, setShowPop] = useState(false);
  const [polSel, setPolSel] = useState<"hv" | "hh">(s0.layers.pol);
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

  const step = tour !== null ? TOUR[tour] : null;
  const aoi = AOI[chapter];
  const scenes = useMemo(() => (aoi && data ? data.scenes.filter((s) => s.aoi === aoi) : []), [aoi, data]);
  const stats = useMemo(() => (aoi && data ? data.stats.filter((s) => s.aoi === aoi) : []), [aoi, data]);
  const hasHH = scenes.some((s) => s.kind === "hh" || s.kind === "change_hh");
  const pol = hasHH ? polSel : "hv";
  const change = useMemo(() => scenes.filter((s) => s.kind === (pol === "hh" ? "change_hh" : "change")).sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null, [scenes, pol]);
  const dates = useMemo(() => {
    const own = [...new Set(scenes.filter((s) => s.kind === "hv" || s.kind === "water").map((s) => s.date))].sort();
    return own.length ? own : DATES[chapter];
  }, [scenes, chapter]);
  const chapterView = useMemo(() => {
    if (chapter === "explore") return null;
    if (chapter === "sg") return SG_BOUNDS;
    if (chapter === "tonle") return TONLE_BOUNDS;
    if (chapter === "floods") return EV?.view ?? null;
    return scenes.find((s) => s.bounds?.length === 4)?.bounds ?? RIAU_BOUNDS;
  }, [chapter, scenes]);
  const view = step ? step.view : chapterView;
  const leftDate = step ? (step.compare?.left ?? null) : chapter === "floods" && EV ? EV.before : null;

  // Lake water area per date (pipeline adds water_km2 for tonle_sap; absent until then).
  const lake = useMemo(
    () => (data?.stats ?? []).filter((s) => s.aoi === "tonle_sap" && s.water_km2 != null).sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );
  const peak = lake.length ? lake.reduce((a, b) => ((b.water_km2 ?? 0) > (a.water_km2 ?? 0) ? b : a)) : null;

  // Keep the date valid for the chapter's list when data arrives.
  const [effDate, idx] = useMemo(() => {
    if (chapter === "explore") return [date, -1] as const;
    const i = dates.indexOf(date);
    return i >= 0 ? ([date, i] as const) : ([dates[dates.length - 1], dates.length - 1] as const);
  }, [chapter, dates, date]);

  useEffect(() => {
    if (!playing || chapter === "explore") return;
    const id = setInterval(() => setDate(dates[(Math.max(0, dates.indexOf(date)) + 1) % dates.length]), 1200);
    return () => clearInterval(id);
  }, [playing, chapter, dates, date]);

  const applyStep = (i: number) => {
    const s = TOUR[i];
    setTour(i);
    setDone(false);
    setChapter(chapterOf(s.aoi));
    setDate(s.peak && peak ? peak.date : s.date);
    setPlaying(false);
    setShowChange(s.layers.change);
    setShowProc(s.layers.processed);
    setShowWater(!!s.layers.water);
    setShowPop(false);
    setPolSel(s.layers.pol);
    setOpen(null);
  };

  const go = (c: Chapter) => {
    setTour(null);
    setChapter(c);
    setPlaying(false);
    setShowChange(c === "forests");
    setShowProc(false);
    setShowWater(false);
    setShowPop(false);
    setOpen(null);
    setDate(c === "explore" ? date : START[c]);
  };

  const back = () => tour !== null && tour > 0 && applyStep(tour - 1);
  const next = () => tour !== null && (tour < TOUR.length - 1 ? applyStep(tour + 1) : go("sg"));

  // ←/→ step through the tour unless a slider or input has focus
  useEffect(() => {
    if (tour === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey || (e.target as HTMLElement).closest?.("[role=slider], input, textarea, select, dialog")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const swipeTo = useMemo(() => (tour === null ? null : { pos: TOUR[tour].swipePos }), [tour]);
  const proc = showProc ? (scenes.find((s) => s.kind === pol && s.date === effDate) ?? null) : null;
  const waterScene = showWater ? (scenes.find((s) => s.kind === "water" && s.date === effDate) ?? null) : null;
  const hasProc = scenes.some((s) => s.kind === pol);
  const hasWater = scenes.some((s) => s.kind === "water");
  const nextDate = playing && idx >= 0 ? dates[(idx + 1) % dates.length] : idx >= 0 ? (dates[idx + 1] ?? null) : null;
  const c = COPY[chapter];
  const hasChange = !!change;
  const km = (v: number | null | undefined) => (Math.round((v ?? 0) / 10) * 10).toLocaleString("en");
  const part = (d: string) => { const n = +d.slice(8); return n <= 10 ? "early" : n <= 20 ? "mid" : "late"; };
  const waterNote = step?.waterNote && lake.length && peak
    ? ` In the western two-thirds of the lake covered by these images, water grew from about ${km(lake[0].water_km2)} km² in ${month(lake[0].date)} to about ${km(peak.water_km2)} km² in ${part(peak.date)} ${month(peak.date)}, almost ${Math.ceil((peak.water_km2 ?? 0) / (lake[0].water_km2 || 1))} times bigger.`
    : "";

  return (
    <main>
      <SwipeMap
        swipe={chapter !== "explore"}
        leftDate={leftDate}
        date={effDate}
        nextDate={nextDate}
        view={view}
        proc={proc}
        water={waterScene}
        change={showChange ? change : null}
        pop={showPop}
        swipeTo={swipeTo}
        markers={step?.markers ?? NO_MARKERS}
        onSwipe={(p) => step?.act === "drag" && p < 40 && setDone(true)}
        onCenter={setCenter}
        onLoad={() => setMapReady(true)}
      />
      <header className="topbar">
        <h1 className="title">{TITLE}</h1>
        <nav className="tabs" aria-label="Chapters">
          <button className={`tab ${tour !== null ? "on" : ""}`} aria-current={tour !== null ? "page" : undefined} onClick={() => applyStep(0)}>Tour</button>
          {TABS.map(([k, n, name]) => (
            <button key={k} className={`tab ${tour === null && chapter === k ? "on" : ""}`} aria-current={tour === null && chapter === k ? "page" : undefined} onClick={() => go(k)}>
              {n} {name}
            </button>
          ))}
          <button className="tab" onClick={() => setAbout(true)} aria-label="About this project">(i)</button>
        </nav>
      </header>
      {tour === 0 && <p className="strip label">NASA NISAR radar vs normal satellite photos · the monsoon across Southeast Asia · 2026</p>}

      <div className={`dock ${step ? "touring" : ""} ${step?.controls ? "ctl" : ""}`}>
        {step && tour !== null ? (
          <section className="card panel tour" aria-label="Guided tour">
            <div className="ticks" aria-hidden="true">
              {TOUR.map((s, i) => <i key={s.id} className={i <= tour ? "on" : ""} />)}
            </div>
            <div className="tour-body">
              <div className="label">Step {tour + 1} / {TOUR.length}</div>
              <Scramble as="h2" className="headline" text={step.title} />
              <p className="body">{step.body}{waterNote}</p>
              {step.tryIt && !done && <TryIt text={step.tryIt} />}
              {step.check && done && <p className="check" role="status">✓ {step.check}</p>}
            </div>
            <div className="nav">
              <button className="btn" onClick={back} disabled={tour === 0}>Back</button>
              <button className={`btn next ${done ? "nudge" : ""}`} onClick={next}>{tour === TOUR.length - 1 ? "Explore yourself" : "Next"}</button>
              <button className="skip" onClick={() => go("sg")}>Skip tour, explore freely</button>
            </div>
          </section>
        ) : (
          <section className="card panel" key={`card-${chapter}`}>
            <div className="label coords"><Scramble text={center} /></div>
            <div className="label">{TABS.find(([k]) => k === chapter)?.slice(1).join(" · ")}</div>
            <Scramble as="h2" className="headline" text={c.head} />
            <p className="body">{c.body}</p>
            <TryIt text={c.tryIt} />
            <div className="toggles">
              <button className="btn" aria-expanded={open === "why"} onClick={() => setOpen(open === "why" ? null : "why")}>Which polarization?</button>
              <button className="btn" aria-expanded={open === "drivers"} onClick={() => setOpen(open === "drivers" ? null : "drivers")}>What changed</button>
            </div>
            {open && <p className="body small">{open === "why" ? WHY : c.drivers}</p>}
          </section>
        )}

        <section className="panel ctrl" key={`ctrl-${chapter}`}>
          <div className="date" aria-live="polite">{effDate.replaceAll("-", "·")}</div>
          <div className="row">
            {chapter !== "explore" ? (
              <>
                <button
                  className="play"
                  onClick={() => {
                    setPlaying(!playing);
                    if (step?.act === "play") setDone(true);
                  }}
                  aria-label={playing ? "Pause time-lapse" : "Play time-lapse"}
                >
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
          {chapter === "explore" && <p className="label">NISAR passes every 12 days; some dates have no coverage here.</p>}
          {(chapter === "tonle" || chapter === "forests") && <p className="label">Each place has its own NISAR track and dates; empty tiles mean no coverage that day.</p>}
          {chapter !== "explore" && (
            <div className="toggles" style={{ flexWrap: "wrap" }}>
              {hasChange && (
                <button className="btn" aria-pressed={showChange} onClick={() => setShowChange(!showChange)} title="Colour where the radar echo got much weaker (red) or stronger (blue) between two dates">
                  {showChange ? "Hide change" : "Show change"} ({change.date_from ?? "?"} to {change.date}{change.maturity ? `, ${change.maturity.toLowerCase()}` : ""})
                </button>
              )}
              {hasHH && (
                <div className="seg" role="group" aria-label="Polarization">
                  {(["hv", "hh"] as const).map((p) => (
                    <button
                      key={p}
                      className="btn"
                      aria-pressed={pol === p}
                      title={p === "hv" ? "HV: echoes from inside leaves and branches, best for spotting trees cut" : "HH: echoes from the ground, trunks and buildings"}
                      onClick={() => {
                        setPolSel(p);
                        if (p === "hh" && step?.act === "hh") setDone(true);
                      }}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              {hasProc && (
                <button className="btn" aria-pressed={showProc} onClick={() => setShowProc(!showProc)} title="Our own grey radar image for this date: brighter means a stronger echo">Processed {pol.toUpperCase()}</button>
              )}
              {hasWater && (
                <button className="btn" aria-pressed={showWater} onClick={() => setShowWater(!showWater)} title="Shade the open water found in the radar image for this date">Water</button>
              )}
              <button className="btn" aria-pressed={showPop} onClick={() => setShowPop(!showPop)} title="Show where people live (2020 population density)">Population</button>
            </div>
          )}
          {hasChange && showChange && chapter !== "explore" && (
            <div className="chart" aria-label="Change layer legend">
              <div className="ramp" />
              <div className="label ramp-l"><span>weaker echo (trees cut, new water)</span><span>stronger echo (regrowth, new buildings)</span></div>
              <div className="label">±3 dB threshold; water and &lt;8 ha masked</div>
            </div>
          )}
          {stats.length > 0 && <StatsChart stats={stats} date={effDate} pol={pol} highlight={step?.highlight} />}
        </section>
      </div>

      <About open={about} onClose={() => setAbout(false)} />
      <Loader mapReady={mapReady} />
    </main>
  );
}
