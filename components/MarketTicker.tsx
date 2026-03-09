"use client";

import { useState, useEffect } from "react";

interface IndexData {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

function fmt(price: number, label: string): string {
  if (label === "USD/JPY") return price.toFixed(2);
  if (price >= 10000) return price.toLocaleString("en", { maximumFractionDigits: 0 });
  return price.toLocaleString("en", { maximumFractionDigits: 2 });
}

export default function MarketTicker() {
  const [indices, setIndices] = useState<IndexData[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/market");
        const json = await res.json();
        if (json.indices) setIndices(json.indices);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!indices.length) return null;

  return (
    <div className="border-b border-slate-800/60">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-6 py-1.5 overflow-x-auto scrollbar-none">
          {indices.map((idx) => {
            const isUp = idx.changePercent >= 0;
            return (
              <div key={idx.symbol} className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-slate-500 font-medium">{idx.label}</span>
                <span className="text-[11px] font-semibold text-white tabular-nums">
                  {fmt(idx.price, idx.label)}
                </span>
                <span className={`text-[10px] font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {isUp ? "▲" : "▼"}{Math.abs(idx.changePercent).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
