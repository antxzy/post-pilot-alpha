import { NextRequest, NextResponse } from "next/server";
import { asChain, poolCandles } from "@/lib/providers";
export const runtime = "nodejs";
const VALID = ["5m","15m","1h","4h","1d"] as const;
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const chain = asChain(q.get("chain"));
  const pool = q.get("pool") || "";
  const tf = q.get("tf") || "15m";
  if (!chain || !VALID.some((t) => t === tf) || !/^[a-zA-Z0-9]{10,100}$/.test(pool)) return NextResponse.json({error:"Invalid chart parameters"}, {status:400});
  try {
    const candles = await poolCandles(chain, pool, tf as typeof VALID[number]);
    return NextResponse.json({candles, updatedAt:Date.now()}, {headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=60"}});
  } catch (e) {
    return NextResponse.json({error:e instanceof Error ? e.message : "Chart data unavailable"}, {status:502});
  }
}
