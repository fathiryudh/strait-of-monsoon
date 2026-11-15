"use client";
import { useRef } from "react";

const DAY = 86400000;
const t = (d: string) => Date.parse(d + "T00:00:00Z");

export default function PassRuler({ dates, idx, onPick }: { dates: string[]; idx: number; onPick: (i: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const t0 = t(dates[0]);
  const days = Math.max(1, Math.round((t(dates[dates.length - 1]) - t0) / DAY));
  const pct = (d: string) => ((t(d) - t0) / DAY / days) * 100;
  const passAt = new Map(dates.map((d, i) => [Math.round((t(d) - t0) / DAY), i]));

  const pick = (x: number) => {
    const r = el.current?.getBoundingClientRect();
    if (!r) return;
    const want = Math.max(0, Math.min(1, (x - r.left) / r.width)) * days;
    let best = 0;
    dates.forEach((d, i) => {
      if (Math.abs((t(d) - t0) / DAY - want) < Math.abs((t(dates[best]) - t0) / DAY - want)) best = i;
    });
    onPick(best);
  };

  return (
    <div
      ref={el}
      className="ruler"
      role="slider"
      tabIndex={0}
      aria-label="NISAR pass date"
      aria-valuemin={0}
      aria-valuemax={dates.length - 1}
      aria-valuenow={idx}
      aria-valuetext={dates[idx]}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && pick(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") onPick(Math.max(0, idx - 1));
        if (e.key === "ArrowRight" || e.key === "ArrowUp") onPick(Math.min(dates.length - 1, idx + 1));
      }}
    >
      {Array.from({ length: days + 1 }, (_, n) => {
        const pass = passAt.get(n);
        return (
          <i key={n} className={`tick ${pass !== undefined ? "pass" : ""} ${pass === idx ? "cur" : ""}`} style={{ left: `${(n / days) * 100}%` }}>
            {pass !== undefined && pass % 2 === 0 && <b>{dates[pass].slice(5).replace("-", "·")}</b>}
          </i>
        );
      })}
      <span className="tri" style={{ left: `${pct(dates[idx])}%` }} aria-hidden="true" />
    </div>
  );
}
