"use client";

import { useState, useEffect } from "react";
import StockCard from "@/components/StockCard";
import SearchBar from "@/components/SearchBar";
import DailyPicks from "@/components/DailyPicks";
import Portfolio from "@/components/Portfolio";

const DEFAULT_WATCHLIST = ["AAPL", "GOOGL", "7203.T", "9984.T"];

export default function Home() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"picks" | "watchlist" | "portfolio">("picks");

  useEffect(() => {
    const saved = localStorage.getItem("watchlist");
    setWatchlist(saved ? JSON.parse(saved) : DEFAULT_WATCHLIST);
  }, []);

  const saveWatchlist = (list: string[]) => {
    setWatchlist(list);
    localStorage.setItem("watchlist", JSON.stringify(list));
  };

  const addToWatchlist = (symbol: string) => {
    if (!watchlist.includes(symbol)) saveWatchlist([...watchlist, symbol]);
  };

  const removeFromWatchlist = (symbol: string) => {
    saveWatchlist(watchlist.filter((s) => s !== symbol));
  };

  const tabs = [
    { id: "picks", label: "今日のおすすめ", icon: "✦" },
    { id: "watchlist", label: "ウォッチリスト", icon: "◈", badge: watchlist.length },
    { id: "portfolio", label: "ポートフォリオ", icon: "◎" },
  ] as const;

  return (
    <main className="min-h-screen bg-slate-950">
      {/* ヘッダー */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                株
              </div>
              <div>
                <h1 className="text-base font-semibold text-white tracking-tight">株価AIアナリスト</h1>
                <p className="text-xs text-slate-400">日本株・米国株</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 hidden sm:block">Powered by Groq / Llama</span>
          </div>

          {/* タブ */}
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.label}
                {"badge" in tab && (
                  <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "picks" && <DailyPicks />}

        {activeTab === "watchlist" && (
          <div className="space-y-4">
            <SearchBar onAdd={addToWatchlist} watchlist={watchlist} />
            {watchlist.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3 opacity-30">◈</p>
                <p>銘柄を検索して追加してください</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {watchlist.map((symbol) => (
                  <StockCard key={symbol} symbol={symbol} onRemove={removeFromWatchlist} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "portfolio" && <Portfolio />}
      </div>

      {/* フッター免責 */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <p className="text-xs text-slate-600 text-center">
          ⚠️ AIによる情報提供であり、投資アドバイスではありません。投資判断はご自身の責任でお願いします。
        </p>
      </div>
    </main>
  );
}
