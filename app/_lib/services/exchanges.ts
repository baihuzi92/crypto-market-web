import axios, { AxiosProxyConfig } from 'axios';
import { CryptoData, ExchangeMarketData } from '../types/crypto';

const BINANCE_SPOT_API = 'https://api.binance.com/api/v3';
const BINANCE_FUTURES_API = 'https://fapi.binance.com';
const OKX_API = 'https://www.okx.com';

export const CRYPTO_MAP: Record<string, { name: string; id: string }> = {
  BTC: { name: 'Bitcoin', id: 'bitcoin' },
  ETH: { name: 'Ethereum', id: 'ethereum' },
  BNB: { name: 'BNB', id: 'binancecoin' },
  SOL: { name: 'Solana', id: 'solana' },
  XRP: { name: 'XRP', id: 'ripple' },
  ADA: { name: 'Cardano', id: 'cardano' },
  DOGE: { name: 'Dogecoin', id: 'dogecoin' },
  TRX: { name: 'TRON', id: 'tron' },
  LINK: { name: 'Chainlink', id: 'chainlink' },
  DOT: { name: 'Polkadot', id: 'polkadot' },
  LTC: { name: 'Litecoin', id: 'litecoin' },
  AVAX: { name: 'Avalanche', id: 'avalanche-2' },
  UNI: { name: 'Uniswap', id: 'uniswap' },
  ATOM: { name: 'Cosmos', id: 'cosmos' },
  ETC: { name: 'Ethereum Classic', id: 'ethereum-classic' },
  XLM: { name: 'Stellar', id: 'stellar' },
  NEAR: { name: 'NEAR Protocol', id: 'near' },
  APT: { name: 'Aptos', id: 'aptos' },
  ARB: { name: 'Arbitrum', id: 'arbitrum' },
};

const SYMBOLS = Object.keys(CRYPTO_MAP);
const proxy = getProxyConfig();

interface BinanceTicker {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
}

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

interface BinancePremiumIndex {
  markPrice?: string;
  lastFundingRate?: string;
  nextFundingTime?: number;
}

interface BinanceOpenInterest {
  openInterest: string;
}

interface OkxResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

interface OkxTicker {
  instId: string;
  last: string;
  open24h: string;
  vol24h: string;
  volCcy24h: string;
}

interface OkxFundingRate {
  fundingRate: string;
  nextFundingTime: string;
}

interface OkxOpenInterest {
  oiCcy?: string;
  oiUsd?: string;
}

type OkxCandle = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export async function getExchangeCryptoData(): Promise<CryptoData[]> {
  const [binanceMarkets, okxMarkets] = await Promise.all([
    getBinanceMarkets(),
    getOkxMarkets(),
  ]);

  return SYMBOLS.map((symbol, index) => {
    const info = CRYPTO_MAP[symbol];
    const exchanges = [binanceMarkets.get(symbol), okxMarkets.get(symbol)].filter(
      (market): market is ExchangeMarketData => Boolean(market)
    );
    const primary = exchanges[0];

    if (!primary) {
      return null;
    }

    return {
      id: info.id,
      symbol: symbol.toLowerCase(),
      name: info.name,
      image: `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`,
      current_price: primary.spotPrice,
      market_cap: primary.quoteVolume24h,
      market_cap_rank: index + 1,
      price_change_percentage_24h: primary.priceChange24h,
      sparkline_in_7d: {
        price: primary.sparkline,
      },
      exchanges,
    };
  }).filter((item): item is CryptoData => Boolean(item));
}

async function getBinanceMarkets(): Promise<Map<string, ExchangeMarketData>> {
  const symbols = SYMBOLS.map((symbol) => `${symbol}USDT`);
  const response = await axios.get<BinanceTicker[]>(`${BINANCE_SPOT_API}/ticker/24hr`, {
    timeout: 10000,
    proxy,
  });
  const tickers = response.data.filter((ticker) => symbols.includes(ticker.symbol));

  const markets = await Promise.all(tickers.map(async (ticker) => {
    const base = ticker.symbol.replace('USDT', '');
    const spotPrice = parseFloat(ticker.lastPrice);
    const [klineResult, fundingResult, openInterestResult] = await Promise.allSettled([
      axios.get<BinanceKline[]>(`${BINANCE_SPOT_API}/klines`, {
        params: { symbol: ticker.symbol, interval: '15m', limit: 96 },
        timeout: 10000,
        proxy,
      }),
      axios.get<BinancePremiumIndex>(`${BINANCE_FUTURES_API}/fapi/v1/premiumIndex`, {
        params: { symbol: ticker.symbol },
        timeout: 10000,
        proxy,
      }),
      axios.get<BinanceOpenInterest>(`${BINANCE_FUTURES_API}/fapi/v1/openInterest`, {
        params: { symbol: ticker.symbol },
        timeout: 10000,
        proxy,
      }),
    ]);
    const funding = fundingResult.status === 'fulfilled' ? fundingResult.value.data : null;

    return [
      base,
      {
        exchange: 'Binance',
        spotSymbol: ticker.symbol,
        perpSymbol: ticker.symbol,
        spotPrice,
        perpPrice: funding?.markPrice ? parseFloat(funding.markPrice) : null,
        priceChange24h: parseFloat(ticker.priceChangePercent),
        volume24h: parseFloat(ticker.volume),
        quoteVolume24h: parseFloat(ticker.quoteVolume),
        fundingRate: funding?.lastFundingRate ? parseFloat(funding.lastFundingRate) * 100 : null,
        nextFundingTime: funding?.nextFundingTime ?? null,
        openInterestValue: openInterestResult.status === 'fulfilled'
          ? parseFloat(openInterestResult.value.data.openInterest) * spotPrice
          : null,
        sparkline: klineResult.status === 'fulfilled'
          ? klineResult.value.data.map((kline) => parseFloat(kline[4]))
          : [],
      },
    ] as const;
  }));

  return new Map(markets);
}

