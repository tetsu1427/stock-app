"use client";

import { useState, useEffect } from "react";
import StockCard from "@/components/StockCard";
import SearchBar from "@/components/SearchBar";

const DEFAULT_WATCHLIST = ["AAPL", "GOOGL", "7203.T", "9984.T"];

export default function Home() {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("watchlist");
    if (saved) {
      setWatchlist(JSON.parse(saved));
    } else {
      setWatchlist(DEFAULT_WATCHLIST);
    }
  }, []);

  const saveWatchlist = (list: string[]) => {
    setWatchlist(list);
    localStorage.setItem("watchlist", JSON.stringify(list));
  };

  const addToWatchlist = (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      saveWatchlist([...watchlist, symbol]);
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    saveWatchlist(watchlist.filter((s) => s !== symbol));
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">株価AIアナリスト</h1>
            <p className="text-xs text-gray-500">日本株・米国株をAIが分析・推薦</p>
          </div>
          <span className="text-xs text-gray-400">Powered by Gemini AI</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 検索バー */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">銘柄を追加</h2>
          <SearchBar onAdd={addToWatchlist} watchlist={watchlist} />
          <p className="text-xs text-gray-400 mt-2">
            ティッカーシンボルで直接入力も可能です。日本株は末尾に .T をつけてください（例: 7203.T）
          </p>
        </div>

        {/* ウォッチリスト */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            ウォッチリスト{" "}
            <span className="text-gray-400 font-normal">({watchlist.length}銘柄)</span>
          </h2>

          {watchlist.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">📊</p>
              <p>銘柄を検索して追加してください</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((symbol) => (
                <StockCard
                  key={symbol}
                  symbol={symbol}
                  onRemove={removeFromWatchlist}
                />
              ))}
            </div>
          )}
        </div>

        {/* 免責事項 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            ⚠️ このアプリはAIによる情報提供を目的としており、投資アドバイスではありません。
            投資判断はご自身の責任でお願いします。
          </p>
        </div>
      </div>
    </main>
  );
}
