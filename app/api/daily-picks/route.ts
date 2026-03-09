import { NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
import { GoogleGenerativeAI } from "@google/generative-ai";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (YahooFinanceClass as any)();

const SCAN_SYMBOLS = [
  // 米国株
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AMD",
  // 日本株
  "7203.T", "9984.T", "6758.T", "7974.T", "6861.T", "8306.T", "9432.T", "6902.T",
];

function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes = closes.slice(-period - 1).map((c, i, arr) =>
    i === 0 ? 0 : arr[i] - arr[i - 1]
  ).slice(1);
  const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}

function calculateMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0;
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
}

async function fetchStockSummary(symbol: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(symbol);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history: any[] = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: "1d",
    });
    const closes = history.map(h => h.close).filter((c): c is number => c !== null);
    return {
      symbol,
      name: quote.longName || quote.shortName || symbol,
      price: quote.regularMarketPrice,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      avgVolume: quote.averageDailyVolume3Month,
      pe: quote.trailingPE,
      high52: quote.fiftyTwoWeekHigh,
      low52: quote.fiftyTwoWeekLow,
      currency: quote.currency,
      ma5: calculateMA(closes, 5),
      ma25: calculateMA(closes, 25),
      rsi: calculateRSI(closes),
      // 52週レンジでの現在位置 (0=安値圏, 100=高値圏)
      rangePosition: quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow
        ? ((quote.regularMarketPrice - quote.fiftyTwoWeekLow) /
           (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100
        : 50,
      // 出来高比（平均比）
      volumeRatio: quote.averageDailyVolume3Month
        ? quote.regularMarketVolume / quote.averageDailyVolume3Month
        : 1,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY が設定されていません" }, { status: 500 });
  }

  // 全銘柄を並列取得
  const results = await Promise.all(SCAN_SYMBOLS.map(fetchStockSummary));
  const stocks = results.filter(Boolean);

  if (stocks.length === 0) {
    return NextResponse.json({ error: "株価データの取得に失敗しました" }, { status: 500 });
  }

  // Gemini で分析
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const stocksText = stocks.map(s => `
銘柄: ${s!.name} (${s!.symbol})
価格: ${s!.price} ${s!.currency} | 前日比: ${s!.changePercent?.toFixed(2)}%
RSI: ${s!.rsi?.toFixed(1)} | MA5: ${s!.ma5?.toFixed(1)} | MA25: ${s!.ma25?.toFixed(1)}
52週レンジ内位置: ${s!.rangePosition?.toFixed(0)}% | 出来高比: ${s!.volumeRatio?.toFixed(2)}倍
PER: ${s!.pe?.toFixed(1) ?? "N/A"}
`.trim()).join("\n\n");

  const prompt = `
あなたは株式投資のアナリストです。本日の市場データをもとに、今日購入を検討すべき銘柄トップ3を選んでください。

【分析対象銘柄】
${stocksText}

【選定基準】
- テクニカル面: RSIが30〜60（買われすぎでない）、MA5>MA25（上昇トレンド）、または RSI<35（売られすぎからの反発期待）
- 出来高が平均より多い（注目度が高い）
- 52週安値から十分距離がある（底値ではない）、または底値圏からの反発狙い

以下のJSON形式のみで返してください（説明文不要）:
{
  "picks": [
    {
      "symbol": "ティッカー",
      "name": "銘柄名",
      "reason": "選定理由（1〜2文）",
      "strategy": "短期" または "中期",
      "risk": "低" または "中" または "高",
      "confidence": 1〜100の数値
    }
  ],
  "marketComment": "本日の市場全体への一言コメント（1文）"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON parse error");
    const analysis = JSON.parse(jsonMatch[0]);

    // 各ピックに株価データをマージ
    const enrichedPicks = analysis.picks.map((pick: { symbol: string }) => {
      const stockData = stocks.find(s => s!.symbol === pick.symbol);
      return { ...pick, stockData };
    });

    return NextResponse.json({
      picks: enrichedPicks,
      marketComment: analysis.marketComment,
      scannedCount: stocks.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "AI分析に失敗しました: " + (error as Error).message },
      { status: 500 }
    );
  }
}
