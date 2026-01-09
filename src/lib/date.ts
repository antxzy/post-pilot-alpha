export type CalendarCell =
  | { kind: "pad"; key: string }
  | { kind: "day"; day: number; dateString: string; key: string };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

export function clampMonth(year: number, month: number) {
  if (month < 0) return { year: year - 1, month: 11 };
  if (month > 11) return { year: year + 1, month: 0 };
  return { year, month };
}

export function getMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const firstDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const out: CalendarCell[] = [];
  for (let i = 0; i < firstDow; i++) out.push({ kind: "pad", key: `pad-${i}` });

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    out.push({
      kind: "day",
      day: d,
      dateString: toDateString(dt),
      key: `day-${year}-${month}-${d}`,
    });
  }

  const remainder = out.length % 7;
  if (remainder !== 0) {
    const pads = 7 - remainder;
    for (let i = 0; i < pads; i++) out.push({ kind: "pad", key: `endpad-${i}` });
  }
  return out;
}

// Week helpers: Mon–Sun
export function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 Sun
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function weekRangeLabel(anchor: Date) {
  const s = startOfWeek(anchor);
  const e = addDays(s, 6);
  const fmt = (x: Date) =>
    x.toLocaleString("default", { month: "short", day: "numeric" });
  return `${fmt(s)} — ${fmt(e)}`;
}
