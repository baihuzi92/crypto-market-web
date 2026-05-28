'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { CryptoData } from '../types/crypto';
import PriceChart from './PriceChart';

interface CryptoCardProps {
  crypto: CryptoData;
}

const cryptoIcons: Record<string, string> = {
  bitcoin: '₿',
  ethereum: 'Ξ',
  tether: '₮',
  binancecoin: 'BNB',
  'binance-coin': 'BNB',
  solana: '◎',
  'usd-coin': 'USDC',
  xrp: 'XRP',
  cardano: 'ADA',
  dogecoin: 'Ð',
  tron: 'TRX',
  avalanche: 'AVAX',
  'shiba-inu': 'SHIB',
  polkadot: 'DOT',
  chainlink: 'LINK',
  'bitcoin-cash': 'BCH',
  litecoin: 'Ł',
  polygon: 'MATIC',
  dai: 'DAI',
  'wrapped-bitcoin': 'WBTC',
};

export default function CryptoCard({ crypto }: CryptoCardProps) {
  const isPositive = crypto.price_change_percentage_24h > 0;
  const icon = cryptoIcons[crypto.id] || crypto.symbol.toUpperCase();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
              {crypto.name}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 uppercase">
              {crypto.symbol}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            ${crypto.current_price.toLocaleString()}
          </p>
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      <div className="mb-4">
        <PriceChart crypto={crypto} />
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <p>市值: ${(crypto.market_cap / 1e9).toFixed(2)}B</p>
        <p>排名: #{crypto.market_cap_rank}</p>
      </div>
    </div>
  );
}
