import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "台北活動地圖",
  description: "台北市期間限定活動一站式整理，包含展覽、市集、快閃店等",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <body className="h-full flex flex-col">{children}</body>
    </html>
  );
}
