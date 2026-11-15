export type Bounds = [number, number, number, number];
export type Marker = { lngLat: [number, number]; label: string; kind: "green" | "orange" | "water" | "site" };
export type Step = {
  id: string;
  title: string;
  body: string;
  tryIt?: string;
  act?: "drag" | "play" | "hh"; // what counts as doing the tryIt
  check?: string; // shown once the user has done it
  aoi: "sg_reclaim" | "tonle_sap" | "riau" | "event";
  compare?: { left: string }; // swipe shows radar on this date (left) vs radar on `date` (right) instead of camera vs radar
  view: Bounds; // a fresh array per step so every step re-flies
  date: string;
  peak?: boolean; // use the date with the most lake water when water stats exist
  waterNote?: boolean; // append "From X km² in June to Y km² in October" when water stats exist
  swipePos: number; // % of the screen showing the camera (optical) side
  layers: { change: boolean; processed: boolean; pol: "hv" | "hh"; water?: boolean };
  highlight?: string; // poly_id for the chart
  markers?: Marker[];
  controls?: boolean; // keep the date/layer panel on phones (step needs play or HV|HH)
};

/**
 * Flood events: one entry = one tour step; the Floods chapter uses the first entry's place and all entries' dates.
 * Default step: swipe radar `before` (left) vs radar `after` (right). `scrub`: radar only, press play through `dates`.
 */
export type FloodEvent = {
  title: string;
  country: string;
  view: Bounds;
  before: string;
  after: string;
  body: string;
  markers?: Marker[];
  dates?: string[];
  scrub?: boolean;
};
const THAI: Bounds = [100.0, 13.7, 101.6, 14.8]; // Chao Phraya floodplain + Bang Pakong basin
const THAI_MARKERS: Marker[] = [
  { lngLat: [100.3, 14.5], label: "Chao Phraya floodplain", kind: "water" },
  { lngLat: [101.25, 14.05], label: "Bang Pakong basin", kind: "water" },
];
export const EVENTS: FloodEvent[] = [
  {
    title: "When rivers spill over",
    country: "Thailand",
    view: THAI,
    before: "2026-09-06",
    after: "2026-10-12",
    body: "This is central Thailand. Left is early September, right is mid October. The dark patches are new water covering farms and towns. Weeks of heavy monsoon rain filled the rivers until they spilled over.",
    markers: THAI_MARKERS,
  },
  {
    title: "What it meant for people",
    country: "Thailand",
    view: THAI,
    before: "2026-09-06",
    after: "2026-11-05",
    dates: ["2026-09-06", "2026-10-12", "2026-10-24", "2026-11-05"],
    scrub: true,
    // Nation Thailand, 4 Oct 2026 (docs/research/monsoon-events.md)
    body: "In Chachoengsao province about 437 km² of land was flooded and nearly 59,000 households were affected by early October. By November the water was draining away. Some fields near the river are also flooded on purpose to store water, which radar sees too.",
    markers: THAI_MARKERS,
  },
];
export const EVENT_DATES = [...new Set(EVENTS.flatMap((e) => e.dates ?? [e.before, e.after]))].sort();

const SG: Bounds = [103.55, 1.15, 104.1, 1.65];
export const TONLE: Bounds = [103.3, 12.35, 104.05, 13.35]; // manifest tonle_sap bounds (western ~2/3 of the lake)
const OFF = { change: false, processed: false, pol: "hv" } as const;

