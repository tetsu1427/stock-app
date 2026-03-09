"use client";

import { useState, useEffect } from "react";

interface StockData {
  symbol: string;
  price: number;
  currency: string;
  changePercent: number;
  pe: number | null;
  pbr: number | null;
  roe: number | null;
  profitMargin: number | null;
  dividendYield: number | null;
  priceVsMA200: number | null;
  revenueGrowth: number | null;
}

interface LongTermPick {
  symbol: string;
  name: string;
  reason: string;
  holdPeriod: string;
  catalysts: string[];
  risk: "低" | "中" | "高";
  confidence: number;
  stockData: StockData;
}

interface LongTermData {
  picks: LongTermPick[];
  marketComment: string;
  scannedCount: number;
  updatedAt: string;
}

const riskBadge = {
  低: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  中: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
  高: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20",
};

const rankBorder = [
  "border-indigo-500/40",
  "border-violet-500/30",
  "border-slate-600/40",
];

const rankLabel = ["1st", "2nd", "3rd"];

function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-slate-900/60 rounded-lg p-1.5 text-center">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`text-xs font-semibold mt-0.5 ${color ?? "text-slate-300"}`}>{value}</p>
    </div>
  );
}

export default function LongTermPicks() {
  const [data, setData] = useState<LongTermData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPicks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/long-term-picks");
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
    ? new Date(data.updatedAt).toLocaleString("ja-JP", {
        month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">長期保有おすすめ銘柄</h2>
          {data && (
            <p className="text-xs text-slate-500 mt-0.5">
              {data.scannedCount}銘柄をスキャン（PER・ROE・FCF等で評価） · {updatedAt} 更新
            </p>
          )}
        </div>
        <button
          onClick={fetchPicks}
          disabled={loading}
          className="flex items-center gap-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition font-medium"
        >
          {loading ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> 分析中</>
          ) : "再分析"}
        </button>
      </div>

      {/* マーケットコメント */}
      {data?.marketComment && (
        <div className="bg-violet-950/40 border border-violet-800/40 rounded-xl px-4 py-3 text-sm text-violet-300">
          <span className="text-violet-500 font-medium mr-2">長期観点</span>
          {data.marketComment}
        </div>
      )}

      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-sm">ファンダメンタルズ分析中...</p>
          <p className="text-xs mt-1 text-slate-600">PER・ROE・FCF・配当を評価中</p>
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
              className={`relative bg-slate-900 border-2 ${rankBorder[i]} rounded-2xl p-5 space-y-3`}
            >
              {/* ランクバッジ */}
              <div className="absolute top-4 right-4 text-xs font-bold text-slate-600 tracking-widest">
                {rankLabel[i]}
              </div>

              {/* 銘柄名・価格 */}
              <div>
                <p className="text-xs text-slate-500 font-medium pr-8">{pick.name}</p>
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

              {/* 推奨理由 */}
              <p className="text-xs text-slate-300 leading-relaxed">{pick.reason}</p>

              {/* 成長触媒 */}
              {pick.catalysts?.length > 0 && (
                <div className="space-y-1">
                  {pick.catalysts.map((c, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <span className="text-violet-500 mt-0.5 flex-shrink-0">◆</span>
                      {c}
                    </div>
                  ))}
                </div>
              )}

              {/* バッジ */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
                  {pick.holdPeriod}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskBadge[pick.risk]}`}>
                  リスク{pick.risk}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/40">
                  確信度 {pick.confidence}%
                </span>
              </div>

              {/* ファンダメンタルズ指標 */}
              {pick.stockData && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <MetricCell
                    label="PER"
                    value={pick.stockData.pe != null ? pick.stockData.pe.toFixed(1) : "N/A"}
                    color={pick.stockData.pe != null && pick.stockData.pe < 25 ? "text-emerald-400" : "text-slate-300"}
                  />
                  <MetricCell
                    label="ROE"
                    value={pick.stockData.roe != null ? `${pick.stockData.roe.toFixed(1)}%` : "N/A"}
                    color={pick.stockData.roe != null && pick.stockData.roe > 15 ? "text-emerald-400" : "text-slate-300"}
                  />
                  <MetricCell
                    label="配当利回り"
                    value={pick.stockData.dividendYield != null ? `${pick.stockData.dividendYield.toFixed(2)}%` : "N/A"}
                  />
                  <MetricCell
                    label="利益率"
                    value={pick.stockData.profitMargin != null ? `${pick.stockData.profitMargin.toFixed(1)}%` : "N/A"}
                    color={pick.stockData.profitMargin != null && pick.stockData.profitMargin > 15 ? "text-emerald-400" : "text-slate-300"}
                  />
                  <MetricCell
                    label="売上成長"
                    value={pick.stockData.revenueGrowth != null ? `${pick.stockData.revenueGrowth.toFixed(1)}%` : "N/A"}
                    color={pick.stockData.revenueGrowth != null && pick.stockData.revenueGrowth > 0 ? "text-emerald-400" : "text-rose-400"}
                  />
                  <MetricCell
                    label="MA200乖離"
                    value={pick.stockData.priceVsMA200 != null ? `${pick.stockData.priceVsMA200 > 0 ? "+" : ""}${pick.stockData.priceVsMA200.toFixed(1)}%` : "N/A"}
                    color={
                      pick.stockData.priceVsMA200 != null
                        ? pick.stockData.priceVsMA200 < 0 ? "text-emerald-400"
                        : pick.stockData.priceVsMA200 < 20 ? "text-slate-300"
                        : "text-amber-400"
                        : "text-slate-300"
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
