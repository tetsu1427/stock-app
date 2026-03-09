"use client";

import { useState, useEffect } from "react";

interface Holding { symbol: string; name: string; shares: number; costPrice: number; currency: string; }
interface HoldingWithPrice extends Holding { currentPrice: number; currentValue: number; gainLoss: number; gainLossPercent: number; }

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [liveHoldings, setLiveHoldings] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol: "", shares: "", costPrice: "" });
  const [formError, setFormError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("portfolio");
    if (saved) setHoldings(JSON.parse(saved));
  }, []);

  useEffect(() => { if (holdings.length > 0) fetchPrices(); }, [holdings]);

  const save = (list: Holding[]) => { setHoldings(list); localStorage.setItem("portfolio", JSON.stringify(list)); };

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(holdings.map(async h => {
        const data = await fetch(`/api/stocks?symbol=${h.symbol}`).then(r => r.json());
        if (data.error) return null;
        const currentValue = data.price * h.shares;
        const costValue = h.costPrice * h.shares;
        return { ...h, currentPrice: data.price, currentValue, gainLoss: currentValue - costValue, gainLossPercent: ((currentValue - costValue) / costValue) * 100 };
      }));
      setLiveHoldings(results.filter(Boolean) as HoldingWithPrice[]);
    } finally { setLoading(false); }
  };

  const addHolding = async () => {
    setFormError(""); setAdding(true);
    if (!form.symbol || !form.shares || !form.costPrice) { setFormError("全て入力してください"); setAdding(false); return; }
    const shares = parseFloat(form.shares);
    const costPrice = parseFloat(form.costPrice);
    if (isNaN(shares) || isNaN(costPrice) || shares <= 0 || costPrice <= 0) { setFormError("正の数を入力してください"); setAdding(false); return; }
    const data = await fetch(`/api/stocks?symbol=${form.symbol.toUpperCase()}`).then(r => r.json());
    if (data.error) { setFormError("銘柄が見つかりません"); setAdding(false); return; }
    save([...holdings, { symbol: form.symbol.toUpperCase(), name: data.name, shares, costPrice, currency: data.currency }]);
    setForm({ symbol: "", shares: "", costPrice: "" }); setShowAdd(false); setAdding(false);
  };

  const totalCost = holdings.reduce((a, h) => a + h.costPrice * h.shares, 0);
  const totalValue = liveHoldings.reduce((a, h) => a + h.currentValue, 0);
  const totalGL = totalValue - totalCost;
  const totalGLPct = totalCost > 0 ? (totalGL / totalCost) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">ポートフォリオ</h2>
        <div className="flex gap-2">
          {holdings.length > 0 && (
            <button onClick={fetchPrices} disabled={loading}
              className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 px-3 py-2 rounded-lg transition">
              {loading ? <span className="inline-block w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" /> : "更新"}
            </button>
          )}
          <button onClick={() => setShowAdd(!showAdd)}
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition font-medium">
            {showAdd ? "キャンセル" : "+ 追加"}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-300">銘柄を追加</p>
          <div className="grid grid-cols-1 gap-3">
            <input type="text" placeholder="ティッカー (例: AAPL, 7203.T)" value={form.symbol}
              onChange={e => setForm({ ...form, symbol: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="保有株数" value={form.shares}
                onChange={e => setForm({ ...form, shares: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              <input type="number" placeholder="取得単価" value={form.costPrice}
                onChange={e => setForm({ ...form, costPrice: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
          </div>
          {formError && <p className="text-xs text-rose-400">{formError}</p>}
          <button onClick={addHolding} disabled={adding}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm py-2.5 rounded-xl transition font-medium">
            {adding ? "確認中..." : "追加"}
          </button>
        </div>
      )}

      {holdings.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl text-center py-16 text-slate-600">
          <p className="text-3xl mb-3 opacity-30">◎</p>
          <p className="text-sm">保有株を追加して損益を管理</p>
        </div>
      ) : (
        <>
          {liveHoldings.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "評価額合計", value: totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: "text-white" },
                { label: "取得総額", value: totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: "text-slate-300" },
                { label: "損益合計", value: `${totalGL >= 0 ? "+" : ""}${totalGL.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${totalGLPct >= 0 ? "+" : ""}${totalGLPct.toFixed(2)}%`, color: totalGL >= 0 ? "text-emerald-400" : "text-rose-400" },
              ].map(item => (
                <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</p>
                  <p className={`text-sm font-bold mt-1 ${item.color}`}>{item.value}</p>
                  {item.sub && <p className={`text-xs ${item.color} opacity-70`}>{item.sub}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-5 px-4 py-2 text-[10px] text-slate-600 uppercase tracking-wide border-b border-slate-800">
              <div className="col-span-2">銘柄</div><div className="text-right">取得単価</div><div className="text-right">現在値</div><div className="text-right">損益</div>
            </div>
            {holdings.map((h, i) => {
              const live = liveHoldings.find(l => l.symbol === h.symbol);
              return (
                <div key={h.symbol} className={`grid grid-cols-5 px-4 py-3 items-center hover:bg-slate-800/50 transition ${i > 0 ? "border-t border-slate-800" : ""}`}>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{h.symbol}</p>
                        <p className="text-xs text-slate-500">{h.shares}株</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">{h.costPrice.toLocaleString()}</div>
                  <div className="text-right text-xs font-medium text-slate-200">
                    {live ? live.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                  </div>
                  <div className="text-right">
                    {live ? (
                      <div>
                        <p className={`text-xs font-bold ${live.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {live.gainLossPercent >= 0 ? "+" : ""}{live.gainLossPercent.toFixed(1)}%
                        </p>
                        <button onClick={() => { save(holdings.filter(x => x.symbol !== h.symbol)); setLiveHoldings(liveHoldings.filter(x => x.symbol !== h.symbol)); }}
                          className="text-[10px] text-slate-600 hover:text-rose-400 transition">削除</button>
                      </div>
                    ) : (
                      <button onClick={() => { save(holdings.filter(x => x.symbol !== h.symbol)); }}
                        className="text-[10px] text-slate-600 hover:text-rose-400 transition">削除</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
