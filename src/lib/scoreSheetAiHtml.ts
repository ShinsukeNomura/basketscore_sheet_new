/** AI分析レポート（プレーンテキスト）をスコアシート用HTMLに変換 */

export interface ScoreSheetAiReport {
  title: string;
  body: string;
  generatedLabel?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Markdown風の見出し・箇条書きをHTMLテキストに（画像ではなく選択可能な文字） */
export function formatAiReportBody(raw: string): string {
  const lines = raw.split('\n');
  const parts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('## ')) {
      closeList();
      parts.push(`<h3 class="ai-h3">${escapeHtml(t.slice(3))}</h3>`);
    } else if (t.startsWith('### ')) {
      closeList();
      parts.push(`<h4 class="ai-h4">${escapeHtml(t.slice(4))}</h4>`);
    } else if (/^[-・•]\s/.test(t)) {
      if (!inList) {
        parts.push('<ul class="ai-ul">');
        inList = true;
      }
      parts.push(`<li>${escapeHtml(t.replace(/^[-・•]\s*/, ''))}</li>`);
    } else if (!t) {
      closeList();
    } else {
      closeList();
      parts.push(`<p class="ai-p">${escapeHtml(t)}</p>`);
    }
  }
  closeList();
  return parts.join('');
}

export const AI_REPORT_PDF_STYLE = `
  .sheet-ai {
    border: 1px solid #93c5fd; background: #f8fafc; border-radius: 3px;
    padding: 2mm 2.5mm; box-sizing: border-box; font-size: 6pt; line-height: 1.3;
    color: #1f2937; overflow: hidden;
  }
  .sheet-ai h2 { font-size: 7pt; font-weight: 800; color: #1e40af; margin: 0 0 1mm; border: none; padding: 0; }
  .sheet-ai .ai-meta { font-size: 5.5pt; color: #6b7280; margin-bottom: 1.5mm; }
  .sheet-ai .ai-body { font-size: 6pt; line-height: 1.32; }
  .sheet-ai .ai-h3 { font-size: 6.5pt; font-weight: 800; color: #1e40af; margin: 1.5mm 0 0.5mm; }
  .sheet-ai .ai-h4 { font-size: 6pt; font-weight: 700; color: #374151; margin: 1mm 0 0.5mm; }
  .sheet-ai .ai-p { margin: 0 0 0.8mm; }
  .sheet-ai .ai-ul { margin: 0 0 1mm; padding-left: 3mm; }
  .sheet-ai .ai-ul li { margin-bottom: 0.3mm; }
`;
