import { CHAINS, type Chain, type Token } from "@/lib/types";

const GECKO = "https://api.geckoterminal.com/api/v2";
const DEX = "https://api.dexscreener.com";
const geckoNetwork: Record<Chain, string> = { solana: "solana", ethereum: "eth", base: "base", bsc: "bsc" };
const dexChain: Record<Chain, string> = { solana: "solana", ethereum: "ethereum", base: "base", bsc: "bsc" };
export const asChain = (s: unknown): Chain | null => CHAINS.find((c) => c === s) ?? null;
const num = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const nullable = (value: unknown): number | null => value === null || value === undefined || value === "" ? null : num(value);
const obj = (value: unknown): Record<string, any> => value && typeof value === "object" ? value as Record<string, any> : {};

async function getJson(url: string, revalidate = 60): Promise<any> {
  const res = await fetch(url, {headers: {"Accept": "application/json;version=20230203", "User-Agent": "ChainPulseTerminal/1.0"}, next: { revalidate }, signal: AbortSignal.timeout(9500)});
  if (!res.ok) throw new Error(`Data provider returned HTTP ${res.status}`);
  return res.json();
}

function normalizeGecko(pool: any, included: Map<string, any>, chain: Chain): Token | null {
  const attrs = obj(pool?.attributes);
  const base = included.get(pool?.relationships?.base_token?.data?.id);
  const ba = obj(base?.attributes);
  const pairAddress = String(attrs.address || "");
  const tokenAddress = String(ba.address || pool?.relationships?.base_token?.data?.id?.replace(/^.*?_/, "") || "");
  const currentPrice = num(attrs.base_token_price_usd);
  if (!pairAddress || !tokenAddress || currentPrice <= 0) return null;
  const txns = obj(attrs.transactions?.h24);
  return {
    id: `${chain}:${tokenAddress}`.toLowerCase(), chain, pairAddress, tokenAddress,
    name: String(ba.name || attrs.name?.split(" / ")[0] || "Unknown token"),
    symbol: String(ba.symbol || attrs.name?.split(" /")[0] || "?"),
    dex: String(attrs.dex_id || "DEX"), image: typeof ba.image_url === "string" ? ba.image_url : null,
    priceUsd: currentPrice,
    change24h: nullable(attrs.price_change_percentage?.h24), change1h: nullable(attrs.price_change_percentage?.h1), change5m: nullable(attrs.price_change_percentage?.m5),
    volume24h: num(attrs.volume_usd?.h24), volume1h: num(attrs.volume_usd?.h1),
    liquidity: num(attrs.reserve_in_usd), marketCap: nullable(attrs.market_cap_usd) ?? nullable(attrs.fdv_usd),
    buys24h: num(txns.buys), sells24h: num(txns.sells),
    createdAt: attrs.pool_created_at ? new Date(attrs.pool_created_at).getTime() : null,
    url: `https://www.geckoterminal.com/${geckoNetwork[chain]}/pools/${encodeURIComponent(pairAddress)}`,
    source: "GeckoTerminal",
  };
}

function normalizeDex(pair: any): Token | null {
  const rawChain = String(pair?.chainId || "").toLowerCase();
  const chain = rawChain === "ethereum" ? "ethereum" : asChain(rawChain);
  if (!chain || !pair?.baseToken?.address || !pair?.pairAddress) return null;
  const p = num(pair.priceUsd);
  if (p <= 0) return null;
  return {
    id: `${chain}:${pair.baseToken.address}`.toLowerCase(), chain,
    tokenAddress: String(pair.baseToken.address), pairAddress: String(pair.pairAddress),
    name: String(pair.baseToken.name || "Unknown token"), symbol: String(pair.baseToken.symbol || "?"),
    dex: String(pair.dexId || "DEX"), image: pair.info?.imageUrl || null,
    priceUsd: p, change24h: nullable(pair.priceChange?.h24), change1h: nullable(pair.priceChange?.h1), change5m: nullable(pair.priceChange?.m5),
    volume24h: num(pair.volume?.h24), volume1h: num(pair.volume?.h1), liquidity: num(pair.liquidity?.usd),
    marketCap: nullable(pair.marketCap) ?? nullable(pair.fdv),
    buys24h: num(pair.txns?.h24?.buys), sells24h: num(pair.txns?.h24?.sells),
    createdAt: nullable(pair.pairCreatedAt), url: typeof pair.url === "string" ? pair.url : `https://dexscreener.com/${dexChain[chain]}/${pair.pairAddress}`,
    source: "DEX Screener",
  };
}

export function dedupe(tokens: Token[]): Token[] {
  const byId = new Map<string, Token>();
  for (const token of tokens) {
    const existing = byId.get(token.id);
    if (!existing || token.liquidity > existing.liquidity) byId.set(token.id, token);
  }
  return [...byId.values()];
}

export async function geckoPools(mode: "trending" | "new", chain: Chain): Promise<Token[]> {
  const endpoint = mode === "new" ? "new_pools" : "trending_pools";
  const result = await getJson(`${GECKO}/networks/${geckoNetwork[chain]}/${endpoint}?include=base_token&page=1`, 60);
  const included = new Map<string, any>((result.included || []).map((x: any) => [x.id, x]));
  return dedupe((result.data || []).map((p: any) => normalizeGecko(p, included, chain)).filter(Boolean));
}

export async function boostedPairs(chain: Chain): Promise<Token[]> {
  const boosts: any[] = await getJson(`${DEX}/token-boosts/top/v1`, 60);
  const addresses = [...new Set(boosts.filter((t) => t.chainId === dexChain[chain]).map((t) => t.tokenAddress))].slice(0, 28);
  if (!addresses.length) return [];
  const pairs = await getJson(`${DEX}/tokens/v1/${dexChain[chain]}/${addresses.map(encodeURIComponent).join(",")}`, 60);
  return dedupe((Array.isArray(pairs) ? pairs : []).map(normalizeDex).filter(Boolean));
}

export async function searchPairs(query: string, chain?: Chain): Promise<Token[]> {
  const result = await getJson(`${DEX}/latest/dex/search?q=${encodeURIComponent(query)}`, 30);
  return dedupe((result.pairs || []).map(normalizeDex).filter(Boolean)).filter((p) => !chain || p.chain === chain);
}

export async function quotePairs(chain: Chain, addresses: string[]): Promise<Token[]> {
  if (!addresses.length) return [];
  const result = await getJson(`${DEX}/tokens/v1/${dexChain[chain]}/${addresses.map(encodeURIComponent).join(",")}`, 30);
  return dedupe((Array.isArray(result) ? result : []).map(normalizeDex).filter(Boolean));
}

export async function poolCandles(chain: Chain, pool: string, tf: "5m" | "15m" | "1h" | "4h" | "1d") {
  const sizes: Record<typeof tf, [string, number]> = { "5m": ["minute", 5], "15m": ["minute", 15], "1h": ["hour", 1], "4h": ["hour", 4], "1d": ["day", 1] };
  const [frame, aggregate] = sizes[tf];
  const result = await getJson(`${GECKO}/networks/${geckoNetwork[chain]}/pools/${encodeURIComponent(pool)}/ohlcv/${frame}?aggregate=${aggregate}&limit=120&currency=usd&token=base`, 60);
  const list: any[] = result?.data?.attributes?.ohlcv_list || [];
  return list.map((r) => ({time: num(r[0]), open: num(r[1]), high: num(r[2]), low: num(r[3]), close: num(r[4]), volume: num(r[5])})).filter((r) => r.close > 0).sort((a,b) => a.time - b.time);
}
