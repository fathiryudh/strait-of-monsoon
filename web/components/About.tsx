"use client";
import { useEffect, useRef } from "react";

const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer">{children}</a>
);

// Placeholder story, pending the author's approval.
export const STORY =
  "I'm Indonesian and I've been staying in Singapore since 2003. Both countries share the same monsoon, the same clouds and the same seasons, and I've always wondered what's actually happening on the ground across the region. NISAR's radar lets me look.";

export default function About({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="about" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="about-in">
        <div className="about-head">
          <h2>About</h2>
          <button className="btn" onClick={onClose} autoFocus>Close</button>
        </div>
        <h3 className="sec">Why I built this</h3>
        <p>{STORY}</p>
        <h3 className="sec">Who could use this (the author&apos;s proposal)</h3>
        <ul>
          <li>Teachers and students: see the region&apos;s rhythms, not just a weather report.</li>
          <li>Flood and water planners in the Mekong: lake size every 12 days, through rainy-season cloud.</li>
          <li>Land and coastal agencies: watch reclaimed land and forests through cloud.</li>
        </ul>
        <h3 className="sec">Future applications of NISAR</h3>
        <ul>
          <li>Sinking land with InSAR: settlement of reclaimed land, millimetres per year.</li>
          <li>Flood maps as floods happen, through monsoon cloud.</li>
          <li>Early warning when peat dries out (L-band soil moisture).</li>
          <li>Crop calendars for rice: when fields flood, grow and get harvested.</li>
        </ul>
        <h3 className="sec">NISAR</h3>
        <p>NISAR is a NASA-ISRO radar satellite. Its L-band radar (about 24 cm wavelength) sends its own signal, so it images day and night and passes through cloud. It also reaches into vegetation canopies, so it can see forests, fields and water that optical cameras lose under cloud.</p>
        <h3>How the overlays were made</h3>
        <p>Overlays come from NISAR L2 GCOV products clipped to each area. HV and HH backscatter (cross-polarised, dominated by volume scattering in vegetation) is converted to dB. The change layer is the HV dB difference between two dates, with changes under 3 dB either way left transparent: loss can mean trees cut, new water or sand fill; gain can mean new structures or vegetation growth. Many scenes are PROVISIONAL maturity (calibration may still change); later ones are VALIDATED and may differ in calibration, so small changes between those groups should be read with care. The orange streaks over open sea in the live NISAR tiles are processing artifacts.</p>
        <h3>Data sources</h3>
        <ul>
          <li><L href="https://nasa-gibs.github.io/gibs-api-docs/">NASA GIBS</L>: live NISAR and MODIS Terra true colour tiles.</li>
          <li><L href="https://nisar-docs.asf.alaska.edu/worldview/">ASF NISAR docs</L>: colour key for the live NISAR tiles (HH in red and blue, HV in green).</li>
          <li><L href="https://search.asf.alaska.edu/">ASF DAAC</L>: NISAR L2 GCOV products used for the HV and change overlays.</li>
          <li>Basemap: <L href="https://www.arcgis.com/home/item.html?id=1970c1995b8f44749f4b9b6e81b5ba45">Esri World Dark Gray Canvas</L> (Esri, HERE, Garmin, OpenStreetMap contributors).</li>
        </ul>
        <h3>Research and reporting</h3>
        <ul>
          <li><L href="https://gutzy.asia/2024/01/11/desmond-lee-singapore-reclaimed-74-5-sq-km-of-land-costs-s13-billion-from-past-reserves-in-2000-2023">Singapore reclaimed 74.5 km² of land, 2000 to 2023 (secondary, cites MND)</L></li>
          <li><L href="https://www.malaymail.com/news/singapore/2025/09/08/singapore-reclaims-800ha-at-pulau-tekong-in-first-below-sea-level-project-to-cut-sand-use/190428">Malay Mail: Pulau Tekong 800 ha below-sea-level polder, Sep 2025</L></li>
          <li><L href="https://earthobservatory.sg/research/publications/satellite-radar-advances-carbon-emissions-accountability-over-tropical-peat">EOS: L-band InSAR for peat carbon accounting</L></li>
          <li><L href="https://portal.smart.mit.edu/images/pdf/news/2020/CENSAM_New%20Satellite-based%20Study%20Highlights%20Extent%20of%20Peatland%20Damage%20Across%20Southeast%20Asia.pdf">SMART/Oregon 2020: InSAR peat subsidence across Southeast Asia</L></li>
          <li><L href="https://www.nationthailand.com/news/general/40071969">Nation Thailand, 4 Oct 2026: Chachoengsao, 58,960 households affected, about 437 km² flooded</L></li>
        </ul>
        <p className="muted">Built for NASA Space Apps 2026.</p>
        <p className="muted">Code written with AI assistance (Claude Code); idea, data choices and story by the author.</p>
      </div>
    </dialog>
  );
}
