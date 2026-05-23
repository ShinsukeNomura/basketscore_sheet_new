'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, FileText, Share2 } from 'lucide-react';
import type { GameScoreSheetDocument } from '@/lib/generatePDF';
import {
  A4_PREVIEW_HEIGHT_PX,
  A4_PREVIEW_WIDTH_PX,
  printGameScoreSheet,
  shareScoreSheet,
} from '@/lib/scoreSheetExport';

interface ScoreSheetPreviewSheetProps {
  document:   GameScoreSheetDocument;
  onClose:    () => void;
  title:      string;
  backLabel:  string;
  exportLabel: string;
  shareLabel: string;
  shareDoneLabel: string;
  shareFallbackLabel: string;
  popupBlocked: string;
  shownAboveLabel: string;
}

export function ScoreSheetPreviewSheet({
  document: doc,
  onClose,
  title,
  backLabel,
  exportLabel,
  shareLabel,
  shareDoneLabel,
  shareFallbackLabel,
  popupBlocked,
  shownAboveLabel,
}: ScoreSheetPreviewSheetProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const updateScale = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const pad = 8;
    const w = el.clientWidth - pad;
    setScale(Math.min(1, w / A4_PREVIEW_WIDTH_PX));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const t = window.setTimeout(() => { el.scrollTop = 0; }, 50);
    return () => window.clearTimeout(t);
  }, [doc.fullHtml]);

  const handlePrint = () => {
    printGameScoreSheet(doc, popupBlocked);
  };

  const handleShare = async () => {
    setShareMsg(null);
    const result = await shareScoreSheet(doc);
    if (result === 'shared') setShareMsg(shareDoneLabel);
    else if (result === 'downloaded') setShareMsg(shareFallbackLabel);
    else if (result === 'cancelled') setShareMsg(null);
    else setShareMsg(shareFallbackLabel);
    window.setTimeout(() => setShareMsg(null), 2500);
  };

  const scaledH = A4_PREVIEW_HEIGHT_PX * scale;

  return (
    <div className="fixed inset-0 z-[60] bg-neutral-950 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-neutral-900/90">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-0.5 text-sky-400 active:text-sky-200 transition-colors shrink-0 -ml-1 min-h-[44px] min-w-[44px] -my-1"
          aria-label={backLabel}
        >
          <ChevronLeft size={22} />
          <span className="text-xs font-medium">{backLabel}</span>
        </button>
        <span className="text-white text-sm font-bold flex-1 truncate">{title}</span>
      </div>

      <div
        ref={viewportRef}
        className="flex-1 min-h-0 overflow-auto bg-neutral-800"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="mx-auto"
          style={{
            width: A4_PREVIEW_WIDTH_PX * scale,
            height: scaledH,
            marginTop: 4,
            marginBottom: 8,
          }}
        >
          <iframe
            title={doc.title}
            srcDoc={doc.fullHtml}
            className="bg-white border-0 shadow-md origin-top-left"
            style={{
              width: A4_PREVIEW_WIDTH_PX,
              height: A4_PREVIEW_HEIGHT_PX,
              transform: `scale(${scale})`,
            }}
          />
        </div>
      </div>

      {shareMsg && (
        <p className="shrink-0 text-center text-emerald-400 text-xs px-4 py-1">{shareMsg}</p>
      )}

      <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-t border-white/10 bg-neutral-900/95 safe-area-pb">
        <p
          className="text-center text-amber-300 font-bold text-sm py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/35"
          role="status"
        >
          ↑ {shownAboveLabel}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-sky-600 active:bg-sky-700 text-white font-bold text-sm transition-colors min-h-[48px]"
          >
            <Share2 size={17} />
            {shareLabel}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm transition-colors min-h-[48px]"
          >
            <FileText size={17} />
            {exportLabel}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-white/10 text-white/80 font-semibold text-sm active:bg-white/15 transition-colors min-h-[44px]"
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}
