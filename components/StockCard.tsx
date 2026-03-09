"use client";

import { useState } from "react";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number;
  high52: number;
  low52: number;
  currency: string;
  indicators: {
    ma5: number;
    ma25: number;
    rsi: number;
  };
}

interface Analysis {
  recommendation: "買い" | "様子見" | "売り";
  confidence: number;
  summary: string;
  positives: string[];
  negatives: string[];
  targetPrice: number;
  risk: "低" | "中" | "高";
}

interface StockCardProps {
  symbol: string;
  onRemove: (symbol: string) => void;
}

export default function StockCard({ symbol, onRemove }: StockCardProps) {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStockData(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeStock = async () => {
    if (!stockData) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const recommendationColor = {
    買い: "bg-green-100 text-green-800 border-green-300",
    様子見: "bg-yellow-100 text-yellow-800 border-yellow-300",
    売り: "bg-red-100 text-red-800 border-red-300",
  };

  const riskColor = {
    低: "text-green-600",
    中: "text-yellow-600",
    高: "text-red-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-gray-800 text-lg">{symbol}</span>
          {stockData && (
            <p className="text-sm text-gray-500 mt-0.5">{stockData.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStock}
            disabled={loading}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? "取得中..." : "更新"}
          </button>
          <button
            onClick={() => onRemove(symbol)}
            className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
          >
            削除
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded p-2">{error}</p>
      )}

      {!stockData && !loading && (
        <button
          onClick={fetchStock}
          className="w-full text-sm text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition"
        >
          株価を取得する
        </button>
      )}

      {stockData && (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {stockData.price?.toLocaleString()}
              <span className="text-base font-normal text-gray-500 ml-1">
                {stockData.currency}
              </span>
            </span>
            <span
              className={`text-sm font-medium ${
                stockData.change >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stockData.change >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(stockData.change).toFixed(2)} (
              {stockData.changePercent?.toFixed(2)}%)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500">MA5</p>
              <p className="font-semibold">{stockData.indicators?.ma5?.toFixed(1)}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500">MA25</p>
              <p className="font-semibold">{stockData.indicators?.ma25?.toFixed(1)}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500">RSI</p>
              <p
                className={`font-semibold ${
                  stockData.indicators?.rsi > 70
                    ? "text-red-600"
                    : stockData.indicators?.rsi < 30
                    ? "text-green-600"
                    : ""
                }`}
              >
                {stockData.indicators?.rsi?.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>52週高値: <span className="font-medium text-gray-800">{stockData.high52?.toLocaleString()}</span></div>
            <div>52週安値: <span className="font-medium text-gray-800">{stockData.low52?.toLocaleString()}</span></div>
            {stockData.pe && <div>PER: <span className="font-medium text-gray-800">{stockData.pe?.toFixed(1)}</span></div>}
            {stockData.marketCap && (
              <div>時価総額: <span className="font-medium text-gray-800">{(stockData.marketCap / 1e9).toFixed(1)}B</span></div>
            )}
          </div>

          {!analysis && (
            <button
              onClick={analyzeStock}
              disabled={analyzing}
              className="w-full text-sm bg-purple-600 text-white rounded-lg py-2 hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {analyzing ? "AI分析中..." : "AIで分析する"}
            </button>
          )}

          {analysis && (
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-full border ${
                    recommendationColor[analysis.recommendation]
                  }`}
                >
                  {analysis.recommendation}
                </span>
                <div className="text-xs text-gray-500">
                  確信度: <span className="font-bold text-gray-800">{analysis.confidence}%</span>
                  {" "}| リスク:{" "}
                  <span className={`font-bold ${riskColor[analysis.risk]}`}>
                    {analysis.risk}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700">{analysis.summary}</p>
              {analysis.targetPrice && (
                <p className="text-xs text-gray-500">
                  目標株価: <span className="font-bold text-gray-800">{analysis.targetPrice.toLocaleString()} {stockData.currency}</span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-medium text-green-700 mb-1">ポジティブ</p>
                  {analysis.positives.map((p, i) => (
                    <p key={i} className="text-gray-600">・{p}</p>
                  ))}
                </div>
                <div>
                  <p className="font-medium text-red-700 mb-1">ネガティブ</p>
                  {analysis.negatives.map((n, i) => (
                    <p key={i} className="text-gray-600">・{n}</p>
                  ))}
                </div>
              </div>
              <button
                onClick={analyzeStock}
                disabled={analyzing}
                className="w-full text-xs text-purple-600 border border-purple-200 rounded py-1 hover:bg-purple-50 transition"
              >
                再分析
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
