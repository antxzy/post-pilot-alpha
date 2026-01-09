"use client";

import { useMemo, useState } from "react";
import { usePostPilotStore, ensureEntry, repurposeSuggestions } from "@/store/usePostPilotStore";
import {
  ALL_PLATFORMS,
  PLATFORM_LABEL,
  STATUS_LABEL,
  type DayEntry,
  type Platform,
  type Status,
} from "@/lib/types";
import { downloadJson } from "@/lib/storage";

const STATUSES: Status[] = ["idea", "script", "filming", "editing", "scheduled", "posted"];

function dotClass(p: Platform) {
  return `pDot p${p[0].toUpperCase()}${p.slice(1)}`;
}

export default function EditorPanel() {
  const selectedDate = usePostPilotStore((s) => s.selectedDate);
  const entries = usePostPilotStore((s) => s.entries);
  const upsert = usePostPilotStore((s) => s.upsert);
  const remove = usePostPilotStore((s) => s.remove);
  const copyFrom = usePostPilotStore((s) => s.copyFrom);
  const pasteTo = usePostPilotStore((s) => s.pasteTo);
  const copied = usePostPilotStore((s) => s.copied);
  const exportAll = usePostPilotStore((s) => s.exportAll);
  const importAll = usePostPilotStore((s) => s.importAll);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const entry: DayEntry | null = useMemo(() => {
    if (!selectedDate) return null;
    return ensureEntry(entries, selectedDate);
  }, [selectedDate, entries]);

  if (!selectedDate || !entry) {
    return (
      <aside className="panel card">
        <div className="panelTop">
          <div>
            <div className="panelTitle">Editor</div>
            <div className="panelSub">Click a day to start planning.</div>
          </div>
        </div>
        <div className="panelFoot">
          <span style={{ opacity: 0.7 }}>
            Beta tip: Week view is best for batching content.
          </span>
        </div>
      </aside>
    );
  }

  const onChange = (patch: Partial<DayEntry>) => {
    upsert({ ...entry, ...patch, updatedAt: Date.now() });
  };

  const suggestions = repurposeSuggestions(entry.primaryPlatform);

  const handleExportDay = () => downloadJson(`postpilot-${selectedDate}.json`, entry);
  const handleExportAll = () => downloadJson(`postpilot-export.json`, exportAll());

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText) as Record<string, DayEntry>;
      importAll(parsed);
      setImportText("");
      setImportOpen(false);
    } catch {
      alert("Import failed. Paste valid JSON from a previous export.");
    }
  };

  return (
    <aside className="panel card">
      <div className="panelTop">
        <div>
          <div className="panelTitle">{selectedDate}</div>
          <div className="panelSub">Plan content for this day</div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn btnGhost" type="button" onClick={() => copyFrom(selectedDate)}>
            Copy
          </button>
          <button
            className="btn btnGhost"
            type="button"
            disabled={!copied}
            onClick={() => pasteTo(selectedDate)}
            title={!copied ? "Copy a day first" : "Paste copied content here"}
          >
            Paste
          </button>
          <button className="btn" type="button" onClick={() => remove(selectedDate)}>
            Clear
          </button>
        </div>
      </div>

      <div className="field">
        <label>Content Idea</label>
        <input
          value={entry.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g., quick tip, before/after, behind-the-scenes"
        />
      </div>

      <div className="field">
        <label>Hook (first 1–2 seconds)</label>
        <input
          value={entry.hook}
          onChange={(e) => onChange({ hook: e.target.value })}
          placeholder='e.g., "If you do THIS, you’re killing your reach..."'
        />
      </div>

      <div className="field">
        <label>Platforms</label>
        <div className="platRow">
          {ALL_PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              className={`platPill ${entry.platforms[p] ? "platOn" : ""}`}
              onClick={() =>
                onChange({
                  platforms: { ...entry.platforms, [p]: !entry.platforms[p] },
                })
              }
            >
              <span className={dotClass(p)} />
              {PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="fieldRow">
        <div className="field">
          <label>Status</label>
          <select
            value={entry.status}
            onChange={(e) => onChange({ status: e.target.value as Status })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Format (optional)</label>
          <input
            value={entry.format}
            onChange={(e) => onChange({ format: e.target.value })}
            placeholder="e.g., POV, Storytime, Tutorial"
          />
        </div>
      </div>

      <div className="field">
        <label>Primary Platform</label>
        <select
          value={entry.primaryPlatform}
          onChange={(e) => onChange({ primaryPlatform: e.target.value as Platform })}
        >
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="card subCard">
        <div className="subTitle">Repurpose Plan</div>
        <ul className="bullets">
          {suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <div className="subTitle" style={{ marginTop: 10 }}>
          Repurpose Checklist
        </div>

        <div className="checkGrid">
          {[
            ["filmed", "Original filmed"],
            ["adapted", "Hook trimmed / adapted"],
            ["captioned", "Captions adapted"],
            ["ctaSwapped", "CTA swapped per platform"],
            ["crossPosted", "Cross-posted"],
          ].map(([k, label]) => {
            const key = k as keyof DayEntry["repurpose"];
            const on = entry.repurpose[key];
            return (
              <button
                key={k}
                type="button"
                className={`checkItem ${on ? "checkOn" : ""}`}
                onClick={() =>
                  onChange({
                    repurpose: { ...entry.repurpose, [key]: !on },
                  })
                }
              >
                <span className={`checkBox ${on ? "checkBoxOn" : ""}`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea
          value={entry.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Shot list, captions, CTA, music, repurpose notes..."
          rows={7}
        />
      </div>

      <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
        <div className="row">
          <button className="btn btnGhost" type="button" onClick={handleExportDay}>
            Export Day
          </button>
          <button className="btn btnGhost" type="button" onClick={handleExportAll}>
            Export All
          </button>
          <button className="btn btnGhost" type="button" onClick={() => setImportOpen((v) => !v)}>
            Import
          </button>
        </div>

        <span style={{ opacity: 0.7, fontSize: 12.5 }}>
          Month = consistency • Week = batching
        </span>
      </div>

      {importOpen && (
        <div className="card subCard" style={{ marginTop: 10 }}>
          <div className="subTitle">Import JSON</div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste a previous postpilot-export.json contents here…"
            rows={6}
          />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={handleImport}>
              Import Now
            </button>
            <button className="btn btnGhost" type="button" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
