"use client";

import { usePostPilotStore } from "@/store/usePostPilotStore";

function PilotIcon() {
  // simple “fighter helmet” style icon (no external assets needed)
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="g" x1="10" y1="8" x2="56" y2="58">
          <stop stopColor="rgba(139,92,246,0.85)" />
          <stop offset="1" stopColor="rgba(56,189,248,0.35)" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
      <path d="M32 17c8.5 0 15.5 6.8 15.5 15.2v2.2c0 7.6-5.6 14.1-13 15.3l-2.5.4-2.5-.4c-7.4-1.2-13-7.7-13-15.3v-2.2C16.5 23.8 23.5 17 32 17Z" fill="url(#g)" opacity="0.9"/>
      <path d="M21 33.2c4.3-3.8 9.6-5.8 15.7-5.8 3.4 0 6.6.6 9.6 1.7" stroke="rgba(0,0,0,0.5)" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      <path d="M19 34.5c4.8-4.4 10.8-6.6 17.7-6.6 4 0 7.7.7 11.1 2.1" stroke="rgba(236,244,255,0.7)" strokeWidth="3" strokeLinecap="round"/>
      <path d="M25 45h14" stroke="rgba(236,244,255,0.65)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export default function Header() {
  const view = usePostPilotStore((s) => s.view);
  const setView = usePostPilotStore((s) => s.setView);
  const mode = usePostPilotStore((s) => s.mode);
  const setMode = usePostPilotStore((s) => s.setMode);
  const resetToToday = usePostPilotStore((s) => s.resetToToday);

  return (
    <header className="topBar">
      <div className="wrap topBarInner">
        <div className="brand">
          <div className="brandIcon">
            <PilotIcon />
          </div>
          <div className="brandText">
            <div className="brandName">Post Pilot</div>
            <div className="brandTag">Plan once → repurpose everywhere</div>
          </div>
        </div>

        <div className="nav">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${view === "calendar" ? "tabOn" : ""}`}
              onClick={() => setView("calendar")}
            >
              Calendar
            </button>
            <button
              type="button"
              className={`tab ${view === "pipeline" ? "tabOn" : ""}`}
              onClick={() => setView("pipeline")}
            >
              Pipeline
            </button>
          </div>

          {view === "calendar" && (
            <div className="seg">
              <button
                className={`segBtn ${mode === "month" ? "segOn" : ""}`}
                type="button"
                onClick={() => setMode("month")}
              >
                Month
              </button>
              <button
                className={`segBtn ${mode === "week" ? "segOn" : ""}`}
                type="button"
                onClick={() => setMode("week")}
              >
                Week
              </button>
            </div>
          )}

          <button className="btn btnGhost" type="button" onClick={resetToToday}>
            Today
          </button>
        </div>
      </div>
    </header>
  );
}
