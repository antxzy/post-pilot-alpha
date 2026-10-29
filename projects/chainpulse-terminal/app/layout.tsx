import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChainPulse — On-chain market terminal",
  description: "An independent market intelligence terminal with live on-chain pool data, charts, watchlists, and paper trading.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
