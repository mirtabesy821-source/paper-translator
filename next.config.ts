import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许 pdfjs-dist 的 canvas 模块在客户端使用
  serverExternalPackages: ["pdfjs-dist"],
  // 转发 API 请求头（SSE 流式需要）
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
