import { NextRequest, NextResponse } from "next/server";

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
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices[0]?.message?.content ?? "";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { stockData } = body;

  const prompt = `あなたは株式投資のアナリストです。以下の株価データを分析し、投資判断を行ってください。

銘柄: ${stockData.name} (${stockData.symbol})
現在価格: ${stockData.price} ${stockData.currency}
前日比: ${stockData.change?.toFixed(2)} (${stockData.changePercent?.toFixed(2)}%)
52週高値: ${stockData.high52}
52週安値: ${stockData.low52}
時価総額: ${stockData.marketCap ? (stockData.marketCap / 1e9).toFixed(1) + "B" : "N/A"}
PER: ${stockData.pe?.toFixed(1) || "N/A"}
5日移動平均: ${stockData.indicators?.ma5?.toFixed(2) || "N/A"}
25日移動平均: ${stockData.indicators?.ma25?.toFixed(2) || "N/A"}
RSI(14): ${stockData.indicators?.rsi?.toFixed(1) || "N/A"}

以下の形式でJSON形式のみで回答してください（説明文不要）:
{"recommendation":"買いまたは様子見または売り","confidence":数値,"summary":"2〜3文の投資判断サマリー","positives":["要因1","要因2"],"negatives":["要因1","要因2"],"targetPrice":数値,"risk":"低または中または高"}`;

  try {
    const text = await callGroq(apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSONの解析に失敗しました");
    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      { error: "AI分析に失敗しました: " + (error as Error).message },
      { status: 500 }
    );
  }
}
