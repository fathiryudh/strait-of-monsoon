"use client";
import { useEffect, useState } from "react";

export default function Loader({ mapReady }: { mapReady: boolean }) {
  const [gone, setGone] = useState(false);
  const [out, setOut] = useState(false);
  const [fonts, setFonts] = useState(false);
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFonts(true));
    // starts after hydration, so real wait is longer; the radar-side "receiving tiles" chip covers the rest
    const cap = setTimeout(() => setCapped(true), 5000);
    return () => clearTimeout(cap);
  }, []);

  const ready = capped || (fonts && mapReady);
  const step = ready ? 2 : mapReady || fonts ? 1 : 0;
  const status = ["acquiring L-band · 1.257 GHz", "penetrating cloud", "ready"][step];

  useEffect(() => {
    if (!ready) return;
    const a = setTimeout(() => setOut(true), 250);
    const b = setTimeout(() => setGone(true), 650);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [ready]);

  if (gone) return null;
  return (
    <div className={`loader ${out ? "out" : ""}`} role="status" aria-live="polite">
      <div className="radar-ring"><span className="sweep" /></div>
      <div className="label">{status}</div>
    </div>
  );
}
