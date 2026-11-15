# 2026 monsoon flood events in SE Asia with NISAR before/after (GIBS)

Researched 2026-11-15, time-boxed to 30 min. Singapore and Tonle Sap are excluded because they are already covered.

**Result:** one region passes the eye test, central Thailand in the September-October 2026 floods. It holds two flood zones that sit in the same z8 tiles and on the same NISAR dates. Both are listed below as events 1a and 1b. Nothing else was probed in time (see near-misses).

## Shared NISAR facts (both zones)

- Layer: `NISAR_L2_Geocoded_Polarimetric_Covariance`, tiles `GoogleMapsCompatible_Level13`.
- Tiles checked: **z8 x=199-201, y=116-118** (3x3 block, NW corner 16.636N 99.844E, SE corner 12.555N 104.062E). All 9 tiles returned real imagery on 09-06, 10-12, 10-24 and 11-05. Also checked: z9 x=400 y=235 (one tile).
- Good dates over this area (z9 400/235 scan, 07-01 to 11-13): 07-08, 07-20, 08-25, **09-06**, **10-12**, 10-24, 11-05. They repeat every 12 days, the same dates as Singapore's `011_A_002` stack (whether it is the same track is unverified). 09-18 is missing and 09-30 is striped (no data). A second pass (07-01, 07-13 ... 10-29) only clips the tile edge, at about 22 KB per tile.
- **Before = 2026-09-06, after = 2026-10-12** (same 12-day track, so they line up). 10-24 shows the water still there and 11-05 shows it draining.
- **z9 is flaky:** in 3x3 z9 mosaics, random tiles came back as the striped placeholder or as HTTP 500, even after retries. The tile that worked on one request failed on the next. z8 was reliable every time. Recommendation: cap the NISAR source at maxzoom 8 and let MapLibre overzoom.
- Files in scratchpad `/private/tmp/claude-501/-Users-fathiryudh-Developer/965f80f3-c2ed-4caa-a40e-fbc4f4b82146/scratchpad/events/thai/`:
  - `compare_z8_0906_1012_1024_1105.png` (2x2 grid: 09-06 top-left, 10-12 top-right, 10-24 bottom-left, 11-05 bottom-right)
  - `nisar_<date>_z8_199_116_3x3.png`
  - `compare_modis_0929_1002_1012_1024.png`

## Rank 1a: Bang Pakong river basin floods (Nakhon Nayok / Prachin Buri / Chachoengsao), Thailand

- **Where:** the lower Bang Pakong, where the Prachin Buri and Nakhon Nayok rivers meet. The dark zone covers about **13.77-14.36N, 101.00-101.55E** (Bang Nam Priao is at about 13.84N 101.06E).
- **When:** Khao Yai flash floods hit four Prachin Buri districts around **27 Sep 2026**. The Bang Pakong overflowed on **3 Oct**. Water was still high on 8-12 Oct.
- **Impact:**
  - Prachin Buri death toll reached 24 (Khaosod, 10 Oct): https://www.khaosodenglish.com/news/2026/10/10/prachin-buri-floods-ease-as-death-toll-reaches-24-recovery-begins/
  - Officials called the Prachantakham flood the worst in 30-40 years, and all 14 subdistricts of Kabin Buri were flooded (Khaosod, 27 Sep): https://www.khaosodenglish.com/tourism/2026/09/27/flash-floods-from-khao-yai-swamp-four-prachin-buri-districts/
  - DDPM warning for Bang Nam Priao, Bang Khla and Khlong Khuean on 3 Oct: https://www.nationthailand.com/news/general/40071832
  - Chachoengsao on 4 Oct: 58,960 households affected and 272,833 rai (about 437 km²) flooded. ONWR expected about 38 days to drain: https://www.nationthailand.com/news/general/40071969
  - Homes nearly submerged in Chachoengsao (Khaosod, 8 Oct): https://www.khaosodenglish.com/news/2026/10/08/chachoengsao-floods-remain-high-as-homes-nearly-disappear/
  - Nationally, 3.26 M people were affected on 4 Oct (DDPM): https://www.nationthailand.com/news/general/40071861
  - The NASA Earth Observatory Landsat story "Floodwaters Overwhelm Thailand" (2 Oct 2026, centred near 13.993N 101.524E) cites more than 4 M people affected in 50 provinces and about 270,000 ha of farmland damaged: https://science.nasa.gov/earth/earth-observatory/floodwaters-overwhelm-thailand
