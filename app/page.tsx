'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  ArrowDownUp,
  Bolt,
  ChartLine,
  Clock,
  Filter,
  Layers,
  LoaderCircle,
  Network,
  PieChart,
  Radar,
  Search,
  Settings,
  Table2,
  Zap,
} from 'lucide-react';
import { CryptoData, ExchangeMarketData } from './types/crypto';

type TerminalTab = 'arbitrage' | 'monitor' | 'trade';
type SortKey = 'apr' | 'fundingRate' | 'spread' | 'priceChange24h' | 'volume';

interface ArbitrageRow {
  id: string;
  pair: string;
  spotEx: string;
  perpEx: string;
  spread: number;
  fundingRate: number;
  countdown: string;
  apr: number;
  volume: number;
  price: number;
  priceChange24h: number;
  oiValue: number;
  flow: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('API Error:', res.status, errorText);
    throw new Error(`API 请求失败 (${res.status}): ${res.status === 429 ? '请求过于频繁，请稍后再试' : '网络错误'}`);
  }

  return res.json();
};

function mapCryptoToRows(data?: CryptoData[]): ArbitrageRow[] {
  if (!data?.length) {
    return [];
  }

  return data.flatMap((crypto) => {
    const pair = crypto.symbol.toUpperCase();
    const exchanges = crypto.exchanges ?? [];

    return exchanges.flatMap((perpMarket) => {
      if (perpMarket.fundingRate === null || perpMarket.perpPrice === null) {
        return [];
      }

      return exchanges
        .filter((spotMarket) => spotMarket.exchange !== perpMarket.exchange)
        .map((spotMarket) => createArbitrageRow(crypto.id, pair, spotMarket, perpMarket));
    });
  });
}

function createArbitrageRow(
  cryptoId: string,
  pair: string,
  spotMarket: ExchangeMarketData,
  perpMarket: ExchangeMarketData
): ArbitrageRow {
  const spread = ((perpMarket.perpPrice! - spotMarket.spotPrice) / spotMarket.spotPrice) * 100;
  const fundingRate = perpMarket.fundingRate!;
  const oiValue = perpMarket.openInterestValue ?? 0;

  return {
    id: `${cryptoId}-${spotMarket.exchange}-${perpMarket.exchange}`,
    pair,
    spotEx: spotMarket.exchange,
    perpEx: perpMarket.exchange,
    spread,
    fundingRate,
    countdown: formatFundingCountdown(perpMarket.nextFundingTime),
    apr: Math.abs(fundingRate * 3 * 365),
    volume: spotMarket.quoteVolume24h,
    price: spotMarket.spotPrice,
    priceChange24h: spotMarket.priceChange24h,
    oiValue,
    flow: oiValue * (perpMarket.priceChange24h / 100),
  };
}

