'use client';

import type { GameSummary } from '@/types';
import { useDictionary } from '@/i18n/DictionaryProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UnsavedCloudSaveDialogProps {
  open:     boolean;
  games:    GameSummary[];
  onCancel: () => void;
  onProceed: () => void;
}

export function UnsavedCloudSaveDialog({
  open,
  games,
  onCancel,
  onProceed,
}: UnsavedCloudSaveDialogProps) {
  const dict = useDictionary();
  const h = dict.home;

  const names = games.map((g) => g.game_name).join('、');

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent
        showCloseButton={false}
        className="bg-neutral-900 text-white border-white/10 sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-white">{h.unsavedCloudTitle}</DialogTitle>
          <DialogDescription className="text-white/60">
            {h.unsavedCloudBody.replace('{games}', names)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:justify-end border-t-0 bg-transparent p-0 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-white/20 text-white/80"
            onClick={onCancel}
          >
            {h.unsavedCloudCancel}
          </Button>
          <Button
            type="button"
            className="flex-1 bg-sky-600 hover:bg-sky-500 text-white"
            onClick={onProceed}
          >
            {h.unsavedCloudProceed}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
