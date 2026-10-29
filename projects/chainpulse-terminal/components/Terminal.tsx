"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownLeft, ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, BarChart3, Bell, Check, ChevronDown, CircleAlert, Clock3, Copy, ExternalLink, Filter, Flame, Gauge, LayoutGrid, ListFilter, Menu, Plus, RefreshCcw, Search, ShieldAlert, SlidersHorizontal, Sparkles, Star, TrendingUp, Wallet, X, Zap } from "lucide-react";
import CandleChart from "@/components/CandleChart";
import { useLocal } from "@/lib/useLocal";
import { accountEquity, emptyAccount, executePaperTrade, STARTING_CASH } from "@/lib/paper";
import { age, compact, pct, price } from "@/lib/format";
import { CHAINS, CHAIN_LABEL, type Candle, type ChainFilter, type MarketMode, type PaperAccount, type PriceAlert, type Token } from "@/lib/types";

type Section = "discover" | "watchlist" | "portfolio";
type SortKey = "volume24h" | "liquidity" | "marketCap" | "change24h" | "createdAt" | "buys24h";
type MarketResponse = { tokens: Token[]; refreshedAt: number; warnings?: string[]; error?: string };
const TF = ["5m", "15m", "1h", "4h", "1d"] as const;
const MODES: {value:MarketMode;label:string}[] = [ {value:"trending",label:"Trending pools"},{value:"new",label:"New pairs"},{value:"boosted",label:"Boosted"} ];
const chainMark: Record<string,string> = {solana:"◎",base:"▣",ethereum:"Ξ",bsc:"◆"};
function changeClass(n: number | null) {return n === null ? "muted" : n >= 0 ? "positive" : "negative";}
function Logo({ token, size = 34 }: {token: Token;size?:number}) { const [failed,setFailed] = useState(false);return <div className="tokenIcon" style={{height:size,width:size}}>{token.image&&!failed?<img src={token.image} alt="" onError={()=>setFailed(true)}/>:<span>{token.symbol.slice(0,2).toUpperCase()}</span>}</div>;}
function copyAddress(s: string, showToast: (text: string)=>void) { navigator.clipboard?.writeText(s).then(()=>showToast("Contract address copied")).catch(()=>showToast("Copy failed. Select address manually.")); }
function shortening(s:string){return s.length>16?s.slice(0,7)+"…"+s.slice(-5):s;}