function formatFundingCountdown(nextFundingTime: number | null) {
  if (!nextFundingTime) {
    return '--:--:--';
  }

  const seconds = Math.max(0, Math.floor((nextFundingTime - Date.now()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPrice(value: number) {
  if (value < 0.01) {
    return value.toPrecision(4);
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: value > 100 ? 2 : 4,
    maximumFractionDigits: value > 100 ? 2 : 4,
  });
}

function TopNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: TerminalTab;
  setActiveTab: (tab: TerminalTab) => void;
}) {
  const tabs = [
    { id: 'arbitrage' as const, name: '套利矩阵', icon: Bolt },
    { id: 'monitor' as const, name: '宏观监控', icon: Radar },
    { id: 'trade' as const, name: '交易执行', icon: Layers },
  ];

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#1f2937] bg-[#0b0e14]/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-4 lg:gap-8">
        <div className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-wider text-white sm:text-xl">
          <ChartLine className="h-5 w-5 text-[#3b82f6]" />
          ARB.TERMINAL
        </div>

        <div className="hidden h-16 md:flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex h-16 items-center gap-2 px-5 text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-[#6b7280] hover:text-[#d1d5db]'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#3b82f6]' : ''}`} />
                {tab.name}
                {active && <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm sm:gap-6">
        <div className="hidden items-center gap-2 text-[#6b7280] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
          API: <span className="font-mono text-[#10b981]">Connected</span>
        </div>
        <div className="hidden items-center gap-2 text-[#6b7280] lg:flex">
          <Network className="h-4 w-4" />
          <span className="font-mono">12ms</span>
        </div>
        <div className="hidden h-6 w-px bg-[#1f2937] sm:block" />
        <button className="text-[#6b7280] transition-colors hover:text-white" aria-label="设置">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}

function StatCards({ rows }: { rows: ArbitrageRow[] }) {
  const maxApr = Math.max(...rows.map((row) => row.apr));
  const avgFunding = rows.reduce((sum, row) => sum + row.fundingRate, 0) / rows.length;
  const activeOpportunities = rows.filter((row) => row.apr >= 20).length;
  const netFlow = rows.reduce((sum, row) => sum + row.flow, 0);

  const stats = [
    { label: '全网最高预估年化', value: `${maxApr.toFixed(2)}%`, tone: 'text-[#10b981] glow-text-green', suffix: '' },
    { label: '监控交易对数量', value: rows.length.toString(), tone: 'text-white', suffix: 'Pairs' },
    { label: '平均资金费率', value: `${avgFunding > 0 ? '+' : ''}${avgFunding.toFixed(4)}%`, tone: 'text-[#3b82f6]', suffix: 'Est.' },
    { label: '净资金流估算', value: `${netFlow >= 0 ? '+' : ''}${formatCompact(netFlow)}`, tone: netFlow >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]', suffix: '24H' },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      {stats.map((stat, index) => (
        <section key={stat.label} className="rounded-lg border border-[#1f2937] bg-[#111827] p-5">
          <div className="mb-2 text-xs uppercase tracking-wider text-[#6b7280]">{stat.label}</div>
          <div className={`font-mono text-3xl font-bold ${stat.tone}`}>
            {stat.value}
            {stat.suffix && <span className="ml-2 font-sans text-sm font-normal text-[#6b7280]">{stat.suffix}</span>}
          </div>
          {index === 3 && (
            <div className="mt-1 text-xs text-[#6b7280]">
              活跃机会 <span className="font-mono text-[#f59e0b]">{activeOpportunities}</span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function SortButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 transition-colors hover:text-white ${active ? 'text-[#3b82f6]' : ''}`}
    >
      {children}
      <ArrowDownUp className="h-3 w-3" />
    </button>
  );
}

function ArbitrageTable({ rows }: { rows: ArbitrageRow[] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('apr');

  const sortedRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...rows]
      .filter((row) => {
        if (!normalizedQuery) {
          return true;
        }

        return `${row.pair} ${row.spotEx} ${row.perpEx}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => Math.abs(b[sortKey]) - Math.abs(a[sortKey]));
  }, [query, rows, sortKey]);

  return (
    <section className="flex flex-grow flex-col overflow-hidden rounded-lg border border-[#1f2937] bg-[#111827]">
      <div className="flex flex-col gap-3 border-b border-[#1f2937] bg-[#0b0e14]/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Table2 className="h-5 w-5 text-[#6b7280]" />
          跨所费率监控矩阵
        </h2>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索币种..."
              className="w-48 rounded border border-[#1f2937] bg-[#0b0e14] py-1.5 pl-8 pr-3 font-mono text-sm text-white outline-none transition-colors placeholder:text-[#6b7280] focus:border-[#3b82f6]"
            />
          </div>
          <button className="inline-flex items-center gap-1 rounded bg-[#1f2937] px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-700">
            <Filter className="h-3.5 w-3.5" />
            筛选
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="border-b border-[#1f2937] bg-[#0b0e14]/80 text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
            <tr>
              <th className="px-5 py-4">标的</th>
              <th className="px-5 py-4">买入现货所</th>
              <th className="px-5 py-4">做空合约所</th>
              <th className="px-5 py-4 text-right">
                <SortButton active={sortKey === 'priceChange24h'} onClick={() => setSortKey('priceChange24h')}>24H 涨跌</SortButton>
              </th>
              <th className="px-5 py-4 text-right">
                <SortButton active={sortKey === 'spread'} onClick={() => setSortKey('spread')}>实时价差</SortButton>
              </th>
              <th className="px-5 py-4 text-right">
                <SortButton active={sortKey === 'fundingRate'} onClick={() => setSortKey('fundingRate')}>当前费率</SortButton>
              </th>
              <th className="px-5 py-4 text-right">结算倒计时</th>
              <th className="px-5 py-4 text-right">
                <SortButton active={sortKey === 'volume'} onClick={() => setSortKey('volume')}>24H 交易量</SortButton>
              </th>
              <th className="px-5 py-4 text-right">OI 估算</th>
              <th className="px-5 py-4 text-right text-[#3b82f6]">
                <SortButton active={sortKey === 'apr'} onClick={() => setSortKey('apr')}>预估年化</SortButton>
              </th>
              <th className="px-5 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2937] font-mono">
            {sortedRows.map((row) => {
              const fundingPositive = row.fundingRate > 0;
              const flowPositive = row.flow >= 0;

              return (
                <tr key={row.id} className="group cursor-pointer transition-colors hover:bg-[#1f2937]/30">
                  <td className="flex items-center gap-2 px-5 py-4 font-bold text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-800 font-sans text-xs">
                      {row.pair.charAt(0)}
                    </span>
                    <span>{row.pair}-USDT</span>
                    <span className="text-xs font-normal text-[#6b7280]">${formatPrice(row.price)}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-300">{row.spotEx}</td>
                  <td className="px-5 py-4 text-gray-300">{row.perpEx}</td>
                  <td className={`px-5 py-4 text-right ${row.priceChange24h >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {row.priceChange24h >= 0 ? '+' : ''}{row.priceChange24h.toFixed(2)}%
                  </td>
                  <td className={`px-5 py-4 text-right ${row.spread > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {row.spread > 0 ? '+' : ''}{row.spread.toFixed(3)}%
                  </td>
                  <td className={`px-5 py-4 text-right ${fundingPositive ? 'text-[#10b981] glow-text-green' : 'text-[#ef4444] glow-text-red'}`}>
                    {fundingPositive ? '+' : ''}{row.fundingRate.toFixed(4)}%
                  </td>
                  <td className="px-5 py-4 text-right text-[#6b7280]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {row.countdown}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-gray-400">{formatCompact(row.volume)}</td>
                  <td className="px-5 py-4 text-right text-gray-400">
                    {formatCompact(row.oiValue)}
                    <span className={`ml-2 text-xs ${flowPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {flowPositive ? '+' : ''}{formatCompact(row.flow)}
                    </span>
                  </td>
                  <td className={`px-5 py-4 text-right text-base font-bold ${row.apr > 50 ? 'text-[#f59e0b]' : 'text-white'}`}>
                    {row.apr.toFixed(2)}%
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button className="rounded bg-[#3b82f6] px-3 py-1 font-sans text-xs text-white opacity-100 transition-all hover:bg-blue-400 sm:opacity-0 sm:group-hover:opacity-100">
                      详情
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyModule({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof PieChart;
  title: string;
  body: string;
}) {
  return (
    <section className="flex min-h-[520px] flex-grow flex-col items-center justify-center rounded-lg border border-dashed border-[#1f2937] bg-[#111827]/50 text-[#6b7280]">
      <Icon className="mb-4 h-10 w-10 text-[#1f2937]" />
      <h2 className="mb-2 text-xl font-medium text-white">{title}</h2>
      <p>{body}</p>
    </section>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TerminalTab>('arbitrage');
  const { data, error, isLoading } = useSWR<CryptoData[]>('/api/crypto', fetcher, {
    refreshInterval: 5000,
    dedupingInterval: 1500,
  });

  const rows = useMemo(() => mapCryptoToRows(data), [data]);
  const hasRows = rows.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0e14] text-[#d1d5db]">
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="mx-auto flex w-full max-w-[1600px] flex-grow flex-col p-4 sm:p-6">
        {activeTab === 'arbitrage' && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">资金费率套利矩阵</h1>
                <p className="text-sm text-[#6b7280]">
                  跨交易所现货/合约套利机会扫描；仅展示 Binance 与 OKX 返回的真实公开行情。
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs text-[#6b7280]">
                {error ? (
                  <span className="text-[#f59e0b]">行情接口异常</span>
                ) : isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#3b82f6]" />
                    初始化行情
                  </span>
                ) : !hasRows ? (
                  <span className="text-[#f59e0b]">暂无真实行情</span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#3b82f6]" />
                    实时更新中
                  </span>
                )}
              </div>
            </div>
            {hasRows ? (
              <>
                <StatCards rows={rows} />
                <ArbitrageTable rows={rows} />
              </>
            ) : (
              <EmptyModule
                icon={Network}
                title="暂无真实交易所数据"
                body="Binance 与 OKX 当前没有返回可组合的现货/合约/资金费率数据，因此不展示任何行情。"
              />
            )}
          </>
        )}

        {activeTab === 'monitor' && (
          <EmptyModule
            icon={PieChart}
            title="宏观监控模块"
            body="资金净流入、全网 OI 热力图、成交量脉冲与多空结构会放在这里。"
          />
        )}

        {activeTab === 'trade' && (
          <EmptyModule
            icon={Zap}
            title="一键对冲执行"
            body="交易所 API 路由、仓位校验、下单前风控与执行回执会放在这里。"
          />
        )}
      </main>
    </div>
  );
}
