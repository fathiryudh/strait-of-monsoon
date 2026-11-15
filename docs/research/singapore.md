# Singapore relevance for a NISAR app

Compiled from quick web searches (snippet-level; papers not read in full). [UNVERIFIED] = no source found or from memory. Check numbers before putting them on a slide.

## 1. Local surface-change issues SAR can see

- Reclaimed land: ~74.5 km2 reclaimed 2000 to Jun 2023, ~S$13b. https://gutzy.asia/2024/01/11/desmond-lee-singapore-reclaimed-74-5-sq-km-of-land-costs-s13-billion-from-past-reserves-in-2000-2023 (secondary, cites MND). Total land ~744.3 km2 (SingStat end-2025): https://www.singstat.gov.sg/publications/reference/ebook/society/environment
- Pulau Tekong polder: ~800 ha, first below-sea-level polder, ~50% sand saving (Sep 2025). https://www.malaymail.com/news/singapore/2025/09/08/singapore-reclaims-800ha-at-pulau-tekong-in-first-below-sea-level-project-to-cut-sand-use/190428 and https://mothership.sg/2025/09/tekong-reclaim-land/ . A polder is a prime NISAR target: water/land boundary plus consolidation.
- Other reclamation: Woodlands Checkpoint 44 ha, 2024-2029 (https://mothership.sg/2024/03/jtc-reclaim-land-woodlands-checkpoint/); Tuas ~172 ha industrial (blog-level, weak). Changi East / Tuas Mega Port facts: not found [UNVERIFIED].
- Settlement of reclaimed land (InSAR):
  - NTU Sentinel-1A reclamation settlement project (SNAP + StaMPS): https://libmast.utm.my/Record/ntu-10356%2F74608/Description
  - Remote Sensing 2023, PS-InSAR TerraSAR-X 2015-2019 on the coast. Severe subsidence coincides with reclaimed areas (soil consolidation). Max 2050 inundation depth 1.24 m. Marina Bay most vulnerable. https://doaj.org/article/1e6eac4054c24e8fb74e221e88af4f93
  - Older: ERS-era PS-InSAR mean -1.5 mm/yr, local -7 mm/yr. https://a-a-r-s.org/proceeding/ACRS2014/all_abstract/202-ABSTRACT_Multi-temporal%20InSAR%20deformation%20analysis%20over%20Singapore.pdf
  - Remote Sensing 2020: >5 mm/yr near shore on recently reclaimed or built land: https://mdpi-res.com/d_attachment/remotesensing/remotesensing-12-00296/article_deploy/remotesensing-12-00296.pdf
  - NTU 2022 48-coastal-city Sentinel-1 subsidence study (Singapore figure not confirmed): https://www3.ntu.edu.sg/CorpComms2/Releases/NR2022/NR_220920_sinkingcities/Sea-level%20rise%20from%20land%20subsidence%20in%20major%20coastal%20cities.pdf
- Sea level and coastal protection: ~30% of land is <5 m above mean sea level (secondary). Mean sea level up to ~1.15 m by 2100 and up to 4-5 m with storm surge and tide (ministerial speech, per search summary). https://www.nccs.gov.sg/singapores-climate-action/adaptation-efforts/coastal-protection/ . Coastal and Flood Protection Fund S$5b (2020) plus S$5b top-up in Budget 2025. Long Island: ~800 ha new land, East Coast. https://go.gov.sg/Long-Island . Long Island cost: not found.
- Cloud cover and optical limits: standard SAR argument, no Singapore-specific source found [UNVERIFIED as a number].
- Flash floods, mangroves (Ubin, Mandai, Sungei Buloh): no sources fetched. Both are plausible SAR use (water mapping, mangrove extent change) [UNVERIFIED].

## 2. Regional

- Peat fires and haze: 2025 season severe. Pantau Gambut counted 13,608 hotspots over 303 peatland units in July 2025. https://news.mongabay.com/2025/08/nasa-satellites-show-surge-in-indonesia-hotspots-as-2025-fires-send-smoke-to-malaysia/
- 2026 El Nino, with Singapore backing multilateral haze action (Jakarta Post, Jul 2026): https://www.thejakartapost.com/world/2026/07/21/singapore-rallies-behind-multilateralism-to-brace-against-transboundary-haze
- 2015 Pekanbaru PSI 984: https://www.thestar.com.my/news/regional/2015/09/15/thousands-flee-pekanbaru-as-haze-hits-record-high
- Riau peat drained for palm oil and pulpwood: https://www.eco-business.com/news/haze-back-riau-farmers-slash-and-burn
- Peat subsidence: 2.7 Mha of SE Asian peat mapped by InSAR, >90% subsiding, mean 2.24 cm/yr (SMART/Oregon 2020, includes Riau). https://portal.smart.mit.edu/images/pdf/news/2020/CENSAM_New%20Satellite-based%20Study%20Highlights%20Extent%20of%20Peatland%20Damage%20Across%20Southeast%20Asia.pdf
- Johor flooding: 745 flood-prone areas (record, Batu Pahat 186), date unclear. 13,000+ evacuated in a 2025 event. https://tribune.com.pk/story/2535799/more-than-13000-people-evacuated-in-malaysias-floods-hit-johor-stat . No Straits of Johor or Iskandar source found [UNVERIFIED].

## 3. Stakeholders and existing work

- Existing work: EOS Remote Sensing Lab does InSAR plus GNSS on peat for carbon accounting. Nov 2025 Communications Earth & Environment paper on L-band InSAR for peat CO2 (L-band is what NISAR provides). https://earthobservatory.sg/research/publications/satellite-radar-advances-carbon-emissions-accountability-over-tropical-peat and https://earthobservatory.sg/news/blog/a-new-method-to-monitor-carbon-flux-from-peatlands . NTU: reclamation InSAR (above). NUS CRISP: not searched.
- Likely users (my inference, not sourced [UNVERIFIED]):
  - PUB: coastal and flood protection, polder and Long Island monitoring.
  - SLA, JTC, HDB: settlement of reclaimed and built land.
  - URA: planning on reclaimed land.
  - MPA: port and Tuas Mega Port.
  - NEA: haze and PSI.
  - Centre for Climate Research Singapore: sea-level and haze outlooks.
  - NParks: mangroves.
  - EOS, NTU, NUS CRISP: research validation.

## 4. Top 3 pitch angles

1. Reclaimed-land settlement watch (Pulau Tekong polder, Tuas, Changi East). Why: mm/yr sinking of new land is invisible to optical imagery and NISAR L-band adds coherence over low-vegetation fill. Study area: Tekong polder ~1.40N, 104.04E (approx), Tuas ~1.30N, 103.62E (approx). Coordinates are approximate [UNVERIFIED].
2. Sinking plus sea-level exposure (Marina Bay, East Coast / Long Island corridor). Why: ties subsidence to the S$5b+S$5b coastal protection programme and the 2023 study's 1.24 m 2050 inundation. Study area: Marina Bay ~1.28N, 103.86E, East Coast Park ~1.30N, 103.93E (approx).
3. Riau peat subsidence and fire/haze early warning. Why: transboundary haze hits Singapore directly, L-band sees through smoke, and peat subsidence tracks drainage and fire risk; EOS has L-band peat work to cite. Study area: Riau coastal peat near Bengkalis / Siak ~1.0N to 1.5N, 101.5E to 102.5E (approx).

Recommended: lead with 1 (local, novel, visual), close with 3 (regional stakes). Angle 2 is the narrative bridge.