async function getOkxMarkets(): Promise<Map<string, ExchangeMarketData>> {
  const [spotResponse, swapResponse] = await Promise.all([
    axios.get<OkxResponse<OkxTicker>>(`${OKX_API}/api/v5/market/tickers`, {
      params: { instType: 'SPOT' },
      timeout: 10000,
      proxy,
    }),
    axios.get<OkxResponse<OkxTicker>>(`${OKX_API}/api/v5/market/tickers`, {
      params: { instType: 'SWAP' },
      timeout: 10000,
      proxy,
    }),
  ]);
  const swaps = new Map(swapResponse.data.data.map((ticker) => [ticker.instId, ticker]));
  const tickers = spotResponse.data.data.filter((ticker) => {
    const base = ticker.instId.replace('-USDT', '');
    return ticker.instId.endsWith('-USDT') && SYMBOLS.includes(base);
  });

  const markets = await Promise.all(tickers.map(async (ticker) => {
    const base = ticker.instId.replace('-USDT', '');
    const swapInstId = `${base}-USDT-SWAP`;
    const spotPrice = parseFloat(ticker.last);
    const open24h = parseFloat(ticker.open24h);
    const [candleResult, fundingResult, openInterestResult] = await Promise.allSettled([
      axios.get<OkxResponse<OkxCandle>>(`${OKX_API}/api/v5/market/candles`, {
        params: { instId: ticker.instId, bar: '15m', limit: 96 },
        timeout: 10000,
        proxy,
      }),
      axios.get<OkxResponse<OkxFundingRate>>(`${OKX_API}/api/v5/public/funding-rate`, {
        params: { instId: swapInstId },
        timeout: 10000,
        proxy,
      }),
      axios.get<OkxResponse<OkxOpenInterest>>(`${OKX_API}/api/v5/public/open-interest`, {
        params: { instType: 'SWAP', instId: swapInstId },
        timeout: 10000,
        proxy,
      }),
    ]);
    const funding = fundingResult.status === 'fulfilled' ? fundingResult.value.data.data[0] : null;
    const openInterest = openInterestResult.status === 'fulfilled' ? openInterestResult.value.data.data[0] : null;

    return [
      base,
      {
        exchange: 'OKX',
        spotSymbol: ticker.instId,
        perpSymbol: swapInstId,
        spotPrice,
        perpPrice: swaps.get(swapInstId)?.last ? parseFloat(swaps.get(swapInstId)!.last) : null,
        priceChange24h: open24h > 0 ? ((spotPrice - open24h) / open24h) * 100 : 0,
        volume24h: parseFloat(ticker.vol24h),
        quoteVolume24h: parseFloat(ticker.volCcy24h),
        fundingRate: funding?.fundingRate ? parseFloat(funding.fundingRate) * 100 : null,
        nextFundingTime: funding?.nextFundingTime ? Number(funding.nextFundingTime) : null,
        openInterestValue: openInterest?.oiUsd
          ? parseFloat(openInterest.oiUsd)
          : openInterest?.oiCcy
            ? parseFloat(openInterest.oiCcy) * spotPrice
            : null,
        sparkline: candleResult.status === 'fulfilled'
          ? candleResult.value.data.data.map((candle) => parseFloat(candle[4])).reverse()
          : [],
      },
    ] as const;
  }));

  return new Map(markets);
}

function getProxyConfig(): AxiosProxyConfig | false {
  const rawProxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

  if (!rawProxy) {
    return false;
  }

  try {
    const url = new URL(rawProxy);
    return {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: Number(url.port),
    };
  } catch {
    return false;
  }
}
