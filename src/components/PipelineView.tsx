"use client";

import { useMemo } from "react";
import { usePostPilotStore } from "@/store/usePostPilotStore";
import { STATUS_LABEL, type Status } from "@/lib/types";

const COLS: Status[] = ["idea", "script", "filming", "editing", "scheduled", "posted"];

export default function PipelineView() {
  const entries = usePostPilotStore((s) => s.entries);
  const selectDate = usePostPilotStore((s) => s.selectDate);
  const setView = usePostPilotStore((s) => s.setView);

  const groups = useMemo(() => {
    const map: Record<string, typeof entries[string][]> = {};
    for (const s of COLS) map[s] = [];
    for (const e of Object.values(entries)) {
      map[e.status].push(e);
    }
    for (const s of COLS) {
      map[s].sort((a, b) => a.dateString.localeCompare(b.dateString));
    }
    return map;
  }, [entries]);

  return (
    <section className="pipeWrap">
      <div className="pipeHeader">
        <div>
          <div className="pipeTitle">Pipeline</div>
          <div className="pipeSub">Drag & drop can come later — this is beta usable now.</div>
        </div>
        <button className="btn btnGhost" type="button" onClick={() => setView("calendar")}>
          Back to Calendar
        </button>
      </div>

      <div className="pipeGrid">
        {COLS.map((s) => (
          <div key={s} className="pipeCol card">
            <div className="pipeColHead">
              <div className="pipeColTitle">{STATUS_LABEL[s]}</div>
              <div className="pipeCount">{groups[s].length}</div>
            </div>

            <div className="pipeList">
              {groups[s].length === 0 ? (
                <div className="pipeEmpty">No items</div>
              ) : (
                groups[s].map((e) => (
                  <button
                    key={e.dateString}
                    type="button"
                    className="pipeCard"
                    onClick={() => {
                      selectDate(e.dateString);
                      setView("calendar");
                    }}
                  >
                    <div className="pipeCardTop">
                      <div className="pipeDate">{e.dateString}</div>
                      <div className="pipeDots">
                        {Object.entries(e.platforms)
                          .filter(([, on]) => on)
                          .slice(0, 6)
                          .map(([p]) => (
                            <span key={p} className={`pDot p${p[0].toUpperCase()}${p.slice(1)}`} />
                          ))}
                      </div>
                    </div>

                    <div className="pipeCardTitle">{e.title || "—"}</div>
                    {e.hook ? <div className="pipeCardHook">“{e.hook}”</div> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
