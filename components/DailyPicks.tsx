"use client";

import { useState, useEffect } from "react";

interface StockData {
  symbol: string;
  price: number;
  changePercent: number;
  rsi: number;
  ma5: number;
  ma25: number;
  currency: string;
}

interface Pick {
  symbol: string;
  name: string;
  reason: string;
  strategy: "短期" | "中期";
  risk: "低" | "中" | "高";
  confidence: number;
  stockData: StockData;
}

interface DailyPicksData {
  picks: Pick[];
  marketComment: string;
  scannedCount: number;
  updatedAt: string;
}

const riskBadge = {
  低: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  中: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
  高: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20",
};

const strategyBadge = {
  短期: "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20",
  中期: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
};

const rankGradient = [
  "from-amber-500/20 to-amber-600/5 border-amber-500/30",
  "from-slate-400/20 to-slate-500/5 border-slate-400/30",
  "from-orange-600/20 to-orange-700/5 border-orange-600/30",
];

const rankLabel = ["1st", "2nd", "3rd"];

export default function DailyPicks() {
  const [data, setData] = useState<DailyPicksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPicks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-picks");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPicks(); }, []);

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">今日のおすすめ銘柄</h2>
          {data && (
            <p className="text-xs text-slate-500 mt-0.5">{data.scannedCount}銘柄をスキャン · {updatedAt} 更新</p>
          )}
        </div>
        <button
          onClick={fetchPicks}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition font-medium"
        >
          {loading ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> 分析中</>
          ) : "再分析"}
        </button>
      </div>

      {/* マーケットコメント */}
      {data?.marketComment && (
        <div className="bg-indigo-950/50 border border-indigo-800/40 rounded-xl px-4 py-3 text-sm text-indigo-300">
          <span className="text-indigo-500 font-medium mr-2">Market</span>
          {data.marketComment}
        </div>
      )}

      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <p className="text-sm">日米16銘柄をスキャン中...</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.picks.map((pick, i) => (
            <div
              key={pick.symbol}
              className={`relative bg-gradient-to-br ${rankGradient[i]} border rounded-2xl p-5 overflow-hidden`}
            >
              {/* ランクバッジ */}
              <div className="absolute top-4 right-4 text-xs font-bold text-slate-500 tracking-widest uppercase">
                {rankLabel[i]}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{pick.name}</p>
                  <p className="text-2xl font-bold text-white tracking-tight">{pick.symbol}</p>
                </div>

                {pick.stockData && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-white">
                      {pick.stockData.price?.toLocaleString()}
                      <span className="text-xs text-slate-400 ml-1">{pick.stockData.currency}</span>
                    </span>
                    <span className={`text-xs font-medium ${pick.stockData.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pick.stockData.changePercent >= 0 ? "▲" : "▼"}{Math.abs(pick.stockData.changePercent).toFixed(2)}%
                    </span>
                  </div>
                )}

                <p className="text-xs text-slate-300 leading-relaxed">{pick.reason}</p>

                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${strategyBadge[pick.strategy]}`}>
                    {pick.strategy}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskBadge[pick.risk]}`}>
                    リスク{pick.risk}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/40">
                    確信度 {pick.confidence}%
                  </span>
                </div>

                {pick.stockData && (
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {[
                      { label: "RSI", value: pick.stockData.rsi?.toFixed(1), alert: pick.stockData.rsi < 35 ? "text-emerald-400" : pick.stockData.rsi > 70 ? "text-rose-400" : "text-slate-300" },
                      { label: "MA5", value: pick.stockData.ma5?.toFixed(1), alert: "text-slate-300" },
                      { label: "MA25", value: pick.stockData.ma25?.toFixed(1), alert: "text-slate-300" },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-900/50 rounded-lg p-1.5 text-center">
                        <p className="text-[10px] text-slate-500">{item.label}</p>
                        <p className={`text-xs font-semibold ${item.alert}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
