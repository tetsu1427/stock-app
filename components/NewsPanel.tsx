"use client";

import { useState } from "react";

interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string | null;
  summary: string | null;
  impact: "positive" | "negative" | "neutral";
}

const impactStyle = {
  positive: "text-emerald-400 bg-emerald-500/10",
  negative: "text-rose-400 bg-rose-500/10",
  neutral: "text-slate-400 bg-slate-700/50",
};

const impactIcon = {
  positive: "▲",
  negative: "▼",
  neutral: "–",
};

export default function NewsPanel({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchNews = async () => {
    if (news) { setOpen(!open); return; }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/news?symbol=${symbol}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setNews(json.news);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={fetchNews}
        className="w-full text-xs text-slate-600 hover:text-slate-400 border border-slate-800 hover:border-slate-700 rounded-lg py-1.5 transition"
      >
        {open ? "▲ ニュースを隠す" : "▼ 関連ニュース"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {loading && (
            <div className="flex items-center gap-2 py-3 justify-center text-slate-500 text-xs">
              <span className="w-3 h-3 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
              AI分析中...
            </div>
          )}
          {error && (
            <p className="text-xs text-rose-400 px-1">{error}</p>
          )}
          {news && news.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-2">ニュースが見つかりませんでした</p>
          )}
          {news && news.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-lg p-2.5 transition group"
            >
              <div className="flex items-start gap-2">
                <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${impactStyle[item.impact]}`}>
                  {impactIcon[item.impact]}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-300 group-hover:text-white leading-snug line-clamp-2 transition">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-600">{item.publisher}</span>
                    {item.publishedAt && (
                      <span className="text-[10px] text-slate-600">
                        {new Date(item.publishedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
