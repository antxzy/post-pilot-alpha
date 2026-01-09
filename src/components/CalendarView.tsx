"use client";

import WeekView from "@/components/WeekView";
import { usePostPilotStore, statusProgress } from "@/store/usePostPilotStore";
import { getMonthGrid, monthLabel, toDateString } from "@/lib/date";
import { ALL_PLATFORMS, PLATFORM_SHORT, type Platform } from "@/lib/types";

function dotClass(p: Platform) {
  return `pDot p${p[0].toUpperCase()}${p.slice(1)}`;
}

const ORDER: Platform[] = ["tiktok", "youtube", "instagram", "facebook", "snapchat", "pinterest"];

function isPast(dateString: string) {
  const today = toDateString(new Date());
  return dateString < today;
}

export default function CalendarView() {
  const mode = usePostPilotStore((s) => s.mode);

  const currentMonth = usePostPilotStore((s) => s.currentMonth);
  const currentYear = usePostPilotStore((s) => s.currentYear);
  const prevMonth = usePostPilotStore((s) => s.prevMonth);
  const nextMonth = usePostPilotStore((s) => s.nextMonth);
  const resetToToday = usePostPilotStore((s) => s.resetToToday);

  const selectedDate = usePostPilotStore((s) => s.selectedDate);
  const selectDate = usePostPilotStore((s) => s.selectDate);

  const entries = usePostPilotStore((s) => s.entries);

  if (mode === "week") return <WeekView />;

  const grid = getMonthGrid(currentYear, currentMonth);

  const inMonth = Object.values(entries).filter((e) => {
    const y = Number(e.dateString.slice(0, 4));
    const m = Number(e.dateString.slice(5, 7)) - 1;
    return y === currentYear && m === currentMonth;
  });

  const plannedDays = inMonth.filter((e) => e.title.trim().length > 0).length;
  const postedDays = inMonth.filter((e) => e.status === "posted").length;

  const platformTouches = inMonth.reduce((acc, e) => {
    let count = 0;
    for (const p of ALL_PLATFORMS) if (e.platforms[p]) count++;
    return acc + count;
  }, 0);

  const monthCellDays = grid.filter((c) => c.kind === "day").length;
  const consistency = monthCellDays === 0 ? 0 : plannedDays / monthCellDays;
  const postingRate = plannedDays === 0 ? 0 : postedDays / plannedDays;
  const platformRate = plannedDays === 0 ? 0 : Math.min(1, platformTouches / (plannedDays * 2));
  const score = Math.round((consistency * 0.45 + postingRate * 0.35 + platformRate * 0.2) * 100);

  return (
    <section>
      <header className="calendarHeader">
        <div className="calLeft">
          <h2 className="calTitle">{monthLabel(currentYear, currentMonth)}</h2>
          <div className="calNav">
            <button className="btn btnGhost" type="button" onClick={prevMonth}>
              ←
            </button>
            <button className="btn btnGhost" type="button" onClick={resetToToday}>
              Today
            </button>
            <button className="btn btnGhost" type="button" onClick={nextMonth}>
              →
            </button>
          </div>
        </div>

        <span className="calendarHint">Click a day to plan content</span>
      </header>

      <div className="health card">
        <div className="healthTop">
          <div>
            <div className="healthTitle">Monthly Consistency</div>
            <div className="healthSub">
              Score: <b>{score}%</b> • Planned: <b>{plannedDays}</b> • Posted: <b>{postedDays}</b>
            </div>
          </div>
          <div className="healthPills">
            <span className="pill">Consistency {Math.round(consistency * 100)}%</span>
            <span className="pill">Posting {Math.round(postingRate * 100)}%</span>
            <span className="pill">Platform coverage {Math.round(platformRate * 100)}%</span>
          </div>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: `${score}%` }} />
        </div>

        <div className="healthTip">
          Tip: Plan 3 strong hooks → batch film once → repurpose with small edits.
        </div>
      </div>

      <div className="dowRow">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="dow">{d}</div>
        ))}
      </div>

      <div className="calendarGrid">
        {grid.map((cell) => {
          if (cell.kind === "pad") return <div key={cell.key} className="dayPad" />;

          const isSelected = selectedDate === cell.dateString;
          const e = entries[cell.dateString];

          const dots = e ? ORDER.filter((p) => e.platforms[p]).slice(0, 6) : [];
          const prog = e ? statusProgress(e.status) : 0.06;

          const catchUp =
            e &&
            isPast(cell.dateString) &&
            e.title.trim().length > 0 &&
            e.status !== "posted";

          return (
            <button
              key={cell.key}
              type="button"
              className={`dayCell ${isSelected ? "daySelected" : ""} ${catchUp ? "dayCatchUp" : ""}`}
              onClick={() => selectDate(cell.dateString)}
            >
              <div className="dayTop">
                <div className="dayNumber">{cell.day}</div>
                <div className="dotRow">
                  {dots.map((p) => (
                    <span key={p} className={dotClass(p)} title={PLATFORM_SHORT[p]} />
                  ))}
                </div>
              </div>

              <div className="dayTitle">{e?.title ? e.title : "—"}</div>

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
