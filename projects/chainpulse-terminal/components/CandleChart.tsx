"use client";
import { useMemo, useState } from "react";
import type { Candle } from "@/lib/types";
import { compact, price } from "@/lib/format";

const W = 860, H = 310, TOP = 18, BOTTOM = 54, LEFT = 12, RIGHT = 86;

export default function CandleChart({ candles, loading, error }: {candles:Candle[];loading:boolean;error:string|null}) {
  const [active, setActive] = useState<number | null>(null);
  const data = useMemo(() => candles.filter((c) => c.low > 0 && c.high >= c.low && c.open > 0 && c.close > 0).slice(-90), [candles]);
  const min = Math.min(...data.map((c) => c.low));
  const max = Math.max(...data.map((c) => c.high));
  const spread = Math.max(max - min, Math.abs(max) * 0.004);
  const floor = min - spread * 0.08, ceiling = max + spread * 0.08;
  const chartBottom = H - BOTTOM;
  const px = (i: number) => LEFT + (i + 0.5) * (W - LEFT - RIGHT) / data.length;
  const py = (v: number) => TOP + (ceiling - v) / (ceiling - floor) * (chartBottom - TOP);
  const bar = Math.max(2.2, Math.min(10, ((W - LEFT - RIGHT) / data.length) * 0.62));
  const show = active !== null && data[active] ? data[active] : data[data.length - 1];
  if (loading && !data.length) return <div className="chartEmpty"><span className="spinner"/> Loading historical candles…</div>;
  if (!data.length) return <div className="chartEmpty"><div className="emptyGlyph">◫</div><strong>Chart data unavailable</strong><span>{error || "No historical candles were returned for this pool."}</span><small>GeckoTerminal free chart API · No simulated candles displayed</small></div>;
  const volumes = data.map((c) => c.volume);
  const maxV = Math.max(1, ...volumes);
  const tickIndices = [0,.25,.5,.75,1].map((f) => Math.min(data.length - 1, Math.floor((data.length - 1) * f)));
  return <div className="candleChart">
    <div className="chartOHLC">
      <span>{show ? new Date(show.time * 1000).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}</span>
      <span>O <b>{price(show?.open)}</b></span><span>H <b>{price(show?.high)}</b></span><span>L <b>{price(show?.low)}</b></span><span>C <b className={show && show.close >= show.open ? "positive":"negative"}>{price(show?.close)}</b></span>
      <span>Vol <b>{compact(show?.volume)}</b></span>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Historical price candlestick chart based on GeckoTerminal OHLCV data">
      {Array.from({length:5},(_,i)=>{const yy=TOP+i*(chartBottom-TOP)/4; const val=ceiling-(ceiling-floor)*i/4;return <g key={i}><line x1={LEFT} y1={yy} x2={W-RIGHT+12} y2={yy} stroke="#202d3b" strokeDasharray="3 6"/><text x={W-RIGHT+18} y={yy+3.5} fill="#64748b" fontSize="11">{price(val)}</text></g>;})}
      {data.map((d,i)=> {const x=px(i), up=d.close >= d.open, col=up?"#29d9a1":"#fa647c"; const y1=py(d.open),y2=py(d.close);return <g key={`${d.time}-${i}`}><line x1={x} y1={py(d.high)} x2={x} y2={py(d.low)} stroke={col} strokeWidth="1.4"/><rect x={x-bar/2} y={Math.min(y1,y2)} width={bar} height={Math.max(1.5,Math.abs(y2-y1))} fill={col} rx="0.5"/><rect x={x-bar/2} y={H-31-(d.volume/maxV)*33} width={bar} height={(d.volume/maxV)*33} fill={up?"#29d9a166":"#fa647c66"} /></g>;})}
      {tickIndices.map((index,i)=><text key={i} x={px(index)} y={H-7} textAnchor="middle" fill="#6c7c92" fontSize="11">{new Date(data[index].time*1000).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit"})}</text>)}
      {active!==null && data[active] && <g><line x1={px(active)} x2={px(active)} y1={TOP} y2={H-31} stroke="#94a3b8" strokeDasharray="3 5" opacity=".65"/><line x1={LEFT} x2={W-RIGHT+10} y1={py(data[active].close)} y2={py(data[active].close)} stroke="#94a3b8" strokeDasharray="3 5" opacity=".65"/></g>}
      <rect x={LEFT} y={TOP} width={W-LEFT-RIGHT} height={chartBottom-TOP} fill="transparent" onMouseMove={(e)=>{const rect=e.currentTarget.getBoundingClientRect(); const relative=(e.clientX-rect.left)/rect.width;setActive(Math.min(data.length-1,Math.max(0,Math.floor(relative*data.length))));}} onMouseLeave={()=>setActive(null)}/>
    </svg>
  </div>;
}
