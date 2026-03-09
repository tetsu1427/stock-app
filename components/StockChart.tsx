"use client";

import { useState } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

interface HistoryPoint { date: string; close: number; volume?: number; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const priceItems = payload.filter((p: { yAxisId?: string }) => p.yAxisId !== "vol");
  const volItem = payload.find((p: { yAxisId?: string }) => p.yAxisId === "vol");
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {priceItems.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value?.toFixed(2)}</p>
      ))}
      {volItem && (
        <p className="text-slate-500 mt-0.5">出来高: {Number(volItem.value).toLocaleString()}</p>
      )}
    </div>
  );
};

const PERIODS = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
] as const;

type PeriodLabel = typeof PERIODS[number]["label"];

// 期間ごとのMA定義
const MA_CONFIG: Record<PeriodLabel, { key: string; period: number; color: string; dash?: string }[]> = {
  "1W": [
    { key: "MA5",  period: 5,  color: "#38bdf8" },
    { key: "MA25", period: 25, color: "#a78bfa", dash: "3 2" },
  ],
  "1M": [
    { key: "MA5",  period: 5,  color: "#38bdf8" },
    { key: "MA25", period: 25, color: "#a78bfa", dash: "3 2" },
  ],
  "3M": [
    { key: "MA25", period: 25, color: "#a78bfa" },
    { key: "MA75", period: 75, color: "#fb923c", dash: "3 2" },
  ],
  "1Y": [
    { key: "MA75",  period: 75,  color: "#fb923c" },
    { key: "MA200", period: 200, color: "#f472b6", dash: "3 2" },
  ],
};

function calcMA(data: number[], period: number, index: number): number {
  const slice = data.slice(Math.max(0, index - period + 1), index + 1);
  return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length * 100) / 100;
}

export default function StockChart({
  history,
  currency,
  alertPrice,
}: {
  history: HistoryPoint[];
  currency: string;
  alertPrice?: number;
}) {
  const [period, setPeriod] = useState<PeriodLabel>("1M");

  if (!history?.length) return null;

  const days = PERIODS.find(p => p.label === period)!.days;
  const sliced = history.slice(-days);
  const maConfig = MA_CONFIG[period];

  const closes = sliced.map(h => h.close);
  const maxVol = Math.max(...sliced.map(h => h.volume ?? 0));

  const chartData = sliced.map((h, i) => {
    const row: Record<string, number | string> = {
      date: period === "1Y" ? h.date.slice(0, 7) : h.date.slice(5),
      価格: Math.round(h.close * 100) / 100,
      出来高: h.volume ?? 0,
    };
    maConfig.forEach(ma => {
      row[ma.key] = calcMA(closes, ma.period, i);
    });
    return row;
  });

  const prices = sliced.map(h => h.close);
  const isUp = prices[prices.length - 1] >= prices[0];

  return (
    <div>
      {/* ヘッダー: 凡例 + 期間切替 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
          <span>{currency}</span>
          {maConfig.map(ma => (
            <span key={ma.key} className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: ma.color }} />
              {ma.key}
            </span>
          ))}
          {alertPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 bg-amber-500 rounded" />目標
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.label)}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                period === p.label
                  ? "bg-indigo-600 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#475569" }}
            interval={Math.floor(chartData.length / 4)}
          />
          {/* 価格軸（左） */}
          <YAxis
            yAxisId="price"
            domain={["auto", "auto"]}
            tick={{ fontSize: 9, fill: "#475569" }}
            tickFormatter={v => v.toFixed(0)}
          />
          {/* 出来高軸（右・非表示） */}
          <YAxis
            yAxisId="vol"
            orientation="right"
            hide
            domain={[0, maxVol * 4]}
          />
          <Tooltip content={<CustomTooltip />} />
          {alertPrice && (
            <ReferenceLine yAxisId="price" y={alertPrice} stroke="#f59e0b" strokeDasharray="4 2" />
          )}

          {/* 出来高バー（背景気味に薄く） */}
          <Bar
            yAxisId="vol"
            dataKey="出来高"
            fill="#334155"
            opacity={0.5}
            radius={[1, 1, 0, 0]}
          />

          {/* 価格ライン */}
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="価格"
            stroke={isUp ? "#34d399" : "#f87171"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: isUp ? "#34d399" : "#f87171" }}
          />

          {/* 期間対応MAライン */}
          {maConfig.map(ma => (
            <Line
              key={ma.key}
              yAxisId="price"
              type="monotone"
              dataKey={ma.key}
              stroke={ma.color}
              strokeWidth={1}
              dot={false}
              strokeDasharray={ma.dash}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
