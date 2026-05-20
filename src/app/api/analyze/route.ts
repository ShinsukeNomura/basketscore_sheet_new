import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { gameName, date, ourTeamName, theirTeamName, ourScore, theirScore, periodScores, playerStats } = await req.json();

    const prompt = `
あなたはバスケットボールのコーチアナリストです。以下の試合データを分析して、日本語で簡潔なレポートを作成してください。

【試合情報】
- 試合名: ${gameName}
- 日付: ${date}
- スコア: ${ourTeamName} ${ourScore} - ${theirScore} ${theirTeamName}

【クォーター別スコア】
${periodScores.map((p: {period: number; our: number; their: number}) => `${p.period}Q: ${ourTeamName} ${p.our} - ${p.their} ${theirTeamName}`).join('\n')}

【${ourTeamName} 選手スタッツ】
${playerStats.our.map((p: {num: string; pts: number; fg2: number; fg2a: number; fg3: number; fg3a: number; ft: number; fta: number; orbd: number; drbd: number; ast: number; stl: number; blk: number; tov: number; foul: number}) =>
  `#${p.num}: ${p.pts}得点 2PT${p.fg2}/${p.fg2a} 3PT${p.fg3}/${p.fg3a} FT${p.ft}/${p.fta} OR${p.orbd} DR${p.drbd} AST${p.ast} STL${p.stl} BLK${p.blk} TOV${p.tov} F${p.foul}`
).join('\n') || 'データなし'}

【${theirTeamName} 選手スタッツ】
${playerStats.their.map((p: {num: string; pts: number; fg2: number; fg2a: number; fg3: number; fg3a: number; ft: number; fta: number; orbd: number; drbd: number; ast: number; stl: number; blk: number; tov: number; foul: number}) =>
  `#${p.num}: ${p.pts}得点 2PT${p.fg2}/${p.fg2a} 3PT${p.fg3}/${p.fg3a} FT${p.ft}/${p.fta} OR${p.orbd} DR${p.drbd} AST${p.ast} STL${p.stl} BLK${p.blk} TOV${p.tov} F${p.foul}`
).join('\n') || 'データなし'}

以下の構成でレポートを作成してください（各セクション2〜3文で簡潔に）：

## 試合総評
## ${ourTeamName} の分析
### 良かった点
### 改善点
## ${theirTeamName} の分析
## 注目選手
## 次戦への提言
`;

    const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    return NextResponse.json({ report: text });
  } catch (error) {
    console.error('Gemini analyze error:', error);
    return NextResponse.json({ error: 'AI分析に失敗しました' }, { status: 500 });
  }
}
