import axios from 'axios';

const SERVER_CHAN_API = 'https://sctapi.ftqq.com';

export async function sendAlert(sendKey: string, title: string, content: string): Promise<void> {
  try {
    const url = `${SERVER_CHAN_API}/${sendKey}.send`;

    await axios.post(url, {
      title,
      desp: content
    });

    console.log('Alert sent successfully:', title);
  } catch (error) {
    console.error('Failed to send alert:', error);
    throw error;
  }
}

export function formatPriceAlert(alerts: Array<{ symbol: string; changePercent: number; currentPrice: number }>): { title: string; content: string } {
  const title = `🚀 价格异动提醒 (${alerts.length}个币种)`;

  const content = alerts.map(alert => {
    return `### ${alert.symbol}\n- 涨幅: **${alert.changePercent.toFixed(2)}%**\n- 当前价格: ${alert.currentPrice}\n`;
  }).join('\n');

  return { title, content };
}
