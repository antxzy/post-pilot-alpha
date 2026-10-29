import type { PaperAccount, Token, Position, PaperTrade } from "@/lib/types";
export const STARTING_CASH = 10000;
export const TRADE_FEE_RATE = 0.005;
export const SLIPPAGE_RATE = 0.005;
export const emptyAccount = (): PaperAccount => ({ cash: STARTING_CASH, positions: [], trades: [] });

export function executePaperTrade(account: PaperAccount, token: Token, side: "buy" | "sell", input: number): PaperAccount {
  if (!Number.isFinite(input) || input <= 0 || token.priceUsd <= 0) throw new Error("Enter a valid trade amount.");
  const positions = account.positions.map((p) => ({ ...p }));
  const index = positions.findIndex((p) => p.tokenId === token.id);
  const current: Position = index >= 0 ? positions[index] : { tokenId: token.id, tokenAddress: token.tokenAddress, chain: token.chain, symbol: token.symbol, quantity: 0, averageCost: 0, lastPrice: token.priceUsd };
  let amountUsd = 0; let qty = 0; let feeUsd = 0; let cash = account.cash;
  // Simulated fee and slippage, never an actual blockchain trade.
  if (side === "buy") {
    amountUsd = input;
    feeUsd = amountUsd * TRADE_FEE_RATE;
    if (amountUsd + feeUsd > cash + 1e-8) throw new Error("Not enough paper cash (including fee).");
    qty = amountUsd / (token.priceUsd * (1 + SLIPPAGE_RATE));
    current.averageCost = (current.quantity * current.averageCost + amountUsd + feeUsd) / (current.quantity + qty);
    current.quantity += qty;
    cash -= amountUsd + feeUsd;
  } else {
    qty = input;
    if (qty > current.quantity + 1e-10) throw new Error("You do not own that many paper tokens.");
    amountUsd = qty * token.priceUsd * (1 - SLIPPAGE_RATE);
    feeUsd = amountUsd * TRADE_FEE_RATE;
    current.quantity = Math.max(0, current.quantity - qty);
    cash += amountUsd - feeUsd;
  }
  current.lastPrice = token.priceUsd;
  if (current.quantity <= 1e-12) {
    if (index >= 0) positions.splice(index, 1);
  } else if (index >= 0) positions[index] = current;
  else positions.push(current);
  const trade: PaperTrade = { id: crypto.randomUUID(), tokenId:token.id, symbol:token.symbol, side, quantity:qty, price:token.priceUsd, amountUsd, feeUsd, time:Date.now() };
  return { cash, positions, trades:[trade, ...account.trades].slice(0,300) };
}

export function accountEquity(account: PaperAccount, livePrices: Record<string, number> = {}): number {
  return account.cash + account.positions.reduce((sum, p) => sum + p.quantity * (livePrices[p.tokenId] || p.lastPrice), 0);
}
