'use client';

import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { CryptoData } from '../_lib/types/crypto';

interface PriceChartProps {
  crypto: CryptoData;
}

export default function PriceChart({ crypto }: PriceChartProps) {
  const isPositive = crypto.price_change_percentage_24h > 0;

  const chartData = crypto.sparkline_in_7d.price.map((price, index) => {
    // 计算时间（从24小时前开始，每15分钟一个点）
    const minutesAgo = (95 - index) * 15;
    const hoursAgo = Math.floor(minutesAgo / 60);
    const mins = minutesAgo % 60;
    const timeLabel = hoursAgo > 0
      ? `${hoursAgo}小时${mins > 0 ? mins + '分' : ''}前`
      : `${mins}分钟前`;

    return {
      index,
      price,
      time: timeLabel,
    };
  });

  // 计算价格范围，添加一些padding让曲线更明显
  const prices = crypto.sparkline_in_7d.price;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1; // 10% padding
  const yMin = minPrice - padding;
  const yMax = maxPrice + padding;

  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={chartData}>
        <YAxis domain={[yMin, yMax]} hide />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-zinc-900 dark:bg-zinc-800 text-white px-3 py-2 rounded-lg shadow-lg border border-zinc-700">
                  <p className="text-sm font-semibold">
                    ${payload[0].value?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {payload[0].payload.time}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke={isPositive ? '#16a34a' : '#dc2626'}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
