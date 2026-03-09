"use client";

import { useState, useEffect } from "react";

interface Holding {
  symbol: string;
  name: string;
  shares: number;
  costPrice: number;
  currency: string;
}

interface HoldingWithPrice extends Holding {
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [liveHoldings, setLiveHoldings] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol: "", name: "", shares: "", costPrice: "" });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("portfolio");
    if (saved) setHoldings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (holdings.length > 0) fetchPrices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings]);

  const save = (list: Holding[]) => {
    setHoldings(list);
    localStorage.setItem("portfolio", JSON.stringify(list));
  };

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        holdings.map(async (h) => {
          const res = await fetch(`/api/stocks?symbol=${h.symbol}`);
          const data = await res.json();
          if (data.error) return null;
          const currentPrice = data.price;
          const currentValue = currentPrice * h.shares;
          const costValue = h.costPrice * h.shares;
          return {
            ...h,
            currentPrice,
            currentValue,
            gainLoss: currentValue - costValue,
            gainLossPercent: ((currentValue - costValue) / costValue) * 100,
          };
        })
      );
      setLiveHoldings(results.filter(Boolean) as HoldingWithPrice[]);
    } finally {
      setLoading(false);
    }
  };

  const addHolding = async () => {
    setFormError("");
    if (!form.symbol || !form.shares || !form.costPrice) {
      setFormError("全て入力してください");
      return;
    }
    const shares = parseFloat(form.shares);
    const costPrice = parseFloat(form.costPrice);
    if (isNaN(shares) || isNaN(costPrice) || shares <= 0 || costPrice <= 0) {
      setFormError("株数・取得単価は正の数を入力してください");
      return;
    }

    // シンボルを検証＆名前を取得
    const res = await fetch(`/api/stocks?symbol=${form.symbol.toUpperCase()}`);
    const data = await res.json();
    if (data.error) {
      setFormError("銘柄が見つかりません");
      return;
    }

    const newHolding: Holding = {
      symbol: form.symbol.toUpperCase(),
      name: data.name,
      shares,
      costPrice,
      currency: data.currency,
    };
    save([...holdings, newHolding]);
    setForm({ symbol: "", name: "", shares: "", costPrice: "" });
    setShowAdd(false);
  };

  const removeHolding = (symbol: string) => {
    save(holdings.filter(h => h.symbol !== symbol));
    setLiveHoldings(liveHoldings.filter(h => h.symbol !== symbol));
  };

  const totalCost = holdings.reduce((a, h) => a + h.costPrice * h.shares, 0);
  const totalValue = liveHoldings.reduce((a, h) => a + h.currentValue, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">ポートフォリオ</h2>
        <div className="flex gap-2">
          {holdings.length > 0 && (
            <button
              onClick={fetchPrices}
              disabled={loading}
              className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
            >
              {loading ? "更新中..." : "更新"}
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
          >
            {showAdd ? "キャンセル" : "+ 銘柄追加"}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="ティッカー (例: AAPL, 7203.T)"
              value={form.symbol}
              onChange={e => setForm({ ...form, symbol: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
            />
            <input
              type="number"
              placeholder="保有株数"
              value={form.shares}
              onChange={e => setForm({ ...form, shares: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="取得単価"
              value={form.costPrice}
              onChange={e => setForm({ ...form, costPrice: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {formError && <p className="text-red-500 text-xs">{formError}</p>}
          <button
            onClick={addHolding}
            className="w-full bg-blue-600 text-white text-sm py-1.5 rounded-lg hover:bg-blue-700 transition"
          >
            追加
          </button>
        </div>
      )}

      {holdings.length === 0 ? (
        <div className="text-center text-gray-400 py-6 text-sm">
          保有株を追加して損益を管理しましょう
        </div>
      ) : (
        <>
          {/* サマリー */}
          {liveHoldings.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">評価額合計</p>
                <p className="text-sm font-bold text-gray-900">
                  {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">取得総額</p>
                <p className="text-sm font-bold text-gray-900">
                  {totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className={`rounded-lg p-2 text-center ${totalGainLoss >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className="text-xs text-gray-500">損益</p>
                <p className={`text-sm font-bold ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalGainLoss >= 0 ? "+" : ""}{totalGainLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-xs ${totalGainLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ({totalGainLossPercent >= 0 ? "+" : ""}{totalGainLossPercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          )}

          {/* 保有銘柄一覧 */}
          <div className="space-y-2">
            {holdings.map(h => {
              const live = liveHoldings.find(l => l.symbol === h.symbol);
              return (
                <div key={h.symbol} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800 text-sm">{h.symbol}</span>
                      <span className="text-xs text-gray-500 ml-2">{h.name}</span>
                    </div>
                    <button
                      onClick={() => removeHolding(h.symbol)}
                      className="text-xs text-gray-400 hover:text-red-500 transition"
                    >
                      削除
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
                    <div>
                      <p className="text-gray-400">保有株数</p>
                      <p className="font-medium">{h.shares}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">取得単価</p>
                      <p className="font-medium">{h.costPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">現在値</p>
                      <p className="font-medium">
                        {live ? live.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">損益</p>
                      {live ? (
                        <p className={`font-bold ${live.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {live.gainLoss >= 0 ? "+" : ""}{live.gainLossPercent.toFixed(1)}%
                        </p>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                  </div>
                  {live && (
                    <div className="mt-1 text-xs text-gray-500">
                      評価額: <span className="font-medium text-gray-700">
                        {live.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} {h.currency}
                      </span>
                      {" "}(損益: <span className={`font-medium ${live.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {live.gainLoss >= 0 ? "+" : ""}{live.gainLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
