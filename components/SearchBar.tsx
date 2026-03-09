"use client";

import { useState, useRef } from "react";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface SearchBarProps {
  onAdd: (symbol: string) => void;
  watchlist: string[];
}

export default function SearchBar({ onAdd, watchlist }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/stocks?query=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.quotes || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const handleAdd = (symbol: string) => {
    onAdd(symbol);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="銘柄を検索 (例: Toyota, AAPL, 7203.T)"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searching && (
          <div className="absolute right-3 top-2.5 text-gray-400 text-sm">検索中...</div>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => handleAdd(r.symbol)}
              disabled={watchlist.includes(r.symbol)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <span className="font-semibold text-gray-800">{r.symbol}</span>
              <span className="text-sm text-gray-500 ml-2">{r.name}</span>
              <span className="text-xs text-gray-400 ml-1">({r.exchange})</span>
              {watchlist.includes(r.symbol) && (
                <span className="text-xs text-blue-500 ml-2">追加済み</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