- **What is visible:**
  - **09-06 (before):** the area is orange/yellow-green farmland with a fine field grid.
  - **10-12 (after):** a solid **dark green/black block** about 50 x 60 km appears just west and southwest of the bright-green Prachin plain. That is smooth standing water.
  - 10-24: still dark. 11-05: mostly back to yellow-green, which matches the ONWR drainage forecast.
  - Caveat: the bright-green blob around Prachin Buri town itself (13.99N 101.52E) does **not** visibly change. The visible signal is downstream.
- **MODIS:**
  - 09-06: the swath gap covers the area.
  - 09-29: hazy and cloudy.
  - 10-02: mostly clear, but the flood is hard to see in true colour at 250 m.
  - **10-12 (the NISAR after-date): the whole southern half, including this zone, is under cloud.** This is the radar point.
  - 10-24: hazy, with half the tile missing.
- **Suggested view:** center **[101.25, 14.05], zoom 9** (overzoomed from z8), or bounds [100.9, 13.6, 101.7, 14.45].
- **For kids:** Monsoon rain poured onto the Khao Yai mountains, and all that water rushed downhill into the rivers until they spilled over their banks. Clouds hid the flood from normal cameras, but NISAR's radar sees straight through clouds, and calm floodwater shows up dark because it bounces the radar away like a mirror.

## Rank 1b: Chao Phraya / Tha Chin floodplain (Ayutthaya and Suphan Buri), Thailand

- **Where:** west of the Chao Phraya river, about **14.15-14.95N, 99.84-100.67E** (the Bang Ban / Phak Hai / Sena side of Ayutthaya, plus eastern Suphan Buri). The zone is cut off by the left edge of the swath at 99.84E.
- **When:** late September to October 2026, during the same national flood.
- **Impact:**
  - ONWR warned on 4 Oct that Ayutthaya rivers would rise: https://www.nationthailand.com/news/general/40071858
  - Over 1 M households were affected in 30 provinces plus Bangkok: https://www.nationthailand.com/news/general/40071744
  - 3.14 M people were still affected on 11 Oct: https://asianews.network/?p=307121
  - I found no zone-specific death toll.
- **What is visible:** this is the most dramatic change in the tile set. On 09-06 the area is yellow-green and orange paddy. On 10-12 a large **dark-blue patch** about 70 x 80 km appears, laced with green river levees. It stays on 10-24 and is shrinking by 11-05.
  - Caveat: some of these fields are government flood-retention fields ("thung rap nam") that are flooded on purpose in this season. Present it as "water stored and spread on the floodplain", not as a single disaster.
- **MODIS:** 10-12 is partly cloudy over the southern part, and 09-29 is hazy.
- **Suggested view:** center **[100.3, 14.5], zoom 8.5**. For **one view showing both zones**, use center [100.7, 14.15], zoom 8, or bounds [99.84, 13.45, 102.15, 15.32].
- **For kids:** In the rainy season the big Chao Phraya river carries more water than it can hold, so it spreads out over the flat rice fields like a giant shallow lake. From space the radar sees these fields turn from rough, bright crops into smooth, dark water.

## Near-misses (not probed with GIBS, out of time)

1. **Lai Chau flash flood and landslides, Vietnam, 17 Jul 2026** (Muong Than commune, about 22.0N 103.9E, approximate). Reports give 7 dead, 1 missing and 10 injured, plus about US$17 M of damage across Lai Chau, Lao Cai and Son La.
   - https://en.qdnd.vn/social-affairs/news/deputy-pm-rushes-to-lai-chau-flood-zone-pledges-fast-rebuilding-after-deadly-disaster-593247
   - https://vietnamnews.vn/society/1785839/flood-damage-rises-to-nearly-17m-downpours-steep-terrains-causes-of-devastating-landslides.html
   - https://sentinel-asia.org/EO/2026/article20260718VN.html
   - The landslide scars are likely too small to see at 150-300 m/px, and z9 is flaky, so the before/after GCOV browse PNG (data.md section 3, option 2) would suit this event better.
2. **Typhoon Inday floods, Mindanao, Philippines, 10-11 Jul 2026.** PhilSA mapped them from Sentinel-1, not NISAR: https://philsa.gov.ph/news/satellite-data-show-flood-extents-in-mindanao-due-to-typhoon-inday/
3. **Central Vietnam (Da Nang / Hue), October 2026.** The only source is an AP photo caption from 8 Oct 2026 (https://www.jems.com/?p=222482). Most search hits are about the 2025 floods.

I did not find any NISAR "urgent response" collection or NASA/JPL article for a 2026 SE Asia flood.
