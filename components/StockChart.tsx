"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";

interface HistoryPoint { date: string; close: number; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value?.toFixed(2)}</p>
      ))}
    </div>
  );
};

export default function StockChart({ history, currency, alertPrice }: { history: HistoryPoint[]; currency: string; alertPrice?: number }) {
  if (!history?.length) return null;

  const chartData = history.map((h, i) => {
    const s5 = history.slice(Math.max(0, i - 4), i + 1).map(x => x.close);
    const s25 = history.slice(Math.max(0, i - 24), i + 1).map(x => x.close);
    return {
      date: h.date.slice(5),
      価格: Math.round(h.close * 100) / 100,
      MA5: Math.round(s5.reduce((a, b) => a + b, 0) / s5.length * 100) / 100,
      MA25: Math.round(s25.reduce((a, b) => a + b, 0) / s25.length * 100) / 100,
    };
  });

  const prices = history.map(h => h.close);
  const isUp = prices[prices.length - 1] >= prices[0];

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 text-[10px] text-slate-500">
        <span>30日チャート · {currency}</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-sky-500 rounded" />MA5</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-violet-500 rounded" />MA25</span>
        {alertPrice && <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-amber-500 rounded border-dashed" />目標</span>}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} interval={Math.floor(chartData.length / 4)} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#475569" }} tickFormatter={v => v.toFixed(0)} />
          <Tooltip content={<CustomTooltip />} />
          {alertPrice && <ReferenceLine y={alertPrice} stroke="#f59e0b" strokeDasharray="4 2" />}
          <Line type="monotone" dataKey="価格" stroke={isUp ? "#34d399" : "#f87171"} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: isUp ? "#34d399" : "#f87171" }} />
          <Line type="monotone" dataKey="MA5" stroke="#38bdf8" strokeWidth={1} dot={false} strokeDasharray="3 2" />
          <Line type="monotone" dataKey="MA25" stroke="#a78bfa" strokeWidth={1} dot={false} strokeDasharray="3 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
