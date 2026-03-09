"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const StockChart = dynamic(() => import("./StockChart"), { ssr: false });
const NewsPanel = dynamic(() => import("./NewsPanel"), { ssr: false });

interface HistoryPoint { date: string; close: number; }
interface StockData {
  symbol: string; name: string; price: number; change: number;
  changePercent: number; volume: number; marketCap: number; pe: number;
  high52: number; low52: number; currency: string; history: HistoryPoint[];
  indicators: { ma5: number; ma25: number; ma75: number; ma200: number; rsi: number };
}
interface Analysis {
  recommendation: "買い" | "様子見" | "売り"; confidence: number; summary: string;
  positives: string[]; negatives: string[]; targetPrice: number; risk: "低" | "中" | "高";
}

const recStyle = {
  買い: { bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400" },
  様子見: { bg: "bg-amber-500/10 border-amber-500/30 text-amber-400", dot: "bg-amber-400" },
  売り: { bg: "bg-rose-500/10 border-rose-500/30 text-rose-400", dot: "bg-rose-400" },
};

export default function StockCard({ symbol, onRemove }: { symbol: string; onRemove: (s: string) => void }) {
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
    price === null ? localStorage.removeItem(`alert_${symbol}`) : localStorage.setItem(`alert_${symbol}`, String(price));
    setAlertPrice(price);
  };

  const fetchStock = async () => {
    setLoading(true); setError(null); setAlertTriggered(false);
    try {
      const data = await fetch(`/api/stocks?symbol=${symbol}`).then(r => r.json());
      if (data.error) throw new Error(data.error);
      setStockData(data);
      if (alertPrice !== null && data.price >= alertPrice) {
        setAlertTriggered(true);
        if ("Notification" in window && Notification.permission === "granted")
          new Notification(`${symbol} が目標株価に到達`, { body: `現在値: ${data.price.toLocaleString()} ${data.currency}` });
      }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const analyzeStock = async () => {
    if (!stockData) return;
    setAnalyzing(true);
    try {
      const data = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockData }),
      }).then(r => r.json());
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (e) { setError((e as Error).message); }
    finally { setAnalyzing(false); }
  };

  const setAlert = () => {
    const price = parseFloat(alertInput);
    if (!isNaN(price) && price > 0) {
      saveAlert(price); setAlertInput(""); setShowAlertInput(false);
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    }
  };

  const isUp = stockData ? stockData.change >= 0 : true;

  return (
    <div className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${alertTriggered ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-slate-800 hover:border-slate-700"}`}>
      {alertTriggered && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-400 font-medium">
          目標株価 {alertPrice?.toLocaleString()} に到達しました
        </div>
      )}

      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{stockData?.name || "—"}</p>
          <p className="text-xl font-bold text-white tracking-tight">{symbol}</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={fetchStock} disabled={loading}
            className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 px-3 py-1.5 rounded-lg transition">
            {loading ? <span className="inline-block w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" /> : "更新"}
          </button>
          <button onClick={() => onRemove(symbol)}
            className="text-xs text-slate-500 hover:text-rose-400 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 transition">✕</button>
        </div>
      </div>

      {error && <div className="mx-4 mb-3 bg-rose-950/40 border border-rose-800/40 rounded-lg px-3 py-2 text-xs text-rose-400">{error}</div>}

      {!stockData && !loading && (
        <div className="px-4 pb-4">
          <button onClick={fetchStock}
            className="w-full text-sm text-indigo-400 border border-indigo-800/60 rounded-xl py-2.5 hover:bg-indigo-950/40 transition">
            株価を取得する
          </button>
        </div>
      )}

      {stockData && (
        <div className="px-4 pb-4 space-y-3">
          {/* 価格 */}
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-white tabular-nums">
              {stockData.price?.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 mb-1">{stockData.currency}</span>
            <span className={`text-sm font-semibold ml-1 mb-0.5 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
              {isUp ? "▲" : "▼"} {Math.abs(stockData.change).toFixed(2)} ({stockData.changePercent?.toFixed(2)}%)
            </span>
          </div>

          {/* 指標 */}
          {(() => {
            const { rsi, ma5, ma25, ma75, ma200 } = stockData.indicators ?? {};
            const price = stockData.price;
            const dev25 = ma25 ? ((price - ma25) / ma25 * 100) : null;
            const dev75 = ma75 ? ((price - ma75) / ma75 * 100) : null;
            return (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "RSI", value: rsi?.toFixed(1), color: rsi > 70 ? "text-rose-400" : rsi < 30 ? "text-emerald-400" : "text-slate-200" },
                    { label: "MA5", value: ma5?.toFixed(1), color: "text-slate-200" },
                    { label: "MA25", value: ma25?.toFixed(1), color: "text-slate-200" },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-800/60 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {dev25 != null && (
                    <div className="bg-slate-800/40 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-slate-500">MA25乖離率</p>
                      <p className={`text-xs font-bold mt-0.5 ${dev25 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {dev25 >= 0 ? "+" : ""}{dev25.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {dev75 != null && (
                    <div className="bg-slate-800/40 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-slate-500">MA75乖離率</p>
                      <p className={`text-xs font-bold mt-0.5 ${dev75 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {dev75 >= 0 ? "+" : ""}{dev75.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {ma75 != null && (
                    <div className="bg-slate-800/40 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-slate-500">MA75</p>
                      <p className="text-xs font-bold mt-0.5 text-slate-200">{ma75?.toFixed(1)}</p>
                    </div>
                  )}
                  {ma200 != null && (
                    <div className="bg-slate-800/40 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-slate-500">MA200</p>
                      <p className="text-xs font-bold mt-0.5 text-slate-200">{ma200?.toFixed(1)}</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-500">
            <div className="flex justify-between"><span>52週高値</span><span className="text-slate-300 font-medium">{stockData.high52?.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>52週安値</span><span className="text-slate-300 font-medium">{stockData.low52?.toLocaleString()}</span></div>
            {stockData.pe && <div className="flex justify-between"><span>PER</span><span className="text-slate-300 font-medium">{stockData.pe?.toFixed(1)}</span></div>}
            {stockData.marketCap && <div className="flex justify-between"><span>時価総額</span><span className="text-slate-300 font-medium">{(stockData.marketCap / 1e9).toFixed(1)}B</span></div>}
          </div>

          {/* アラート */}
          <div className="border-t border-slate-800 pt-3">
            {alertPrice !== null ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-400">
                  🔔 目標: <span className="font-bold">{alertPrice.toLocaleString()}</span>
                  {stockData.price >= alertPrice && <span className="text-emerald-400 ml-1">✓ 到達</span>}
                </span>
                <button onClick={() => saveAlert(null)} className="text-[10px] text-slate-500 hover:text-rose-400 transition">解除</button>
              </div>
            ) : showAlertInput ? (
              <div className="flex gap-2">
                <input type="number" value={alertInput} onChange={e => setAlertInput(e.target.value)}
                  placeholder={`目標株価 (現在 ${stockData.price?.toLocaleString()})`}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder:text-slate-600"
                  onKeyDown={e => e.key === "Enter" && setAlert()} />
                <button onClick={setAlert} className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1.5 rounded-lg transition">設定</button>
                <button onClick={() => setShowAlertInput(false)} className="text-xs text-slate-500 hover:text-slate-300 px-1.5">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAlertInput(true)} className="text-xs text-slate-600 hover:text-amber-400 transition">
                🔔 目標株価を設定
              </button>
            )}
          </div>

          {/* チャート */}
          <button onClick={() => setShowChart(!showChart)}
            className="w-full text-xs text-slate-600 hover:text-slate-400 border border-slate-800 hover:border-slate-700 rounded-lg py-1.5 transition">
            {showChart ? "▲ チャートを隠す" : "▼ チャートを表示"}
          </button>

          {showChart && stockData.history && (
            <StockChart history={stockData.history} currency={stockData.currency} alertPrice={alertPrice ?? undefined} />
          )}

          {/* ニュース */}
          <NewsPanel symbol={symbol} />

          {/* AI分析 */}
          {!analysis ? (
            <button onClick={analyzeStock} disabled={analyzing}
              className="w-full text-sm bg-indigo-600/90 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-2.5 transition font-medium">
              {analyzing ? <><span className="inline-block w-3.5 h-3.5 border-2 border-indigo-300/30 border-t-white rounded-full animate-spin mr-2" />AI分析中</> : "AIで分析する"}
            </button>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${recStyle[analysis.recommendation].bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${recStyle[analysis.recommendation].dot}`} />
                  {analysis.recommendation}
                </div>
                <div className="text-xs text-slate-500">
                  確信度 <span className="text-slate-300 font-semibold">{analysis.confidence}%</span>
                  {" · "}リスク <span className="text-slate-300 font-semibold">{analysis.risk}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>
              {analysis.targetPrice && (
                <p className="text-xs text-slate-500">目標株価: <span className="text-slate-200 font-semibold">{analysis.targetPrice.toLocaleString()} {stockData.currency}</span></p>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-emerald-500 font-medium mb-1">+ ポジティブ</p>
                  {analysis.positives.map((p, i) => <p key={i} className="text-slate-400 leading-relaxed">· {p}</p>)}
                </div>
                <div>
                  <p className="text-rose-500 font-medium mb-1">- ネガティブ</p>
                  {analysis.negatives.map((n, i) => <p key={i} className="text-slate-400 leading-relaxed">· {n}</p>)}
                </div>
              </div>
              <button onClick={analyzeStock} disabled={analyzing}
                className="w-full text-xs text-slate-500 hover:text-indigo-400 border border-slate-700 hover:border-indigo-800/60 rounded-lg py-1.5 transition">
                再分析
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
