'use client';

import { createContext, useContext } from 'react';
import type jaDict from './messages/ja.json';

export type Dictionary = typeof jaDict;

const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({
  dict,
  children,
}: {
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={dict}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): Dictionary {
  const ctx = useContext(DictionaryContext);
  if (!ctx) throw new Error('useDictionary must be used within DictionaryProvider');
  return ctx;
}
