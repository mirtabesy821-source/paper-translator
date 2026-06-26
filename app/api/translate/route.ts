// ============================================================
// LLM 翻译代理 API — SSE 流式转发（apiKey 由服务端注入）
// ============================================================
// POST /api/translate
// Body: { blocks: [{id,content}], apiConfig: {baseUrl,modelName} }
//
// 安全设计：apiKey 不从前端传入，永远从服务端环境变量读取。
// 上游错误响应做摘要处理，避免泄露内部 API 错误细节。
// ============================================================

import { NextRequest } from "next/server";
import type { ChatMessage } from "@/types";
import { SYSTEM_PROMPT_STREAM } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 安全摘要上游错误信息：只保留状态码和简短提示，
 * 避免将上游原始响应（可能含敏感 token 信息）完整透传给浏览器
 */
function summarizeUpstreamError(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return "API Key 无效或未授权，请检查配置";
  }
  if (status === 429) {
    return "API 请求过于频繁，请稍后重试";
  }
  if (status >= 500) {
    return `上游 API 服务异常 (${status})，请稍后重试`;
  }
  // 仅在非生产环境保留原始错误用于调试
  if (process.env.NODE_ENV === "development") {
    return `上游 API 错误 (${status}): ${body.slice(0, 200)}`;
  }
  return `上游 API 错误 (${status})`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      blocks,
      apiConfig,
    }: {
      blocks: { id: string; content: string }[];
      apiConfig?: { baseUrl?: string; modelName?: string };
    } = body;

    // API Key 只从服务端环境变量读取
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl =
      apiConfig?.baseUrl ||
      process.env.DEEPSEEK_BASE_URL ||
      "https://api.deepseek.com";
    const modelName =
      apiConfig?.modelName ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-chat";

    if (!blocks?.length || !apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "API Key 未配置：请在 .env.local 中设置 DEEPSEEK_API_KEY 环境变量",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 拼接所有块
    const userContent = blocks.map((b) => b.content).join("\n\n---\n\n");

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT_STREAM },
      { role: "user", content: userContent },
    ];

    const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    // 转发到 LLM API（服务端注入 apiKey）
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(
        JSON.stringify({
          error: summarizeUpstreamError(upstream.status, errText),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // 建立 SSE 响应流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body?.getReader();
        if (!reader) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: "上游响应为空" })}\n\n`
            )
          );
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;

              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") {
                controller.enqueue(
                  encoder.encode(
                    `event: done\ndata: ${JSON.stringify({ success: true })}\n\n`
                  )
                );
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(
                    encoder.encode(
                      `event: delta\ndata: ${JSON.stringify({ text: delta })}\n\n`
                    )
                  );
                }
              } catch {
                // 跳过无法解析的行
              }
            }
          }

          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({ success: true })}\n\n`
            )
          );
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}