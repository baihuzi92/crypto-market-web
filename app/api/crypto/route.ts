import { getExchangeCryptoData } from '@/app/_lib/services/exchanges';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getExchangeCryptoData());
  } catch (error) {
    console.error('Error fetching crypto data from exchanges:', error);
    return NextResponse.json([]);
  }
}
