import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (YahooFinanceClass as any)();

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0]?.message?.content ?? "";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol が必要です" }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY が設定されていません" }, { status: 500 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = await yahooFinance.search(symbol, { newsCount: 8, quotesCount: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawNews: any[] = results.news ?? [];

    if (rawNews.length === 0) {
      return NextResponse.json({ news: [] });
    }

    const headlines = rawNews
      .slice(0, 6)
      .map((n, i) => `${i + 1}. ${n.title}`)
      .join("\n");

    const prompt = `以下は${symbol}に関する最新ニュースの見出しです。各ニュースについて投資家目線で日本語で15字以内の要約と、株価への影響（positive/negative/neutral）を判定してください。

${headlines}

以下のJSON形式のみで返してください:
{"items":[{"index":1,"summary":"要約","impact":"positive|negative|neutral"},{"index":2,...},...]}`;

    const text = await callGroq(apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let aiItems: any[] = [];
    if (jsonMatch) {
      try {
        aiItems = JSON.parse(jsonMatch[0]).items ?? [];
      } catch { /* ignore */ }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const news = rawNews.slice(0, 6).map((n: any, i: number) => {
      const ai = aiItems.find((a: { index: number }) => a.index === i + 1);
      return {
        title: n.title,
        link: n.link,
        publisher: n.publisher,
        publishedAt: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : null,
        summary: ai?.summary ?? null,
        impact: ai?.impact ?? "neutral",
      };
    });

    return NextResponse.json({ news });
  } catch (error) {
    return NextResponse.json({ error: "ニュース取得に失敗しました", detail: String(error) }, { status: 500 });
  }
}