const BASE: Step[] = [
  {
    id: "hello",
    title: "Hello from Singapore",
    body: "This is Singapore on 8 July 2026, in the middle of the monsoon, seen by a normal camera in space. It's almost all cloud. Clouds cover Southeast Asia for much of the year, so space cameras often can't see the ground.",
    aoi: "sg_reclaim",
    view: [...SG],
    date: "2026-07-08",
    swipePos: 100,
    layers: OFF,
  },
  {
    id: "nisar",
    title: "Meet NISAR",
    body: "NISAR is a satellite built by NASA and India. Instead of taking photos, it sends microwaves down and listens for the echo, a bit like a bat. Microwaves go straight through clouds, day or night.",
    tryIt: "Drag the line to the left",
    act: "drag",
    check: "That's the radar view",
    aoi: "sg_reclaim",
    view: [...SG],
    date: "2026-07-08",
    swipePos: 100,
    layers: OFF,
  },
  {
    id: "read",
    title: "Reading the radar",
    body: "Different things send back different echoes. Leaves and branches scatter it around, buildings bounce it straight back, and calm water reflects it away like a mirror, so water looks dark.",
    aoi: "sg_reclaim",
    view: [...SG],
    date: "2026-07-08",
    swipePos: 25,
    layers: OFF,
    markers: [
      { lngLat: [103.8, 1.37], label: "Green: trees and plants", kind: "green" },
      { lngLat: [103.91, 1.325], label: "Orange: buildings", kind: "orange" }, // dense city east of the centre reads orange-yellow in the tile
      { lngLat: [104.01, 1.54], label: "Dark blue: calm water", kind: "water" }, // Johor River estuary; open sea has orange streak artifacts
    ],
  },
  {
    id: "land",
    title: "Land we made",
    body: "Singapore made about 74.5 km² of new land from the sea between 2000 and 2023. NISAR checked the new land at Pulau Tekong every 12 days, and from July to November it stayed steady.",
    aoi: "sg_reclaim",
    view: [...SG],
    date: "2026-07-08",
    swipePos: 25,
    layers: OFF,
    markers: [
      { lngLat: [104.0215, 1.4245], label: "Pulau Tekong polder", kind: "site" },
      { lngLat: [104.0, 1.345], label: "Changi East", kind: "site" },
    ],
  },
  {
    id: "lake",
    title: "The lake that breathes",
    body: "This is Tonle Sap in Cambodia, the biggest lake in Southeast Asia, in June before the heavy rains. Look at how much land is green around it.",
    aoi: "tonle_sap",
    view: [...TONLE],
    date: "2026-06-19",
    swipePos: 0,
    layers: OFF,
  },
  {
    id: "play-lake",
    title: "Press play",
    body: "Each frame is one NISAR pass, 12 days apart, from June to October. During the monsoon the Mekong River gets so full that it pushes water backwards up a river and into the lake, and the lake grows several times bigger.",
    tryIt: "Press play",
    act: "play",
    check: "Watch the dark water spread",
    aoi: "tonle_sap",
    view: [...TONLE],
    date: "2026-06-19",
    waterNote: true,
    swipePos: 0,
    layers: { ...OFF, water: true },
    highlight: "lake",
    controls: true,
  },
  {
    id: "flood",
    title: "Who needs the flood?",
    body: "The flood isn't only a problem. It brings fish and rich mud for rice fields, and some families live in floating villages that rise with the water. Seeing the lake every 12 days, even under clouds, helps people plan fishing, farming and flood safety.",
    aoi: "tonle_sap",
    view: [...TONLE],
    date: "2026-10-05",
    peak: true,
    swipePos: 0,
    layers: OFF,
    highlight: "lake",
  },
  {
    id: "eyes",
    title: "Two radar eyes",
    body: "NISAR listens in two ways, called polarizations. HH hears echoes that bounce off flat things; HV hears echoes scattered inside leaves. In flooded forest the echo bounces off the water and then off the tree trunks, so it comes back very strong. That's why the flooded forest around the lake glows bright yellow, while open water looks dark.",
    aoi: "tonle_sap",
    view: [...TONLE],
    date: "2026-10-05",
    peak: true,
    swipePos: 0,
    layers: OFF,
    // picked by eye on the 2026-10-05 GIBS tile: bright yellow belt on the south-west shore
    markers: [{ lngLat: [103.8, 12.81], label: "Flooded forest", kind: "site" }, { lngLat: [103.89, 13.0], label: "Open water", kind: "water" }],
  },
];

const LAST: Step = {
  id: "you",
  title: "Your turn",
  body: "The monsoon brings the rain that fills rivers, lakes and rice fields, and sometimes floods and landslides. NISAR sees it every 12 days, through any cloud. Next it could map floods while they happen, spot slopes about to slide, and warn people earlier.",
  // end on the flood peak at Tonle Sap; a region-wide view is too far out for NISAR tiles
  aoi: "tonle_sap",
  view: [...TONLE],
  date: "2026-10-17",
  swipePos: 50,
  layers: OFF,
};

export const TOUR: Step[] = [
  ...BASE,
  ...EVENTS.map((e, i): Step => ({
    id: `event-${i}`,
    title: e.title,
    body: e.body,
    aoi: "event",
    view: [...e.view],
    layers: OFF,
    markers: e.markers,
    ...(e.scrub
      ? { tryIt: "Press play", act: "play" as const, date: e.before, swipePos: 0, controls: true }
      : { tryIt: "Drag the line to compare before and after", act: "drag" as const, compare: { left: e.before }, date: e.after, swipePos: 50 }),
  })),
  LAST,
];