export default function Terminal() {
  const [section,setSection] = useState<Section>("discover");
  const [mode,setMode] = useState<MarketMode>("trending");
  const [chain,setChain] = useState<ChainFilter>("solana");
  const [query,setQuery] = useState("");
  const [searchInput,setSearchInput] = useState("");
  const [tokens,setTokens] = useState<Token[]>([]);
  const [selected,setSelected] = useState<Token|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [warnings,setWarnings] = useState<string[]>([]);
  const [updatedAt,setUpdatedAt] = useState(0);
  const [refresh,setRefresh] = useState(0);
  const [sortBy,setSortBy] = useState<SortKey>("volume24h");
  const [minLiquidity,setMinLiquidity] = useState("0");
  const [minVolume,setMinVolume] = useState("0");
  const [showFilters,setShowFilters] = useState(false);
  const [onlyGainers,setOnlyGainers] = useState(false);
  const [tf,setTf] = useState<typeof TF[number]>("15m");
  const [candles,setCandles] = useState<Candle[]>([]);
  const [chartLoading,setChartLoading] = useState(false);
  const [chartError,setChartError] = useState<string|null>(null);
  const [watchlist,setWatchlist] = useLocal<string[]>("chainpulse:watchlist",()=>[]);
  const [account,setAccount] = useLocal<PaperAccount>("chainpulse:paper",emptyAccount);
  const [alerts,setAlerts] = useLocal<PriceAlert[]>("chainpulse:alerts",()=>[]);
  const [livePrices,setLivePrices] = useState<Record<string,number>>({});
  const [buySell,setBuySell] = useState<"buy"|"sell">("buy");
  const [amount,setAmount] = useState("100");
  const [toast,setToast] = useState("");
  const [showAlerts,setShowAlerts] = useState(false);
  const [alertPrice,setAlertPrice] = useState("");
  const [alertDirection,setAlertDirection] = useState<"above"|"below">("above");
  const [mobileNav,setMobileNav] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const notify = useCallback((msg:string)=>{setToast(msg); if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(""),4300);},[]);

  // Search is debounced so typing does not exhaust the free API rate limits.
  useEffect(()=>{const h=setTimeout(()=>setQuery(searchInput.trim()),450);return ()=>clearTimeout(h);},[searchInput]);

  useEffect(()=>{
    const controller=new AbortController();let active=true;
    async function load(){
      setLoading(true);setError("");
      if(searchInput.trim() && query!==searchInput.trim()) return;
      try {
        const chosen = query.length>=2 ? "search" : mode;
        const url=`/api/market?mode=${chosen}&chain=${chain}${chosen==="search"?`&q=${encodeURIComponent(query)}`:""}`;
        const response=await fetch(url,{signal:controller.signal,cache:"no-store"});
        const json: MarketResponse=await response.json();
        if(!response.ok)throw new Error(json.error||`HTTP ${response.status}`);
        if(!active)return;
        setTokens(json.tokens||[]);setWarnings(json.warnings||[]);setUpdatedAt(json.refreshedAt||Date.now());
        setSelected((prior)=>prior ? (json.tokens||[]).find((t)=>t.id===prior.id) || prior : json.tokens?.[0]||null);
      }catch(e){if(active&&!controller.signal.aborted){setError(e instanceof Error?e.message:"Unable to fetch token data");setTokens([]);}}
      finally {if(active)setLoading(false);}
    }
    void load();const interval=setInterval(load,60000);
    return ()=>{active=false;controller.abort();clearInterval(interval);};
  },[mode,chain,query,refresh]);

  useEffect(()=>{
    if(!selected){setCandles([]);return;}
    const controller=new AbortController();let active=true;
    setCandles([]);setChartError(null);setChartLoading(true);
    const url=`/api/candles?chain=${selected.chain}&pool=${encodeURIComponent(selected.pairAddress)}&tf=${tf}`;
    fetch(url,{signal:controller.signal}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Chart unavailable");return j;}).then(j=>{if(active)setCandles(j.candles||[]);}).catch(e=>{if(active&&!controller.signal.aborted)setChartError(e instanceof Error?e.message:"Chart unavailable");}).finally(()=>{if(active)setChartLoading(false);});
    return ()=>{active=false;controller.abort();};
  },[selected?.id,selected?.pairAddress,tf,refresh]);

  useEffect(()=>{
    const priceMap:Record<string,number>={};
    for(const t of tokens)priceMap[t.id]=t.priceUsd;
    if(selected)priceMap[selected.id]=selected.priceUsd;
    setLivePrices(p=>({...p,...priceMap}));
  },[tokens,selected]);

  useEffect(()=>{
    if(!account.positions.length)return;
    let active=true;
    async function update(){
      const chains=[...new Set(account.positions.map(p=>p.chain))];
      await Promise.all(chains.map(async(ch)=>{
        const addresses=account.positions.filter(p=>p.chain===ch).map(p=>p.tokenAddress).slice(0,25);
        try{const res=await fetch(`/api/quotes?chain=${ch}&addresses=${encodeURIComponent(addresses.join(","))}`);if(!res.ok)return;const json=await res.json();if(active)setLivePrices(p=>({...p,...Object.fromEntries((json.tokens||[]).map((t:Token)=>[t.id,t.priceUsd]))}));}catch{/* Keep last known prices, never invent quotes */}
      }));
    }
    void update();const interval=setInterval(update,60000);return()=>{active=false;clearInterval(interval);};
  },[account.positions]);

  useEffect(()=>{
    if(!alerts.length)return;
    const tripped=alerts.filter(a=>!a.triggered&&livePrices[a.tokenId]>0&&(a.direction==="above"?livePrices[a.tokenId]>=a.target:livePrices[a.tokenId]<=a.target));
    if(tripped.length){setAlerts(a=>a.map(x=>tripped.some(t=>t.id===x.id)?{...x,triggered:true}:x));notify(`${tripped[0].symbol} paper price alert triggered`);}
  },[livePrices,alerts,setAlerts,notify]);

  const activeList=useMemo(()=>{
    const source=section==="watchlist"?tokens.filter(t=>watchlist.includes(t.id)):tokens;
    return source.filter(t=>t.liquidity>=Number(minLiquidity)&&t.volume24h>=Number(minVolume)&&(!onlyGainers||((t.change24h||0)>0))).sort((a,b)=>Number(b[sortBy]||0)-Number(a[sortBy]||0));
  },[tokens,watchlist,section,sortBy,minLiquidity,minVolume,onlyGainers]);
  const totalVolume=tokens.reduce((v,t)=>v+t.volume24h,0);
  const totalLiquidity=tokens.reduce((v,t)=>v+t.liquidity,0);
  const movers=tokens.filter(t=>(t.change24h||0)>0).length;
  const position=account.positions.find(p=>p.tokenId===selected?.id);
  const equity=accountEquity(account,livePrices);
  const isWatched=selected?watchlist.includes(selected.id):false;
  const toggleWatch=(token:Token)=>setWatchlist(current=>current.includes(token.id)?current.filter(id=>id!==token.id):[...current,token.id]);
  const runPaperTrade=()=>{
    if(!selected)return;
    try{const next=executePaperTrade(account,selected,buySell,Number(amount));setAccount(next);notify(`Paper ${buySell} recorded: ${selected.symbol}`);}catch(e){notify(e instanceof Error?e.message:"Invalid paper trade");}
  };
  const addAlert=()=>{
    const target=Number(alertPrice);
    if(!selected||!Number.isFinite(target)||target<=0){notify("Enter a valid target price");return;}
    setAlerts(xs=>[{id:crypto.randomUUID(),tokenId:selected.id,symbol:selected.symbol,direction:alertDirection,target,triggered:false},...xs]);setAlertPrice("");notify("Price alert saved in this browser");
  };
  const NAV=[{id:"discover",name:"Discover",icon:LayoutGrid},{id:"watchlist",name:"Watchlist",icon:Star},{id:"portfolio",name:"Paper portfolio",icon:Wallet}] as const;

  return <div className="terminal">
    <aside className={`sidebar ${mobileNav?"sidebarOpen":""}`}>
      <div className="brand"><div className="brandIcon"><Activity size={23} strokeWidth={3}/></div><div className="brandText">CHAIN<span>PULSE</span><small>ON-CHAIN INTELLIGENCE</small></div></div>
      <div className="sideSection">WORKSPACE</div>
      <nav className="sideNav">{NAV.map(({id,name,icon:Icon})=><button key={id} className={`sideLink ${section===id?"sideLinkActive":""}`} onClick={()=>{setSection(id);setMobileNav(false);}}><Icon size={17}/>{name}{id==="watchlist"&&watchlist.length>0?<em>{watchlist.length}</em>:null}</button>)}</nav>
      <div className="sideSection sideSectionMargin">MARKET SCANNERS</div>
      <nav className="sideNav">{MODES.map(item=><button key={item.value} className={`sideLink ${section==="discover"&&mode===item.value?"sideLinkActive":""}`} onClick={()=>{setSection("discover");setMode(item.value);setSearchInput("");setQuery("");setMobileNav(false);}}>{item.value==="trending"?<TrendingUp size={17}/>:item.value==="new"?<Zap size={17}/>:<Flame size={17}/>} {item.label}</button>)}</nav>
      <div className="sidebarBottom"><div className="sideInsight"><Sparkles size={16}/><b>Build your edge.</b><p>Live discovery, precision filters, and risk-free trade practice in one place.</p></div><div className="sideFoot"><span className="liveDot"/> SYSTEM OPERATIONAL <small>v1.0 BETA</small></div></div>
    </aside>
    {mobileNav&&<button className="sidebarScrim" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}

    <div className="workspace">
      <header className="topbar"><button className="mobileMenu" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">TERMINAL <span>/</span> <strong>{section==="discover"?"MARKET DISCOVERY":section==="watchlist"?"WATCHLIST":"PAPER PORTFOLIO"}</strong></div>
        <div className="topRight"><span className="marketStatus"><span className="liveDot"/> LIVE MARKET DATA</span><button className="topIcon" title="Price alerts" onClick={()=>setShowAlerts(!showAlerts)}><Bell size={17}/>{alerts.some(a=>!a.triggered)&&<span className="alertBadge"/>}</button><div className="paperBadge"><Wallet size={15}/> PAPER MODE <span>{compact(equity)}</span></div></div>
      </header>

      <main className="mainContent">
        <div className="pageHeading"><div className="eyebrow"><span className="crosshair">✧</span> MARKET INTELLIGENCE <span className="eyebrowLine"/></div><div className="headingRow"><div><h1>{section==="portfolio"?"Your paper portfolio":section==="watchlist"?"Your watchlist":"Find your next edge"}<span className="headingPeriod">.</span></h1><p>{section==="portfolio"?"Practice your strategy with live reference quotes and zero real-money risk.":section==="watchlist"?"Stay close to the tokens worth watching.":"Discover on-chain momentum before the crowd. Real markets. Clear signals."}</p></div><div className="updatedBox"><Clock3 size={15}/><span>LAST SYNC <b>{updatedAt?new Date(updatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):"—"}</b></span><button className="refreshBtn" disabled={loading} onClick={()=>setRefresh(i=>i+1)} title="Refresh data"><RefreshCcw size={16} className={loading?"spinning":""}/></button></div></div></div>

        {section==="portfolio"?<section className="portfolioView">
          <div className="statsGrid portfolioStats"><StatCard icon={<Wallet size={18}/>} title="Total equity" value={compact(equity)} subtitle="Cash + marked positions" accent/><StatCard icon={<ArrowDownLeft size={18}/>} title="Available cash" value={compact(account.cash)} subtitle="Virtual USD balance"/><StatCard icon={<BarChart3 size={18}/>} title="All-time P&L" value={compact(equity-STARTING_CASH)} subtitle={`${pct((equity/STARTING_CASH-1)*100)} since reset`} positive={equity>=STARTING_CASH}/><StatCard icon={<ArrowLeftRight size={18}/>} title="Trades completed" value={String(account.trades.length)} subtitle="Simulated executions"/></div>
          <div className="portfolioColumns"><div className="surface"><div className="surfaceTitle"><h2>Open positions</h2><span>{account.positions.length} assets</span></div><div className="positionsTable"><div className="tableHeader posHeader"><span>ASSET</span><span>QUANTITY</span><span>AVG ENTRY</span><span>MARK PRICE</span><span>UNREALIZED P&L</span></div>{account.positions.map(p=>{const now=livePrices[p.tokenId]||p.lastPrice;const pnl=p.quantity*(now-p.averageCost);return <div className="positionRow" key={p.tokenId}><div><b>{p.symbol}</b><small>{CHAIN_LABEL[p.chain]}</small></div><span>{compact(p.quantity,false)}</span><span>{price(p.averageCost)}</span><span>{price(now)}</span><span className={changeClass(pnl)}>{compact(pnl)}</span></div>})}{!account.positions.length&&<div className="blankState"><Wallet size={30}/><h3>No positions yet</h3><p>Select a token in Discover and use the paper trading panel.</p><button className="actionButton" onClick={()=>setSection("discover")}>Discover tokens <ArrowRight size={15}/></button></div>}</div></div>
          <div className="surface"><div className="surfaceTitle"><h2>Trade history</h2><button className="subtleButton" onClick={()=>{if(confirm("Reset your paper account, positions and trade history?")){setAccount(emptyAccount());notify("Paper account reset");}}}>Reset account</button></div><div className="tradeHistory">{account.trades.slice(0,14).map(t=><div className="historyRow" key={t.id}><span className={t.side==="buy"?"historyIconBuy":"historyIconSell"}>{t.side==="buy"?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span><div><b>{t.side.toUpperCase()} {t.symbol}</b><small>{new Date(t.time).toLocaleString()}</small></div><strong>{compact(t.amountUsd)}</strong></div>)}{!account.trades.length&&<div className="blankState compactBlank">Your trades will appear here.</div>}</div></div></div>
          <div className="riskNote"><CircleAlert size={16}/> P&L is an estimate based on available public quotes. Simulation includes 0.5% assumed slippage and 0.5% fee per trade. No blockchain trades occur.</div>
        </section>:<>
          <div className="statsGrid"><StatCard icon={<Gauge size={18}/>} title="Tracked pools" value={loading&&!tokens.length?"—":String(tokens.length)} subtitle="In the current scanner" accent/><StatCard icon={<BarChart3 size={18}/>} title="24h combined volume" value={compact(totalVolume)} subtitle="Visible unique tokens"/><StatCard icon={<Activity size={18}/>} title="Available liquidity" value={compact(totalLiquidity)} subtitle="Combined pool liquidity"/><StatCard icon={<TrendingUp size={18}/>} title="Positive 24h movers" value={tokens.length?`${Math.round(movers/tokens.length*100)}%`:"—"} subtitle={`${movers} of ${tokens.length} tokens`} positive/></div>
          <div className="scannerControls"><div className="modeTabs">{MODES.map(m=><button key={m.value} className={mode===m.value?"active":undefined} onClick={()=>{setMode(m.value);setSearchInput("");setQuery("");}}>{m.value==="trending"?<TrendingUp size={15}/>:m.value==="new"?<Zap size={15}/>:<Flame size={15}/>} {m.label}</button>)}</div><div className="controlRight"><div className="chainSelect"><span className="chainSquare">{chain==="all"?"✦":chainMark[chain]}</span><select aria-label="Select chain" value={chain} onChange={e=>setChain(e.target.value as ChainFilter)}><option value="all">All chains</option>{CHAINS.map(ch=><option key={ch} value={ch}>{CHAIN_LABEL[ch]}</option>)}</select><ChevronDown size={13}/></div><button className={`filterButton ${showFilters?"filterActive":""}`} onClick={()=>setShowFilters(!showFilters)}><SlidersHorizontal size={16}/> Filters</button></div></div>
          {showFilters&&<div className="filtersPanel"><label>Min liquidity <select value={minLiquidity} onChange={e=>setMinLiquidity(e.target.value)}><option value="0">Any</option><option value="10000">$10K+</option><option value="50000">$50K+</option><option value="100000">$100K+</option><option value="500000">$500K+</option></select></label><label>Min 24h volume <select value={minVolume} onChange={e=>setMinVolume(e.target.value)}><option value="0">Any</option><option value="10000">$10K+</option><option value="100000">$100K+</option><option value="1000000">$1M+</option></select></label><label className="toggleLabel"><input type="checkbox" checked={onlyGainers} onChange={e=>setOnlyGainers(e.target.checked)}/> Only 24h gainers</label><button className="subtleButton" onClick={()=>{setMinLiquidity("0");setMinVolume("0");setOnlyGainers(false);}}>Reset filters</button></div>}
          <div className="marketArea"><section className="surface marketSurface"><div className="surfaceTitle marketTitle"><div><h2>{section==="watchlist"?"Saved watchlist":query?`Search: ${query}`:mode==="new"?"Fresh liquidity pools":mode==="boosted"?"Promoted tokens":"Trending right now"}</h2><span>{section==="watchlist"?"Showing saved tokens that are present in the current feed":mode==="boosted"?"Paid boost placements · not an endorsement":mode==="new"?"Recently created pools":"Ranked by GeckoTerminal market activity"}</span></div><div className="marketTools"><div className="searchBox"><Search size={16}/><input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Search token or contract..." aria-label="Search tokens"/>{searchInput&&<button onClick={()=>setSearchInput("")} aria-label="Clear search"><X size={14}/></button>}</div></div></div>
          <div className="tableScroll"><div className="marketTable"><div className="tableHeader marketHeader"><span>ASSET</span><span>PRICE</span><span>5M</span><span>1H</span><span><button onClick={()=>setSortBy("change24h")}>24H ↕</button></span><span><button onClick={()=>setSortBy("volume24h")}>VOLUME ↕</button></span><span><button onClick={()=>setSortBy("liquidity")}>LIQUIDITY ↕</button></span><span><button onClick={()=>setSortBy("marketCap")}>MCAP ↕</button></span><span>AGE</span><span>★</span></div>
          {activeList.map(t=><div className={`marketRow ${selected?.id===t.id?"rowActive":""}`} role="button" tabIndex={0} key={t.id} onClick={()=>setSelected(t)} onKeyDown={e=>{if(e.key==="Enter")setSelected(t);}}><div className="assetCell"><Logo token={t}/><div className="assetName"><b>{t.symbol}</b><small>{t.name}</small></div><span className="chainTag">{chainMark[t.chain]}</span></div><span className="mono priceValue">{price(t.priceUsd)}</span><span className={changeClass(t.change5m)}>{pct(t.change5m)}</span><span className={changeClass(t.change1h)}>{pct(t.change1h)}</span><span className={changeClass(t.change24h)}>{pct(t.change24h)}</span><span className="mono">{compact(t.volume24h)}</span><span className="mono">{compact(t.liquidity)}</span><span className="mono">{compact(t.marketCap)}</span><span className="mono ageCell">{age(t.createdAt)}</span><button className={`starBtn ${watchlist.includes(t.id)?"starOn":""}`} title={watchlist.includes(t.id)?"Remove from watchlist":"Add to watchlist"} onClick={e=>{e.stopPropagation();toggleWatch(t);}}><Star size={17} fill={watchlist.includes(t.id)?"currentColor":"none"}/></button></div>)}
          {loading&&!tokens.length&&<div className="blankState tableBlank"><span className="spinner"/><h3>Scanning liquidity pools</h3><p>Connecting to public on-chain market feeds…</p></div>}
          {!loading&&error&&<div className="blankState tableBlank"><CircleAlert size={28}/><h3>Market feed unavailable</h3><p>{error}</p><button className="actionButton" onClick={()=>setRefresh(i=>i+1)}>Retry fetch <RefreshCcw size={14}/></button></div>}
          {!loading&&!error&&!activeList.length&&<div className="blankState tableBlank"><Filter size={26}/><h3>No tokens matched</h3><p>{section==="watchlist"?"Star tokens in Discover. Your starred tokens appear here when they are in the current feed.":"Try another chain, query or filter combination."}</p></div>}
          </div></div><footer className="tableFooter"><div><span className="liveDot"/> {loading?"FETCHING":error?"DATA UNAVAILABLE":"LIVE DATA"} <span className="footDivider">·</span> {activeList.length} RESULTS</div><span>Source: {query?"DEX Screener":mode==="boosted"?"DEX Screener":"GeckoTerminal"} · Refreshes every 60s</span></footer></section>
          <aside className="detailPanel"><div className="detailHeader"><span>MARKET OVERVIEW</span><span className="detailLive"><span className="liveDot"/> LIVE</span></div>{selected?<><div className="detailAsset"><Logo token={selected} size={46}/><div><h3>{selected.symbol}<span> / USD</span></h3><p>{selected.name}</p></div><button className={`starBtn detailStar ${isWatched?"starOn":""}`} onClick={()=>toggleWatch(selected)} aria-label="Toggle watchlist"><Star size={19} fill={isWatched?"currentColor":"none"}/></button></div><div className="detailPrice"><strong>{price(selected.priceUsd)}</strong><span className={`priceChange ${changeClass(selected.change24h)}`}>{selected.change24h!=null&&(selected.change24h>=0?<ArrowUpRight size={15}/>:<ArrowDownRight size={15}/>)}{pct(selected.change24h)} <small>24H</small></span></div><div className="detailMetrics"><div><span>Market cap / FDV</span><b>{compact(selected.marketCap)}</b></div><div><span>Liquidity</span><b>{compact(selected.liquidity)}</b></div><div><span>24h volume</span><b>{compact(selected.volume24h)}</b></div><div><span>24h buys / sells</span><b><span className="positive">{compact(selected.buys24h,false)}</span> / <span className="negative">{compact(selected.sells24h,false)}</span></b></div></div><div className="addressPill"><span>{shortening(selected.tokenAddress)}</span><button title="Copy token contract" onClick={()=>copyAddress(selected.tokenAddress,notify)}><Copy size={15}/></button><a target="_blank" rel="noreferrer" href={selected.url} title="Open on market data provider"><ExternalLink size={14}/></a></div><div className="detailSplit"><span>TRADE SIMULATOR</span><span className="simTag">● PAPER ONLY</span></div><div className="tradeTabs"><button className={buySell==="buy"?"buySelected":""} onClick={()=>{setBuySell("buy");setAmount("100");}}>Buy</button><button className={buySell==="sell"?"sellSelected":""} onClick={()=>{setBuySell("sell");setAmount(position?.quantity.toString()||"0");}}>Sell</button></div><label className="tradeLabel">{buySell==="buy"?"Amount (USD)":"Quantity (tokens)"}<span>{buySell==="buy"?`Available ${compact(account.cash)}`:`Held ${compact(position?.quantity||0,false)}`}</span></label><div className="amountInput"><input type="number" min="0" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/><span>{buySell==="buy"?"USD":selected.symbol}</span></div><div className="quickAmounts">{(buySell==="buy"?[25,100,250,500]:[.25,.5,.75,1]).map(n=><button key={n} onClick={()=>setAmount(buySell==="buy"?String(n):String((position?.quantity||0)*n))}>{buySell==="buy"?`$${n}`:`${n*100}%`}</button>)}</div><div className="tradeEstimate"><span>Simulation fee</span><span>0.5%</span><span>Assumed slippage</span><span>0.5%</span></div><button className={`tradeAction ${buySell==="sell"?"sellAction":""}`} onClick={runPaperTrade}>{buySell==="buy"?"Paper buy":"Paper sell"} {selected.symbol} <ArrowRight size={17}/></button><p className="tradeDisclaimer"><ShieldAlert size={14}/> Simulated orders only. No wallet connection, funds, or on-chain execution.</p><div className="alertCreator"><div className="alertTitle"><Bell size={15}/> Price alert</div><div className="alertRow"><select value={alertDirection} aria-label="Alert direction" onChange={e=>setAlertDirection(e.target.value as "above"|"below")}><option value="above">Above</option><option value="below">Below</option></select><input type="number" min="0" step="any" placeholder="Target $" aria-label="Alert target price" value={alertPrice} onChange={e=>setAlertPrice(e.target.value)}/><button onClick={addAlert} aria-label="Add price alert"><Plus size={17}/></button></div></div></>:<div className="blankState"><Activity size={25}/><p>Select a token to view its details.</p></div>}</aside></div>
          <section className="surface chartSection"><div className="surfaceTitle chartTitle"><div><h2><Activity size={17}/> {selected?`${selected.symbol} / USD`:"Price action"}</h2><span>{selected?`Pool ${shortening(selected.pairAddress)} · ${selected.dex}`:"Select a token to view historical price action"}</span></div><div className="timeframes">{TF.map(interval=><button key={interval} className={tf===interval?"tfActive":""} onClick={()=>setTf(interval)}>{interval}</button>)}</div></div><CandleChart candles={candles} loading={chartLoading} error={chartError}/><div className="chartFooter"><span><span className="liveDot"/> GeckoTerminal historical OHLCV</span><a href="https://www.geckoterminal.com/" target="_blank" rel="noreferrer">Powered by GeckoTerminal <ExternalLink size={12}/></a></div></section>
          {!!warnings.length&&<div className="riskNote"><CircleAlert size={16}/> Partial data: {warnings.join(" · ")}</div>}
        </>}
        <footer className="siteFooter"><span>© 2026 CHAINPULSE LABS <span className="footDivider">/</span> Independent research prototype, not affiliated with GMGN.AI</span><span>MARKET DATA IS NOT INVESTMENT ADVICE <span className="footDivider">·</span> ALWAYS VERIFY CONTRACTS</span></footer>
      </main>
    </div>
    {showAlerts&&<div className="alertsOverlay"><div className="alertsDrawer"><div className="alertsHead"><h3>Price alerts</h3><button onClick={()=>setShowAlerts(false)}><X size={18}/></button></div><p>Alerts are checked when live quotes update while this tab is open. They are stored only in this browser.</p>{alerts.map(a=><div className="alertItem" key={a.id}><div><b>{a.symbol}</b><span>{a.direction} {price(a.target)}</span><small>{a.triggered?"Triggered":"Monitoring"}</small></div><button onClick={()=>setAlerts(xs=>xs.filter(x=>x.id!==a.id))}><X size={15}/></button></div>)}{!alerts.length&&<div className="blankState compactBlank">No alerts configured yet.</div>}</div><button className="overlayScrim" onClick={()=>setShowAlerts(false)} aria-label="Close alerts"/></div>}
    {toast&&<div role="status" className="toast"><Check size={15}/>{toast}<button onClick={()=>setToast("")}><X size={14}/></button></div>}
  </div>;
}
function StatCard({icon,title,value,subtitle,accent=false,positive=false}:{icon:React.ReactNode;title:string;value:string;subtitle:string;accent?:boolean;positive?:boolean}){return <div className={`statCard ${accent?"statAccent":""}`}><div className="statCardTop"><span>{title}</span><span className="statIcon">{icon}</span></div><strong className={positive?"positive":undefined}>{value}</strong><small>{subtitle}</small></div>}
