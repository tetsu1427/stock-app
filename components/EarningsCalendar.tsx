"use client";

import { useState, useEffect } from "react";

interface EarningsItem {
  symbol: string;
  earningsDate: string | null;
  exDividendDate: string | null;
  epsForward: number | null;
  pegRatio: number | null;
}

const SCAN_SYMBOLS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AMD",
  "7203.T", "9984.T", "6758.T", "7974.T", "6861.T", "8306.T", "9432.T", "6902.T",
];

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyStyle(days: number) {
  if (days <= 7) return "text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/20";
  if (days <= 30) return "text-sky-400 bg-sky-500/10 ring-1 ring-sky-500/20";
  return "text-slate-400 bg-slate-700/50 ring-1 ring-slate-600/30";
}

export default function EarningsCalendar({ watchlist }: { watchlist: string[] }) {
  const [items, setItems] = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const symbols = [...new Set([...watchlist, ...SCAN_SYMBOLS])].slice(0, 20);
    if (!symbols.length) return;

    setLoading(true);
    fetch(`/api/earnings?symbols=${symbols.join(",")}`)
      .then(r => r.json())
      .then(json => {
        if (json.earnings) {
          const future = json.earnings
            .filter((e: EarningsItem) => e.earningsDate && daysUntil(e.earningsDate) >= 0)
            .sort((a: EarningsItem, b: EarningsItem) =>
              new Date(a.earningsDate!).getTime() - new Date(b.earningsDate!).getTime()
            );
          setItems(future);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [watchlist]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">決算カレンダー</h2>
          <p className="text-xs text-slate-500 mt-0.5">今後の決算発表日一覧</p>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
        )}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          決算情報が見つかりませんでした
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            if (!item.earningsDate) return null;
            const days = daysUntil(item.earningsDate);
            const date = new Date(item.earningsDate);
            return (
              <div key={item.symbol} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">{item.symbol}</p>
                    {item.epsForward != null && (
                      <p className="text-[10px] text-slate-500">予想EPS: {item.epsForward.toFixed(2)}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-300">
                      {date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                    </p>
                    {item.exDividendDate && (
                      <p className="text-[10px] text-violet-400">
                        配当落ち: {new Date(item.exDividendDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${urgencyStyle(days)}`}>
                  {days === 0 ? "本日" : days === 1 ? "明日" : `${days}日後`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
