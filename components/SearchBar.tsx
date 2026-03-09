"use client";

import { useState, useRef } from "react";

interface SearchResult { symbol: string; name: string; exchange: string; }

export default function SearchBar({ onAdd, watchlist }: { onAdd: (s: string) => void; watchlist: string[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await fetch(`/api/stocks?query=${encodeURIComponent(value)}`).then(r => r.json());
        setResults(data.quotes || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 500);
  };

  const handleAdd = (symbol: string) => { onAdd(symbol); setQuery(""); setResults([]); };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          {searching
            ? <span className="inline-block w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          }
        </div>
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="銘柄を検索 (例: Toyota, AAPL, 7203.T)"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600/50 transition"
        />
      </div>

      {results.length > 0 && (
        <div className="absolute z-20 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl mt-1.5 overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <button key={r.symbol} onClick={() => handleAdd(r.symbol)} disabled={watchlist.includes(r.symbol)}
              className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition ${i > 0 ? "border-t border-slate-800" : ""}`}>
              <div>
                <span className="font-semibold text-white text-sm">{r.symbol}</span>
                <span className="text-slate-400 text-xs ml-2">{r.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded">{r.exchange}</span>
                {watchlist.includes(r.symbol)
                  ? <span className="text-[10px] text-indigo-400">追加済み</span>
                  : <span className="text-[10px] text-slate-500">+ 追加</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-600 mt-2">日本株は末尾に .T をつけてください (例: 7203.T)</p>
    </div>
  );
}
