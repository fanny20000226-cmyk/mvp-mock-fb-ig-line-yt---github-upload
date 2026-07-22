import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarCare System",
  description: "PEIWAY 多門店汽車美容管理系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
