import { NextRequest, NextResponse } from "next/server";
import { asChain, boostedPairs, geckoPools, searchPairs, dedupe } from "@/lib/providers";
import { CHAINS, type Token } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const mode = search.get("mode") || "trending";
  const chainParam = search.get("chain") || "solana";
  const chain = asChain(chainParam);
  const chains = chainParam === "all" ? CHAINS : chain ? [chain] : null;
  if (!chains || !["trending", "new", "boosted", "search"].includes(mode)) return NextResponse.json({error:"Invalid filters"}, {status:400});
  try {
    let tokens: Token[] = [];
    let warnings: string[] = [];
    if (mode === "search") {
      const query = String(search.get("q") || "").trim().slice(0, 100);
      if (query.length < 2) return NextResponse.json({tokens: [], refreshedAt:Date.now(), warnings: []});
      tokens = await searchPairs(query, chain || undefined);
      if (chainParam === "all") tokens = tokens.filter((t) => CHAINS.includes(t.chain));
    } else {
      const results = await Promise.allSettled(chains.map((ch) => mode === "boosted" ? boostedPairs(ch) : geckoPools(mode as "new" | "trending", ch)));
      results.forEach((r, index) => {
        if (r.status === "fulfilled") tokens.push(...r.value);
        else warnings.push(`${chains[index]}: ${r.reason instanceof Error ? r.reason.message : "Provider unavailable"}`);
      });
      tokens = dedupe(tokens);
      if (mode === "new") tokens.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      else if (mode === "boosted") tokens.sort((a, b) => b.volume24h - a.volume24h);
    }
    if (!tokens.length && warnings.length) return NextResponse.json({error:"Live data providers unavailable. Please try again shortly.", warnings}, {status:503});
    return NextResponse.json({tokens:tokens.slice(0,100),refreshedAt:Date.now(),warnings}, {headers:{"Cache-Control":"public, s-maxage=30, stale-while-revalidate=60"}});
  } catch (e) {
    return NextResponse.json({error:e instanceof Error ? e.message : "Unable to load market data"}, {status:502});
  }
}
