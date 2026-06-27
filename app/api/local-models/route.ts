// ============================================================
// 本地模型列表代理 API — 服务端转发，避免浏览器 CORS 限制
// ============================================================
// GET /api/local-models?baseUrl=http://localhost:11434/v1
//
// 转发到本地 Ollama / vLLM / LM Studio 等的 /models 端点，
// 返回可用模型列表。超时 5 秒，避免长时间挂起。
// ============================================================

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.searchParams.get("baseUrl");

  if (!baseUrl) {
    return Response.json(
      { error: "缺少 baseUrl 参数" },
      { status: 400 }
    );
  }

  // 验证 URL 格式，防止 SSRF
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    return Response.json(
      { error: "baseUrl 格式无效" },
      { status: 400 }
    );
  }

  // 仅允许 localhost / 127.0.0.1 / 内网地址
  const host = parsedUrl.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.");

  if (!isLocal) {
    return Response.json(
      { error: "仅允许访问本地或内网地址" },
      { status: 403 }
    );
  }

  const url = `${baseUrl.replace(/\/$/, "")}/models`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return Response.json(
        { error: `本地模型服务返回错误 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // OpenAI 兼容格式: { data: [{ id: "model-name" }, ...] }
    // Ollama 原生格式: { models: [{ name: "model-name" }, ...] }
    const models: string[] = data.data
      ? data.data.map((m: any) => m.id).filter(Boolean)
      : data.models
      ? data.models.map((m: any) => m.name).filter(Boolean)
      : [];

    return Response.json({ models });
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      return Response.json(
        { error: "连接本地模型服务超时（5s），请确认服务已启动" },
        { status: 504 }
      );
    }

    return Response.json(
      { error: `无法连接到 ${baseUrl}，请确认服务已启动且端口正确` },
      { status: 502 }
    );
  }
}
