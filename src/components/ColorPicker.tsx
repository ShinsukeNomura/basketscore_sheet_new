'use client';

import { JERSEY_COLORS, JerseyColorId } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  selected: JerseyColorId | string;
  onChange: (id: JerseyColorId) => void;
}

export function ColorPicker({ selected, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {JERSEY_COLORS.map((c) => (
        <button
          key={c.id}
          onPointerDown={() => onChange(c.id)}
          className="flex flex-col items-center gap-1"
          aria-label={c.label}
        >
          <span
            className={cn(
              'w-8 h-8 rounded-full transition-all duration-100',
              selected === c.id
                ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950 scale-110'
                : 'opacity-60 hover:opacity-90 hover:scale-105',
            )}
            style={{ backgroundColor: c.dotHex }}
          />
          <span className={cn(
            'text-[10px] font-medium leading-none',
            selected === c.id ? 'text-white/80' : 'text-white/30',
          )}>
            {c.label}
          </span>
        </button>
      ))}
    </div>
  );
}
