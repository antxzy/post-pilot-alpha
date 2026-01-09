"use client";

import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import PipelineView from "@/components/PipelineView";
import EditorPanel from "@/components/EditorPanel";
import { usePostPilotStore } from "@/store/usePostPilotStore";

export default function AppShell() {
  const view = usePostPilotStore((s) => s.view);

  return (
    <>
      <Header />
      <main className="ppRoot">
        <div className="wrap">
          {view === "calendar" ? (
            <div className="gridLayout">
              <section className="card mainCard">
                <CalendarView />
              </section>
              <EditorPanel />
            </div>
          ) : (
            <PipelineView />
          )}
        </div>
      </main>
    </>
  );
}
