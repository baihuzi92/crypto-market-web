import { NextResponse } from 'next/server';
import { priceMonitor } from '@/app/_lib/services/priceMonitor';
import { sendAlert, formatPriceAlert } from '@/app/_lib/services/serverChan';

export async function GET() {
  try {
    const sendKey = process.env.SERVER_CHAN_SEND_KEY;
    const symbolsParam = process.env.MONITOR_SYMBOLS;

    if (!sendKey) {
      return NextResponse.json(
        { error: 'SERVER_CHAN_SEND_KEY not configured' },
        { status: 500 }
      );
    }

    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'MONITOR_SYMBOLS not configured' },
        { status: 500 }
      );
    }

    const symbols = symbolsParam.split(',').map(s => s.trim());

    const alerts = await priceMonitor.checkPriceChanges(symbols);

    if (alerts.length > 0) {
      const { title, content } = formatPriceAlert(alerts);
      await sendAlert(sendKey, title, content);

      return NextResponse.json({
        success: true,
        alertsSent: alerts.length,
        alerts
      });
    }

    return NextResponse.json({
      success: true,
      alertsSent: 0,
      message: 'No alerts triggered'
    });
  } catch (error) {
    console.error('Monitor API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
