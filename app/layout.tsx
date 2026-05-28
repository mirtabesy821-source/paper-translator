import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学术论文双语翻译",
  description:
    "基于 LLM 的学术论文双语对照翻译工具 — 上传 PDF，左侧原文右侧译文，同步滚动，保护公式和排版。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
