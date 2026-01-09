"use client";

import { create } from "zustand";
import { clampMonth, toDateString, addDays } from "@/lib/date";
import { loadEntries, saveEntries } from "@/lib/storage";
import type { CalendarMode, DayEntry, Platform, Status, View } from "@/lib/types";

type Store = {
  view: View;
  setView: (v: View) => void;

  mode: CalendarMode;
  setMode: (m: CalendarMode) => void;

  currentYear: number;
  currentMonth: number;
  prevMonth: () => void;
  nextMonth: () => void;

  weekAnchor: string;
  prevWeek: () => void;
  nextWeek: () => void;

  selectedDate: string | null;
  selectDate: (dateString: string) => void;

  entries: Record<string, DayEntry>;
  upsert: (entry: DayEntry) => void;
  remove: (dateString: string) => void;

  copied: DayEntry | null;
  copyFrom: (dateString: string) => void;
  pasteTo: (dateString: string) => void;

  resetToToday: () => void;

  exportAll: () => Record<string, DayEntry>;
  importAll: (data: Record<string, DayEntry>) => void;
};

function defaultEntry(dateString: string): DayEntry {
  return {
    dateString,
    title: "",
    hook: "",
    notes: "",
    format: "",
    status: "idea",
    platforms: {
      tiktok: true,
      youtube: false,
      instagram: true,
      facebook: false,
      snapchat: true,
      pinterest: false,
    },
    primaryPlatform: "tiktok",
    repurpose: {
      filmed: false,
      adapted: false,
      captioned: false,
      ctaSwapped: false,
      crossPosted: false,
    },
    updatedAt: Date.now(),
  };
}

export function statusProgress(status: Status) {
  switch (status) {
    case "idea":
      return 0.12;
    case "script":
      return 0.32;
    case "filming":
      return 0.52;
    case "editing":
      return 0.72;
    case "scheduled":
      return 0.9;
    case "posted":
      return 1;
  }
}

export function ensureEntry(
  entries: Record<string, DayEntry>,
  dateString: string
): DayEntry {
  return entries[dateString] ?? defaultEntry(dateString);
}

export function repurposeSuggestions(primary: Platform): string[] {
  switch (primary) {
    case "tiktok":
      return [
        "IG Reels: tighten hook, keep on-screen text short",
        "YouTube Shorts: add CTA in the last 2 seconds",
        "Pinterest: convert to a 3-step Idea Pin",
      ];
    case "youtube":
      return [
        "Shorts: strongest moment first (no intro)",
        "TikTok: swap CTA to “follow for part 2”",
        "IG Reels: captions + punchier opening line",
      ];
    case "instagram":
      return [
        "TikTok: more direct hook (problem → promise)",
        "YouTube Shorts: add 1 sentence context on-screen",
        "Facebook: repost + add a question in caption",
      ];
    case "facebook":
      return [
        "IG Reels: shorter cut + cleaner captions",
        "TikTok: faster pacing (cut pauses)",
        "YouTube Shorts: CTA + keyword line",
      ];
    case "snapchat":
      return [
        "TikTok: republish with stronger first frame",
        "IG: add captions + cleaner framing",
        "Pinterest: convert to steps + headline",
      ];
    case "pinterest":
      return [
        "IG Reels: add face-to-camera hook",
        "TikTok: trend-friendly audio + tighter edit",
        "YouTube Shorts: add CTA + keyword line",
      ];
  }
}

export const usePostPilotStore = create<Store>((set, get) => {
  const now = new Date();
  const entries = loadEntries();

  return {
    view: "calendar",
    setView: (v) => set({ view: v }),

    mode: "month",
    setMode: (m) => set({ mode: m }),

    currentYear: now.getFullYear(),
    currentMonth: now.getMonth(),
    prevMonth: () => {
      const { currentYear, currentMonth } = get();
      const next = clampMonth(currentYear, currentMonth - 1);
      set({ currentYear: next.year, currentMonth: next.month });
    },
    nextMonth: () => {
      const { currentYear, currentMonth } = get();
      const next = clampMonth(currentYear, currentMonth + 1);
      set({ currentYear: next.year, currentMonth: next.month });
    },

    weekAnchor: toDateString(now),
    prevWeek: () => {
      const anchor = new Date(get().weekAnchor + "T00:00:00");
      const prev = addDays(anchor, -7);
      set({ weekAnchor: toDateString(prev) });
    },
    nextWeek: () => {
      const anchor = new Date(get().weekAnchor + "T00:00:00");
      const next = addDays(anchor, 7);
      set({ weekAnchor: toDateString(next) });
    },

    selectedDate: toDateString(now),
    selectDate: (dateString) => set({ selectedDate: dateString }),

    entries,
    upsert: (entry) => {
      const next = { ...get().entries, [entry.dateString]: entry };
      set({ entries: next });
      saveEntries(next);
    },
    remove: (dateString) => {
      const next = { ...get().entries };
      delete next[dateString];
      set({ entries: next });
      saveEntries(next);
    },

    copied: null,
    copyFrom: (dateString) => {
      const e = get().entries[dateString] ?? defaultEntry(dateString);
      set({ copied: { ...e } });
    },
    pasteTo: (dateString) => {
      const c = get().copied;
      if (!c) return;
      const pasted: DayEntry = { ...c, dateString, updatedAt: Date.now() };
      get().upsert(pasted);
    },

    resetToToday: () => {
      const t = new Date();
      const ds = toDateString(t);
      set({
        currentYear: t.getFullYear(),
        currentMonth: t.getMonth(),
        weekAnchor: ds,
        selectedDate: ds,
      });
    },

    exportAll: () => get().entries,
    importAll: (data) => {
      set({ entries: data });
      saveEntries(data);
    },
  };
});
