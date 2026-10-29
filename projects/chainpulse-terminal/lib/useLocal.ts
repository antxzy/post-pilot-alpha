"use client";
import { useEffect, useState } from "react";
export function useLocal<T>(key: string, init: () => T) {
  const [value, setValue] = useState<T>(init);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const saved = localStorage.getItem(key); if (saved) setValue(JSON.parse(saved) as T); }
    catch { /* preserve default */ }
    setReady(true);
  }, [key]);
  useEffect(() => { if (ready) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage full */ } } }, [key, ready, value]);
  return [value, setValue, ready] as const;
}
