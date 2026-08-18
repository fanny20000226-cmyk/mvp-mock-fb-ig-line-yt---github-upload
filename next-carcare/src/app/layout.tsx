import type { Metadata } from "next";
import "./globals.css";
import { UiFeedbackProvider } from "@/components/UiFeedback";

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
      <body><UiFeedbackProvider>{children}</UiFeedbackProvider></body>
    </html>
  );
}
