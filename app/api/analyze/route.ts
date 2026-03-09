import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { stockData } = body;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const prompt = `
あなたは株式投資のアナリストです。以下の株価データを分析し、投資判断を行ってください。

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

以下の形式でJSON形式で回答してください:
{
  "recommendation": "買い" または "様子見" または "売り",
  "confidence": 1から100の数値（確信度）,
  "summary": "2〜3文の投資判断サマリー",
  "positives": ["ポジティブ要因1", "ポジティブ要因2"],
  "negatives": ["ネガティブ要因1", "ネガティブ要因2"],
  "targetPrice": 目標株価（数値のみ、通貨単位なし）,
  "risk": "低" または "中" または "高"
}

JSONのみを返してください。説明文は不要です。
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSONの解析に失敗しました");
    }
    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      { error: "AI分析に失敗しました: " + (error as Error).message },
      { status: 500 }
    );
  }
}
