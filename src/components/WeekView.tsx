"use client";

import { useMemo } from "react";
import { usePostPilotStore, statusProgress } from "@/store/usePostPilotStore";
import { startOfWeek, addDays, toDateString, weekRangeLabel } from "@/lib/date";
import { PLATFORM_SHORT, type Platform } from "@/lib/types";

function dotClass(p: Platform) {
  return `pDot p${p[0].toUpperCase()}${p.slice(1)}`;
}

const ORDER: Platform[] = [
  "tiktok",
  "youtube",
  "instagram",
  "facebook",
  "snapchat",
  "pinterest",
];

export default function WeekView() {
  const weekAnchor = usePostPilotStore((s) => s.weekAnchor);
  const prevWeek = usePostPilotStore((s) => s.prevWeek);
  const nextWeek = usePostPilotStore((s) => s.nextWeek);
  const resetToToday = usePostPilotStore((s) => s.resetToToday);

  const entries = usePostPilotStore((s) => s.entries);
  const selectedDate = usePostPilotStore((s) => s.selectedDate);
  const selectDate = usePostPilotStore((s) => s.selectDate);

  const days = useMemo(() => {
    const anchor = new Date(weekAnchor + "T00:00:00");
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(start, i);
      return {
        label: d.toLocaleString("default", { weekday: "short" }),
        day: d.getDate(),
        dateString: toDateString(d),
      };
    });
  }, [weekAnchor]);

  return (
    <section>
      <header className="calendarHeader">
        <div className="calLeft">
          <h2 className="calTitle">
            {weekRangeLabel(new Date(weekAnchor + "T00:00:00"))}
          </h2>
          <div className="calNav">
            <button className="btn btnGhost" onClick={prevWeek} type="button">
              ←
            </button>
            <button className="btn btnGhost" onClick={resetToToday} type="button">
              This week
            </button>
            <button className="btn btnGhost" onClick={nextWeek} type="button">
              →
            </button>
          </div>
        </div>
        <span className="calendarHint">Batch mode: plan 7 days at once</span>
      </header>

      <div className="weekGrid">
        {days.map((d) => {
          const e = entries[d.dateString];
          const isSelected = selectedDate === d.dateString;

          const dots = e ? ORDER.filter((p) => e.platforms[p]).slice(0, 6) : [];
          const prog = e ? statusProgress(e.status) : 0.06;

          return (
            <button
              key={d.dateString}
              type="button"
              className={`weekCard ${isSelected ? "daySelected" : ""}`}
              onClick={() => selectDate(d.dateString)}
            >
              <div className="weekTop">
                <div className="weekDay">
                  <span className="weekDow">{d.label}</span>
                  <span className="weekNum">{d.day}</span>
                </div>

                <div className="dotRow">
                  {dots.map((p) => (
                    <span key={p} className={dotClass(p)} title={PLATFORM_SHORT[p]} />
                  ))}
                </div>
              </div>

              <div className="weekTitle">{e?.title || "—"}</div>

              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${Math.round(prog * 100)}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
