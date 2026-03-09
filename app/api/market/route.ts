import { NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (YahooFinanceClass as any)();

const INDICES = [
  { symbol: "^N225", label: "日経平均", currency: "JPY" },
  { symbol: "^GSPC", label: "S&P 500", currency: "USD" },
  { symbol: "^DJI", label: "NYダウ", currency: "USD" },
  { symbol: "USDJPY=X", label: "USD/JPY", currency: "" },
];

export async function GET() {
  try {
    const results = await Promise.all(
      INDICES.map(async (idx) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const q: any = await yahooFinance.quote(idx.symbol);
          return {
            symbol: idx.symbol,
            label: idx.label,
            price: q.regularMarketPrice,
            change: q.regularMarketChange,
            changePercent: q.regularMarketChangePercent,
            currency: idx.currency,
          };
        } catch {
          return null;
        }
      })
    );
    return NextResponse.json({ indices: results.filter(Boolean) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
