import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARB.TERMINAL - 加密资金费率监控",
  description: "加密货币行情、资金费率、OI 与跨交易所套利机会监控终端",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
