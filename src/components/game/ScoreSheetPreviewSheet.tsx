'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, FileText, Share2 } from 'lucide-react';
import type { GameScoreSheetDocument } from '@/lib/generatePDF';
import {
  A4_PREVIEW_HEIGHT_PX,
  A4_PREVIEW_WIDTH_PX,
  printGameScoreSheet,
  shareScoreSheet,
  shareScoreSheetScreenshot,
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
  screenshotLabel: string;
  screenshotDoneLabel: string;
  screenshotFailLabel: string;
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
  screenshotLabel,
  screenshotDoneLabel,
  screenshotFailLabel,
}: ScoreSheetPreviewSheetProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [userScale, setUserScale] = useState(1);
  const userScaleRef = useRef(1);
  const [contentHeight, setContentHeight] = useState(A4_PREVIEW_HEIGHT_PX);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [screenshotBusy, setScreenshotBusy] = useState(false);

  const measureIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    const body = iframe?.contentDocument?.body;
    if (!body) return;
    const h = Math.ceil(body.scrollHeight || body.offsetHeight);
    if (h > 0) setContentHeight(h);
  }, []);

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

  useEffect(() => {
    setContentHeight(A4_PREVIEW_HEIGHT_PX);
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      measureIframeHeight();
      window.setTimeout(measureIframeHeight, 100);
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [doc.fullHtml, measureIframeHeight]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function pinchDist(t: TouchList) {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    }

    let pinchState: { dist: number; baseScale: number } | null = null;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchState = { dist: pinchDist(e.touches), baseScale: userScaleRef.current };
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || !pinchState) return;
      e.preventDefault();
      const ratio = pinchDist(e.touches) / pinchState.dist;
      const next = Math.min(4, Math.max(0.5, pinchState.baseScale * ratio));
      userScaleRef.current = next;
      setUserScale(next);
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinchState = null;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

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

  const handleScreenshot = async () => {
    const iframe = iframeRef.current;
    if (!iframe || screenshotBusy) return;
    setShareMsg(null);
    setScreenshotBusy(true);
    try {
      const result = await shareScoreSheetScreenshot(iframe, doc.title);
      if (result === 'shared' || result === 'downloaded') setShareMsg(screenshotDoneLabel);
      else if (result === 'failed') setShareMsg(screenshotFailLabel);
    } catch {
      setShareMsg(screenshotFailLabel);
    } finally {
      setScreenshotBusy(false);
      window.setTimeout(() => setShareMsg(null), 2500);
    }
  };

  const appliedScale = scale * userScale;
  const scaledH = contentHeight * appliedScale;

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
            width: A4_PREVIEW_WIDTH_PX * appliedScale,
            height: scaledH,
            marginTop: 4,
            marginBottom: 8,
          }}
        >
          <iframe
            ref={iframeRef}
            title={doc.title}
            srcDoc={doc.fullHtml}
            className="bg-white border-0 shadow-md origin-top-left"
            style={{
              width: A4_PREVIEW_WIDTH_PX,
              height: contentHeight,
              transform: `scale(${appliedScale})`,
            }}
          />
        </div>
      </div>

      {shareMsg && (
        <p className="shrink-0 text-center text-emerald-400 text-xs px-4 py-1">{shareMsg}</p>
      )}

      <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-t border-white/10 bg-neutral-900/95 safe-area-pb">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-sky-600 active:bg-sky-700 text-white font-bold text-[11px] transition-colors min-h-[52px] px-1"
          >
            <Share2 size={17} />
            {shareLabel}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-[11px] transition-colors min-h-[52px] px-1"
          >
            <FileText size={17} />
            {exportLabel}
          </button>
          <button
            type="button"
            onClick={handleScreenshot}
            disabled={screenshotBusy}
            className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-violet-600 active:bg-violet-700 disabled:opacity-60 text-white font-bold text-[11px] transition-colors min-h-[52px] px-1"
          >
            <Camera size={17} />
            {screenshotLabel}
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
