import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarCare System",
  description: "多門店汽車內裝管理系統"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}

