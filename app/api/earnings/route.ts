import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (YahooFinanceClass as any)();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  if (!symbolsParam) return NextResponse.json({ error: "symbols が必要です" }, { status: 400 });

  const symbols = symbolsParam.split(",").map(s => s.trim()).filter(Boolean);

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary: any = await yahooFinance.quoteSummary(symbol, {
          modules: ["calendarEvents", "defaultKeyStatistics"],
        });
        const cal = summary?.calendarEvents;
        const stats = summary?.defaultKeyStatistics;

        const earningsDate = cal?.earnings?.earningsDate?.[0] ?? null;
        const exDividendDate = cal?.exDividendDate ?? null;

        return {
          symbol,
          earningsDate: earningsDate ? new Date(earningsDate).toISOString().split("T")[0] : null,
          exDividendDate: exDividendDate ? new Date(exDividendDate).toISOString().split("T")[0] : null,
          epsForward: stats?.forwardEps ?? null,
          pegRatio: stats?.pegRatio ?? null,
        };
      } catch {
        return { symbol, earningsDate: null, exDividendDate: null, epsForward: null, pegRatio: null };
      }
    })
  );

  return NextResponse.json({ earnings: results });
}
