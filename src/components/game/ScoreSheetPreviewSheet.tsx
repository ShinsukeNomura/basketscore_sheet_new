'use client';

import { ChevronLeft, FileText } from 'lucide-react';
import type { GameScoreSheetDocument } from '@/lib/generatePDF';

interface ScoreSheetPreviewSheetProps {
  document:   GameScoreSheetDocument;
  onClose:    () => void;
  onExportPdf: () => void;
  title:      string;
  backLabel:  string;
  exportLabel: string;
}

export function ScoreSheetPreviewSheet({
  document: doc,
  onClose,
  onExportPdf,
  title,
  backLabel,
  exportLabel,
}: ScoreSheetPreviewSheetProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-neutral-950 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-neutral-900/90">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1"
        >
          <ChevronLeft size={20} />
          <span className="text-xs font-medium">{backLabel}</span>
        </button>
        <span className="text-white text-sm font-bold flex-1 truncate">{title}</span>
      </div>

      <iframe
        title={doc.title}
        srcDoc={doc.fullHtml}
        className="flex-1 min-h-0 w-full bg-white border-0"
        sandbox="allow-same-origin allow-scripts"
      />

      <div className="shrink-0 flex gap-3 px-4 py-4 border-t border-white/10 bg-neutral-900/95 safe-area-pb">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3.5 rounded-xl bg-white/8 text-white/70 font-semibold text-sm active:bg-white/12 transition-colors"
        >
          {backLabel}
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm transition-colors"
        >
          <FileText size={17} />
          {exportLabel}
        </button>
      </div>
    </div>
  );
}
