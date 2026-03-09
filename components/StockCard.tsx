"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const StockChart = dynamic(() => import("./StockChart"), { ssr: false });

interface HistoryPoint {
  date: string;
  close: number;
}

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
  history: HistoryPoint[];
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

export default function StockCard({ symbol, onRemove }: StockCardProps) {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [alertPrice, setAlertPrice] = useState<number | null>(null);
  const [alertInput, setAlertInput] = useState("");
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`alert_${symbol}`);
    if (saved) setAlertPrice(parseFloat(saved));
  }, [symbol]);

  const saveAlert = (price: number | null) => {
    if (price === null) {
      localStorage.removeItem(`alert_${symbol}`);
    } else {
      localStorage.setItem(`alert_${symbol}`, String(price));
    }
    setAlertPrice(price);
  };

  const fetchStock = async () => {
    setLoading(true);
    setError(null);
    setAlertTriggered(false);
    try {
      const res = await fetch(`/api/stocks?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStockData(data);
      if (alertPrice !== null && data.price >= alertPrice) {
        setAlertTriggered(true);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`📈 ${symbol} が目標株価に到達`, {
            body: `現在値: ${data.price.toLocaleString()} ${data.currency}（目標: ${alertPrice.toLocaleString()}）`,
          });
        }
      }
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

  const setAlert = () => {
    const price = parseFloat(alertInput);
    if (!isNaN(price) && price > 0) {
      saveAlert(price);
      setAlertInput("");
      setShowAlertInput(false);
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-md border p-5 transition ${alertTriggered ? "border-amber-400 ring-2 ring-amber-200" : "border-gray-200"}`}>
      {alertTriggered && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800 font-medium">
          📈 目標株価 {alertPrice?.toLocaleString()} に到達しました！
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-gray-800 text-lg">{symbol}</span>
          {stockData && <p className="text-sm text-gray-500 mt-0.5">{stockData.name}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStock} disabled={loading}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? "取得中..." : "更新"}
          </button>
          <button onClick={() => onRemove(symbol)}
            className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">
            削除
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 rounded p-2 mb-2">{error}</p>}

      {!stockData && !loading && (
        <button onClick={fetchStock}
          className="w-full text-sm text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition">
          株価を取得する
        </button>
      )}

      {stockData && (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {stockData.price?.toLocaleString()}
              <span className="text-base font-normal text-gray-500 ml-1">{stockData.currency}</span>
            </span>
            <span className={`text-sm font-medium ${stockData.change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {stockData.change >= 0 ? "▲" : "▼"} {Math.abs(stockData.change).toFixed(2)} ({stockData.changePercent?.toFixed(2)}%)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2"><p className="text-gray-500">MA5</p><p className="font-semibold">{stockData.indicators?.ma5?.toFixed(1)}</p></div>
            <div className="bg-gray-50 rounded p-2"><p className="text-gray-500">MA25</p><p className="font-semibold">{stockData.indicators?.ma25?.toFixed(1)}</p></div>
            <div className="bg-gray-50 rounded p-2"><p className="text-gray-500">RSI</p>
              <p className={`font-semibold ${stockData.indicators?.rsi > 70 ? "text-red-600" : stockData.indicators?.rsi < 30 ? "text-green-600" : ""}`}>
                {stockData.indicators?.rsi?.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>52週高値: <span className="font-medium text-gray-800">{stockData.high52?.toLocaleString()}</span></div>
            <div>52週安値: <span className="font-medium text-gray-800">{stockData.low52?.toLocaleString()}</span></div>
            {stockData.pe && <div>PER: <span className="font-medium text-gray-800">{stockData.pe?.toFixed(1)}</span></div>}
            {stockData.marketCap && <div>時価総額: <span className="font-medium text-gray-800">{(stockData.marketCap / 1e9).toFixed(1)}B</span></div>}
          </div>

          {/* アラート設定 */}
          <div className="border-t border-gray-100 pt-2">
            {alertPrice !== null ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600">
                  🔔 目標株価: <span className="font-bold">{alertPrice.toLocaleString()}</span>
                  {stockData.price >= alertPrice && " ✅ 到達済み"}
                </span>
                <button onClick={() => saveAlert(null)} className="text-gray-400 hover:text-red-500 transition">解除</button>
              </div>
            ) : showAlertInput ? (
              <div className="flex gap-2">
                <input type="number" value={alertInput} onChange={e => setAlertInput(e.target.value)}
                  placeholder={`目標株価 (現在: ${stockData.price?.toLocaleString()})`}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  onKeyDown={e => e.key === "Enter" && setAlert()} />
                <button onClick={setAlert} className="text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 transition">設定</button>
                <button onClick={() => setShowAlertInput(false)} className="text-xs text-gray-400 px-1">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAlertInput(true)}
                className="text-xs text-gray-400 hover:text-amber-600 transition">
                🔔 目標株価アラートを設定
              </button>
            )}
          </div>

          {/* チャート */}
          <button onClick={() => setShowChart(!showChart)}
            className="w-full text-xs text-gray-500 border border-gray-100 rounded py-1 hover:bg-gray-50 transition">
            {showChart ? "▲ チャートを隠す" : "▼ チャートを表示"}
          </button>

          {showChart && stockData.history && (
            <StockChart history={stockData.history} currency={stockData.currency} alertPrice={alertPrice ?? undefined} />
          )}

          {!analysis && (
            <button onClick={analyzeStock} disabled={analyzing}
              className="w-full text-sm bg-purple-600 text-white rounded-lg py-2 hover:bg-purple-700 disabled:opacity-50 transition">
              {analyzing ? "AI分析中..." : "AIで分析する"}
            </button>
          )}

          {analysis && (
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold px-3 py-1 rounded-full border ${recommendationColor[analysis.recommendation]}`}>
                  {analysis.recommendation}
                </span>
                <div className="text-xs text-gray-500">
                  確信度: <span className="font-bold text-gray-800">{analysis.confidence}%</span>
                  {" "}| リスク: <span className={`font-bold ${riskColor[analysis.risk]}`}>{analysis.risk}</span>
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
                  {analysis.positives.map((p, i) => <p key={i} className="text-gray-600">・{p}</p>)}
                </div>
                <div>
                  <p className="font-medium text-red-700 mb-1">ネガティブ</p>
                  {analysis.negatives.map((n, i) => <p key={i} className="text-gray-600">・{n}</p>)}
                </div>
              </div>
              <button onClick={analyzeStock} disabled={analyzing}
                className="w-full text-xs text-purple-600 border border-purple-200 rounded py-1 hover:bg-purple-50 transition">
                再分析
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
