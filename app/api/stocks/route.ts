import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (YahooFinanceClass as any)();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const query = searchParams.get("query");

  // 銘柄検索
  if (query) {
    try {
      const results = await yahooFinance.search(query, { newsCount: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allQuotes = (results as any).quotes ?? [];
      const quotes = allQuotes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((q: any) => q.quoteType === "EQUITY")
        .slice(0, 10)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((q: any) => ({
          symbol: q.symbol ?? "",
          name: q.longname ?? q.shortname ?? q.symbol ?? "",
          exchange: q.exchange ?? "",
        }));
      return NextResponse.json({ quotes });
    } catch (error) {
      return NextResponse.json({ error: "検索に失敗しました" }, { status: 500 });
    }
  }

  // 特定銘柄の株価取得
  if (symbol) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yahooFinance.quote(symbol);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const history: any[] = await yahooFinance.historical(symbol, {
        period1: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        period2: new Date(),
        interval: "1d",
      });

      // テクニカル指標計算
      const closes = history.map((h) => h.close).filter((c): c is number => c !== null);
      const ma5 = calculateMA(closes, 5);
      const ma25 = calculateMA(closes, 25);
      const rsi = calculateRSI(closes, 14);

      return NextResponse.json({
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        pe: quote.trailingPE,
        high52: quote.fiftyTwoWeekHigh,
        low52: quote.fiftyTwoWeekLow,
        currency: quote.currency,
        history: history.map((h) => ({
          date: h.date.toISOString().split("T")[0],
          close: h.close,
          volume: h.volume,
        })),
        indicators: {
          ma5: ma5[ma5.length - 1],
          ma25: ma25[ma25.length - 1],
          ma75: calculateMA(closes, 75)[closes.length - 1],
          ma200: calculateMA(closes, 200)[closes.length - 1],
          rsi: rsi[rsi.length - 1],
        },
      });
    } catch (error) {
      return NextResponse.json({ error: "株価の取得に失敗しました", detail: String(error) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "symbol または query が必要です" }, { status: 400 });
}

function calculateMA(closes: number[], period: number): number[] {
  return closes.map((_, i) => {
    if (i < period - 1) return 0;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function calculateRSI(closes: number[], period: number): number[] {
  const rsi: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(50);
      continue;
    }
    const changes = closes.slice(i - period, i).map((c, j) => closes[i - period + j + 1] - c);
    const gains = changes.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
    const losses = Math.abs(changes.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period;
    if (losses === 0) {
      rsi.push(100);
    } else {
      const rs = gains / losses;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  return rsi;
}
