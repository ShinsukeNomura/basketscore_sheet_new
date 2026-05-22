'use client';

import { FileText } from 'lucide-react';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface PdfConfirmDialogProps {
  title?:    string;
  onConfirm: () => void;
  onCancel:  () => void;
}

export function PdfConfirmDialog({ title, onConfirm, onCancel }: PdfConfirmDialogProps) {
  const pdf = useDictionary().pdf;
  const dialogTitle = title ?? pdf.confirmTitle;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-6">
      <div className="bg-neutral-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-emerald-400" />
          </div>
          <h3 className="text-white font-bold text-base">{dialogTitle}</h3>
        </div>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          {pdf.confirmBody}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/8 text-white/60 font-semibold text-sm active:bg-white/12 transition-colors"
          >
            {pdf.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm transition-colors"
          >
            {pdf.export}
          </button>
        </div>
      </div>
    </div>
  );
}
