import { getFuturesPrices } from './binance';

interface PriceRecord {
  price: number;
  timestamp: number;
}

interface AlertRecord {
  symbol: string;
  lastAlertTime: number;
}

class PriceMonitor {
  private priceHistory: Map<string, PriceRecord[]> = new Map();
  private alertHistory: Map<string, AlertRecord> = new Map();
  private readonly HISTORY_DURATION = 5 * 60 * 1000; // 5分钟
  private readonly ALERT_COOLDOWN = 60 * 60 * 1000; // 1小时
  private readonly THRESHOLD = 0.02; // 2%涨幅

  async checkPriceChanges(symbols: string[]): Promise<Array<{ symbol: string; changePercent: number; currentPrice: number }>> {
    const alerts: Array<{ symbol: string; changePercent: number; currentPrice: number }> = [];

    try {
      const prices = await getFuturesPrices(symbols);
      const now = Date.now();

      for (const { symbol, price } of prices) {
        const currentPrice = parseFloat(price);

        // 存储当前价格
        if (!this.priceHistory.has(symbol)) {
          this.priceHistory.set(symbol, []);
        }

        const history = this.priceHistory.get(symbol)!;
        history.push({ price: currentPrice, timestamp: now });

        // 清理超过5分钟的历史数据
        const cutoffTime = now - this.HISTORY_DURATION;
        const validHistory = history.filter(record => record.timestamp > cutoffTime);
        this.priceHistory.set(symbol, validHistory);

        // 检查是否有5分钟前的数据
        if (validHistory.length < 2) {
          continue;
        }

        const oldestPrice = validHistory[0].price;
        const changePercent = (currentPrice - oldestPrice) / oldestPrice;

        // 检查是否达到涨幅阈值
        if (changePercent >= this.THRESHOLD) {
          // 检查冷却时间
          const lastAlert = this.alertHistory.get(symbol);
          if (!lastAlert || (now - lastAlert.lastAlertTime) >= this.ALERT_COOLDOWN) {
            alerts.push({
              symbol,
              changePercent: changePercent * 100,
              currentPrice
            });

            // 记录推送时间
            this.alertHistory.set(symbol, { symbol, lastAlertTime: now });
          }
        }
      }
    } catch (error) {
      console.error('Price check failed:', error);
      throw error;
    }

    return alerts;
  }
}

export const priceMonitor = new PriceMonitor();
