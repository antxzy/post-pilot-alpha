import Link from "next/link";


export default function Home() {
  return (
    <main className="homeRoot">
      <div className="homeGlow" />
      <div className="homeCard">
        <div className="homeBrand">
          <div className="homeIcon" aria-hidden />
          <div>
            <div className="homeTitle">Post Pilot</div>
            <div className="homeSub">Plan once → repurpose everywhere</div>
          </div>
        </div>

        <Link className="homeBtn" href="/app">
          Launch Post Pilot
        </Link>

        <div className="homeHint">
          Beta build: Month/Week calendar, editor, pipeline, export/import.
        </div>
      </div>
    </main>
  );
}
