import type { GameScoreSheetDocument } from '@/lib/generatePDF';

/** 210mm @ 96dpi */
export const A4_PREVIEW_WIDTH_PX  = 794;
export const A4_PREVIEW_HEIGHT_PX = 1123;

function safeFilename(title: string): string {
  const s = title.replace(/[<>:"/\\|?*]/g, '_').trim();
  return s || 'score_sheet';
}

/** 新規タブを開かず同一画面から印刷（モバイルで戻れる） */
export function printGameScoreSheet(
  doc: GameScoreSheetDocument,
  popupBlocked: string,
): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', doc.title);
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '210mm',
    height: '297mm',
    border: 'none',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1',
  });

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 800);
  };

  const doPrint = () => {
    const win = iframe.contentWindow;
    if (!win) {
      alert(popupBlocked);
      cleanup();
      return;
    }
    const onAfter = () => {
      win.removeEventListener('afterprint', onAfter);
      cleanup();
    };
    win.addEventListener('afterprint', onAfter);
    win.focus();
    win.print();
    window.setTimeout(cleanup, 60_000);
  };

  iframe.onload = doPrint;
  document.body.appendChild(iframe);
  iframe.srcdoc = doc.fullHtml;
  window.setTimeout(doPrint, 800);
}

export type ShareScoreSheetResult = 'shared' | 'downloaded' | 'cancelled' | 'unsupported';

/** Web Share API（HTMLファイル）またはダウンロード */
export async function shareScoreSheet(
  doc: GameScoreSheetDocument,
): Promise<ShareScoreSheetResult> {
  const filename = `${safeFilename(doc.title)}.html`;
  const file = new File([doc.fullHtml], filename, { type: 'text/html;charset=utf-8' });

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ title: doc.title, files: [file] });
        return 'shared';
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
    }
  }

  const blob = new Blob([doc.fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

export function canShareScoreSheet(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
