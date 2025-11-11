import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Candidate } from '@core/extract';

/**
 * Gemini AIを使ってHTMLからイベント情報を抽出
 * 無料枠: 1日1500リクエスト
 */
export async function extractFromAi(html: string): Promise<Candidate[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, skipping AI extraction');
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // HTMLからテキストコンテンツのみ抽出（トークン削減）
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 10000); // 最大10,000文字に制限

    // デバッグ: 抽出したテキストの最初の500文字を表示
    console.log('HTML text preview:', textContent.substring(0, 500));

    const prompt = `
以下のHTMLテキストから音楽イベント・ライブ・コンサートの公演情報を抽出してください。

抽出ルール:
1. 各イベントについて以下の情報をJSON配列で返す
2. JSON形式: [{"tour": "ツアー名", "place": "会場名", "date": "YYYY-MM-DD", "performance": "HH:MM", "artist": "アーティスト名"}]
3. 日付は必ずYYYY-MM-DD形式に変換
4. 開演時刻は24時間形式HH:MM（例: "18:30"）
5. 情報が不明な場合は空文字""を設定
6. イベント情報が見つからない場合は空配列[]を返す
7. JSONのみを返し、説明文は不要

HTMLテキスト:
${textContent}

JSON配列:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // JSONを抽出（マークダウンコードブロックを除去）
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('AI returned no valid JSON array');
      return [];
    }

    const events = JSON.parse(jsonMatch[0]) as Candidate[];
    console.log(`AI extracted ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('AI extraction failed:', error);
    return [];
  }
}
