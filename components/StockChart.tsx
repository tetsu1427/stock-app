"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

interface HistoryPoint {
  date: string;
  close: number;
}

interface StockChartProps {
  history: HistoryPoint[];
  currency: string;
  alertPrice?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow p-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value?.toFixed(2)}
        </p>
      ))}
    </div>
  );
};

export default function StockChart({ history, currency, alertPrice }: StockChartProps) {
  if (!history || history.length === 0) return null;

  // MA5・MA25を計算してチャートデータに付加
  const chartData = history.map((h, i) => {
    const slice5 = history.slice(Math.max(0, i - 4), i + 1).map(x => x.close);
    const ma5 = slice5.reduce((a, b) => a + b, 0) / slice5.length;

    const slice25 = history.slice(Math.max(0, i - 24), i + 1).map(x => x.close);
    const ma25 = slice25.reduce((a, b) => a + b, 0) / slice25.length;

    return {
      date: h.date.slice(5), // MM-DD 形式
      価格: Math.round(h.close * 100) / 100,
      MA5: Math.round(ma5 * 100) / 100,
      MA25: Math.round(ma25 * 100) / 100,
    };
  });

  const prices = history.map(h => h.close);
  const minPrice = Math.min(...prices) * 0.99;
  const maxPrice = Math.max(...prices) * 1.01;

  const isUp = history[history.length - 1].close >= history[0].close;

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 mb-1">30日チャート ({currency})</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            interval={Math.floor(chartData.length / 4)}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickFormatter={(v) => v.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }}
          />
          {alertPrice && (
            <ReferenceLine
              y={alertPrice}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: "目標", fontSize: 9, fill: "#f59e0b" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="価格"
            stroke={isUp ? "#16a34a" : "#dc2626"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="MA5"
            stroke="#3b82f6"
            strokeWidth={1}
            dot={false}
            strokeDasharray="3 2"
          />
          <Line
            type="monotone"
            dataKey="MA25"
            stroke="#8b5cf6"
            strokeWidth={1}
            dot={false}
            strokeDasharray="3 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
