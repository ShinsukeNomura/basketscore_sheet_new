import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function p(v: number, a: number) {
  return a > 0 ? (v / a * 100).toFixed(0) + '%' : '—';
}
function a(total: number, games: number) {
  return games > 0 ? (total / games).toFixed(1) : '0';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    let prompt = '';

    if (type === 'team') {
      const { teamName, games, wins, totalPts, totalPtsAllowed,
              fg2m, fg2a, fg3m, fg3a, ftm, fta,
              orbd, drbd, ast, stl, blk, tov, foul, players } = body;
      const g = games;
      const losses = g - wins;
      const winRate = g > 0 ? Math.round(wins / g * 100) : 0;

      prompt = `
あなたは経験豊富なバスケットボールのコーチアナリストです。
以下の${g}試合分の累積スタッツを元に、チームの分析レポートを日本語で作成してください。

【チーム名】${teamName}
【成績】${g}試合 ${wins}勝${losses}敗（勝率${winRate}%）

【チームスタッツ（累計）】
・得点：計${totalPts}点（平均${a(totalPts,g)}点/試合）
・失点：計${totalPtsAllowed}点（平均${a(totalPtsAllowed,g)}点/試合）
・2Pシュート：${fg2m}/${fg2a}本（${p(fg2m,fg2a)}）
・3Pシュート：${fg3m}/${fg3a}本（${p(fg3m,fg3a)}）
・フリースロー：${ftm}/${fta}本（${p(ftm,fta)}）
・OFリバウンド：計${orbd}（平均${a(orbd,g)}/試合）
・DFリバウンド：計${drbd}（平均${a(drbd,g)}/試合）
・アシスト：計${ast}（平均${a(ast,g)}/試合）
・スティール：計${stl}（平均${a(stl,g)}/試合）
・ブロック：計${blk}（平均${a(blk,g)}/試合）
・ターンオーバー：計${tov}（平均${a(tov,g)}/試合）
・ファウル：計${foul}（平均${a(foul,g)}/試合）

【個人スタッツ（累計）】
${(players as {backNumber:string;pts:number;fg2m:number;fg2a:number;fg3m:number;fg3a:number;ftm:number;fta:number;orbd:number;drbd:number;ast:number;stl:number;blk:number;tov:number;foul:number;games:number}[]).map(pl =>
  `#${pl.backNumber}（${pl.games}試合）: ${pl.pts}pts 2P${pl.fg2m}/${pl.fg2a}(${p(pl.fg2m,pl.fg2a)}) 3P${pl.fg3m}/${pl.fg3a}(${p(pl.fg3m,pl.fg3a)}) FT${pl.ftm}/${pl.fta} RBD${pl.orbd+pl.drbd} AST${pl.ast} STL${pl.stl} TOV${pl.tov}`
).join('\n')}

以下の形式で分析レポートを作成してください（具体的な数値を根拠に）：

■ 現状評価
（チーム全体のパフォーマンスを総合的に3〜4文で評価）

■ 強み
・
・
・

■ 課題・改善点
・
・
・

■ 次の試合への戦術的対策
・
・
・

■ 注目選手と役割提案
（各選手の特徴と推奨ポジション/役割を簡潔に）
`;
    } else if (type === 'player') {
      const { backNumber, games, pts,
              fg2m, fg2a, fg3m, fg3a, ftm, fta,
              orbd, drbd, ast, stl, blk, tov, foul } = body;
      const g = games;

      prompt = `
あなたは経験豊富なバスケットボールのコーチアナリストです。
以下の${g}試合分の個人スタッツを元に、選手の詳細分析レポートを日本語で作成してください。

【選手】#${backNumber}
【出場】${g}試合
【総得点】${pts}点（平均${a(pts,g)}点/試合）

【シュートスタッツ】
・2Pシュート：${fg2m}/${fg2a}本（${p(fg2m,fg2a)}）
・3Pシュート：${fg3m}/${fg3a}本（${p(fg3m,fg3a)}）
・フリースロー：${ftm}/${fta}本（${p(ftm,fta)}）

【その他スタッツ（試合平均）】
・OFリバウンド：${a(orbd,g)}
・DFリバウンド：${a(drbd,g)}
・アシスト：${a(ast,g)}
・スティール：${a(stl,g)}
・ブロック：${a(blk,g)}
・ターンオーバー：${a(tov,g)}
・ファウル：${a(foul,g)}

以下の形式で分析レポートを作成してください：

■ 選手評価
（全体的な評価を2〜3文）

■ 強み
・
・

■ 改善点
・
・

■ 練習・プレー改善の提案
・
・
・
`;
    } else {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }

    const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return NextResponse.json({ report: result.response.text() });

  } catch (error) {
    console.error('Stats analyze error:', error);
    return NextResponse.json({ error: 'AI分析に失敗しました' }, { status: 500 });
  }
}
