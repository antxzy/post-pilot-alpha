import { NextRequest, NextResponse } from "next/server";
import { asChain, quotePairs } from "@/lib/providers";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const chain = asChain(query.get("chain"));
  const addresses = (query.get("addresses") || "").split(",").map((v) => v.trim()).filter((v) => /^[a-zA-Z0-9]{10,100}$/.test(v)).slice(0, 25);
  if (!chain || !addresses.length) return NextResponse.json({error:"Invalid quote request"}, {status:400});
  try {
    const tokens = await quotePairs(chain, addresses);
    return NextResponse.json({tokens, updatedAt:Date.now()}, {headers:{"Cache-Control":"public, s-maxage=30, stale-while-revalidate=30"}});
  } catch (e) { return NextResponse.json({error:e instanceof Error ? e.message : "Quote service unavailable"}, {status:502}); }
}
