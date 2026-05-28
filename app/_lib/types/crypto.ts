export interface ExchangeMarketData {
  exchange: 'Binance' | 'OKX';
  spotSymbol: string;
  perpSymbol: string;
  spotPrice: number;
  perpPrice: number | null;
  priceChange24h: number;
  volume24h: number;
  quoteVolume24h: number;
  fundingRate: number | null;
  nextFundingTime: number | null;
  openInterestValue: number | null;
  sparkline: number[];
}

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  sparkline_in_7d: {
    price: number[];
  };
  exchanges?: ExchangeMarketData[];
}
