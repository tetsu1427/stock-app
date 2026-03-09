import { NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (YahooFinanceClass as any)();

// 長期投資向け優良銘柄ユニバース（米国・日本）
const SCAN_SYMBOLS = [
  // 米国: 高品質・連続増配・モート持ち
  "AAPL", "MSFT", "GOOGL", "AMZN", "V", "MA", "JNJ", "KO", "PG",
  "BRK-B", "JPM", "WMT", "HD", "UNH", "COST",
  // 日本: 大型優良株・増配傾向
  "7203.T", "9984.T", "6758.T", "7974.T", "8058.T", "4063.T",
  "9432.T", "8306.T", "6902.T", "6861.T",
];

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0]?.message?.content ?? "";
}

async function fetchFundamentals(symbol: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [quote, summary, history]: [any, any, any[]] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, {
        modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
      }),
      yahooFinance.historical(symbol, {
        period1: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
        period2: new Date(),
        interval: "1d",
      }),
    ]);

    const fd = summary?.financialData ?? {};
    const ks = summary?.defaultKeyStatistics ?? {};
    const sd = summary?.summaryDetail ?? {};

    // MA200計算
    const closes = history.map((h: { close: number }) => h.close).filter((c: number | null): c is number => c !== null);
    const ma200 = closes.length >= 200
      ? closes.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200
      : null;
    const priceVsMA200 = ma200 && quote.regularMarketPrice
      ? ((quote.regularMarketPrice - ma200) / ma200) * 100
      : null;

    return {
      symbol,
      name: quote.longName || quote.shortName || symbol,
      price: quote.regularMarketPrice,
      currency: quote.currency,
      changePercent: quote.regularMarketChangePercent,
      // バリュエーション
      pe: quote.trailingPE ?? null,
      forwardPE: ks.forwardEps && quote.regularMarketPrice ? quote.regularMarketPrice / ks.forwardEps : null,
      pbr: ks.priceToBook ?? null,
      peg: ks.pegRatio ?? null,
      // 収益性
      roe: fd.returnOnEquity ? fd.returnOnEquity * 100 : null,
      profitMargin: fd.profitMargins ? fd.profitMargins * 100 : null,
      revenueGrowth: fd.revenueGrowth ? fd.revenueGrowth * 100 : null,
      // 財務健全性
      debtToEquity: fd.debtToEquity ?? null,
      freeCashflow: fd.freeCashflow ?? null,
      // 配当
      dividendYield: sd.dividendYield ? sd.dividendYield * 100 : null,
      // テクニカル（MA200との乖離）
      priceVsMA200,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY が設定されていません" }, { status: 500 });

  const results = await Promise.all(SCAN_SYMBOLS.map(fetchFundamentals));
  const stocks = results.filter(Boolean);

  if (stocks.length === 0) return NextResponse.json({ error: "データ取得失敗" }, { status: 500 });

  const stocksText = stocks.map(s => [
    `${s!.symbol} (${s!.name})`,
    `価格:${s!.price} ${s!.currency}`,
    `PER:${s!.pe?.toFixed(1) ?? "N/A"}`,
    `PBR:${s!.pbr?.toFixed(2) ?? "N/A"}`,
    `PEG:${s!.peg?.toFixed(2) ?? "N/A"}`,
    `ROE:${s!.roe?.toFixed(1) ?? "N/A"}%`,
    `利益率:${s!.profitMargin?.toFixed(1) ?? "N/A"}%`,
    `売上成長:${s!.revenueGrowth?.toFixed(1) ?? "N/A"}%`,
    `配当利回り:${s!.dividendYield?.toFixed(2) ?? "N/A"}%`,
    `MA200乖離:${s!.priceVsMA200?.toFixed(1) ?? "N/A"}%`,
    `D/E:${s!.debtToEquity?.toFixed(1) ?? "N/A"}`,
  ].join(" | ")).join("\n");

  const prompt = `あなたは長期投資の専門アナリストです。以下のファンダメンタルズデータをもとに、3〜5年以上の長期保有に最も適した銘柄トップ3を選んでください。

【選定基準】
・割安感: PER・PBRが業種平均以下、PEG<2が理想
・高収益: ROE>15%、利益率が高い
・成長性: 売上・利益が安定成長
・財務健全性: D/E比率が低い、FCFが豊富
・株主還元: 配当継続・増配傾向
・テクニカル: MA200乖離率がマイナス（押し目）または+20%以内が理想

【分析対象】
${stocksText}

以下のJSON形式のみで返してください（説明文不要）:
{"picks":[{"symbol":"ティッカー","name":"銘柄名","reason":"長期保有を推奨する理由（2〜3文、ファンダメンタルズを具体的に）","holdPeriod":"推奨保有期間（例: 3〜5年）","catalysts":["成長触媒1","成長触媒2"],"risk":"低または中または高","confidence":数値}],"marketComment":"現在の長期投資環境についての一言"}`;

  try {
    const text = await callGroq(apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON parse error");
    const analysis = JSON.parse(jsonMatch[0]);

    const enrichedPicks = analysis.picks.map((pick: { symbol: string }) => ({
      ...pick,
      stockData: stocks.find(s => s!.symbol === pick.symbol),
    }));

    return NextResponse.json({
      picks: enrichedPicks,
      marketComment: analysis.marketComment,
      scannedCount: stocks.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "AI分析失敗: " + (error as Error).message }, { status: 500 });
  }
}
