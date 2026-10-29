export function compact(value: number | null | undefined, dollar = true): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const n = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const pref = dollar ? "$" : "";
  if (n >= 1e9) return `${sign}${pref}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sign}${pref}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${sign}${pref}${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  return `${sign}${pref}${n.toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 3 : 2 })}`;
}
export function price(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value < 0.000001) return `$${value.toExponential(3)}`;
  if (value < 0.01) return `$${value.toPrecision(4)}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 5 : 2 })}`;
}
export function pct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}
export function age(timestamp: number | null): string {
  if (!timestamp) return "—";
  const delta = Math.max(0, Date.now() - timestamp);
  if (delta < 3600000) return `${Math.floor(delta / 60000)}m`;
  if (delta < 86400000) return `${Math.floor(delta / 3600000)}h`;
  return `${Math.floor(delta / 86400000)}d`;
}
export const tokenKey = (chain: string, address: string) => `${chain}:${address}`.toLowerCase();
