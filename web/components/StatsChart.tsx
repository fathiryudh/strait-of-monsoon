"use client";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Stat } from "@/lib/data";

const COLORS = ["#7fe3ec", "#f5f5f5", "#ff4d00", "#9a9a9a", "#5a5a5a"];
const tick = { fill: "#9a9a9a", fontSize: 10, fontFamily: "var(--font-geist-mono)" };

export default function StatsChart({ stats, date, pol = "hv" }: { stats: Stat[]; date: string; pol?: "hv" | "hh" }) {
  const polys = [...new Map(stats.map((s) => [s.poly_id, s.poly_name])).entries()];
  const rows = [...new Set(stats.map((s) => s.date))].sort().map((d) => {
    const r: Record<string, string | number> = { date: d };
    stats.filter((s) => s.date === d).forEach((s) => { const v = pol === "hh" ? s.mean_hh_db : s.mean_hv_db; if (v != null) r[s.poly_id] = v; });
    return r;
  });
  return (
    <div className="chart" aria-label={`Mean ${pol.toUpperCase()} backscatter in dB per area over time`}>
      <div className="label">Mean {pol.toUpperCase()} (dB) per area</div>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#3a3a3a" vertical={false} />
          <XAxis dataKey="date" tick={tick} tickFormatter={(d: string) => d.slice(5)} stroke="#3a3a3a" />
          <YAxis tick={tick} stroke="#3a3a3a" domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ background: "#1c1c1c", border: "1px solid #3a3a3a", borderRadius: 2, fontSize: 11 }} />
          <ReferenceLine x={date} stroke="#ff4d00" />
          {polys.map(([id, name], i) => (
            <Line key={id} dataKey={id} name={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="legend">
        {polys.map(([id, name], i) => (
          <span key={id}><i style={{ background: COLORS[i % COLORS.length] }} />{name}</span>
        ))}
      </div>
    </div>
  );
}
