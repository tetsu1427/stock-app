"use client";

import { useState, useEffect } from "react";

interface StockData {
  symbol: string;
  name: string;
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

const riskColor = {
  低: "text-green-600 bg-green-50 border-green-200",
  中: "text-yellow-600 bg-yellow-50 border-yellow-200",
  高: "text-red-600 bg-red-50 border-red-200",
};

const strategyColor = {
  短期: "text-blue-600 bg-blue-50",
  中期: "text-purple-600 bg-purple-50",
};

const rankLabel = ["🥇", "🥈", "🥉"];

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

  useEffect(() => {
    fetchPicks();
  }, []);

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">今日のおすすめ銘柄</h2>
          {data && (
            <p className="text-xs text-gray-400 mt-0.5">
              {data.scannedCount}銘柄をスキャン · {updatedAt} 更新
            </p>
          )}
        </div>
        <button
          onClick={fetchPicks}
          disabled={loading}
          className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? "分析中..." : "再分析"}
        </button>
      </div>

      {loading && (
        <div className="py-10 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">
            {`日米${16}銘柄をスキャンしてAIが分析中...`}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-3">
          {data.marketComment && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-sm text-indigo-800">
              📊 {data.marketComment}
            </div>
          )}

          {data.picks.map((pick, i) => (
            <div
              key={pick.symbol}
              className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{rankLabel[i]}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{pick.symbol}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          strategyColor[pick.strategy]
                        }`}
                      >
                        {pick.strategy}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          riskColor[pick.risk]
                        }`}
                      >
                        リスク{pick.risk}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{pick.name}</p>
                  </div>
                </div>

                {pick.stockData && (
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">
                      {pick.stockData.price?.toLocaleString()}
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        {pick.stockData.currency}
                      </span>
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        pick.stockData.changePercent >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {pick.stockData.changePercent >= 0 ? "▲" : "▼"}
                      {Math.abs(pick.stockData.changePercent).toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{pick.reason}</p>

              {pick.stockData && (
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span>RSI: <span className={`font-medium ${pick.stockData.rsi < 35 ? "text-green-600" : pick.stockData.rsi > 70 ? "text-red-600" : "text-gray-700"}`}>{pick.stockData.rsi?.toFixed(1)}</span></span>
                  <span>MA5: <span className="font-medium text-gray-700">{pick.stockData.ma5?.toFixed(1)}</span></span>
                  <span>MA25: <span className="font-medium text-gray-700">{pick.stockData.ma25?.toFixed(1)}</span></span>
                  <span className="ml-auto">確信度: <span className="font-bold text-indigo-600">{pick.confidence}%</span></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
