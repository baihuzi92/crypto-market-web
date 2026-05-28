import axios from 'axios';

const BINANCE_FUTURES_API = 'https://fapi.binance.com';

export interface BinanceTickerPrice {
  symbol: string;
  price: string;
  time: number;
}

export async function getFuturesPrices(symbols?: string[]): Promise<BinanceTickerPrice[]> {
  try {
    const proxyConfig = {
      protocol: 'http',
      host: '127.0.0.1',
      port: 7891,
    };

    const response = await axios.get(`${BINANCE_FUTURES_API}/fapi/v1/ticker/price`, {
      timeout: 10000,
      proxy: proxyConfig
    });
    const allPrices: BinanceTickerPrice[] = response.data;

    if (symbols && symbols.length > 0) {
      return allPrices.filter(item => symbols.includes(item.symbol));
    }

    return allPrices;
  } catch (error) {
    console.error('Failed to fetch Binance futures prices:', error);
    throw error;
  }
}
