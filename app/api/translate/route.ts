// ============================================================
// LLM 翻译代理 API — 接收段落数组，以 SSE 流式转发
// ============================================================
// POST /api/translate
// Body: { blocks: {id,content}[], apiConfig }
// Response: SSE 流 (text/event-stream)
//   事件: delta  → data: { blockId, text }
//   事件: done    → data: { success: true }
//   事件: error   → data: { message: string }
// ============================================================

import { NextRequest } from "next/server";
import type { ApiConfig, ChatMessage } from "@/types";
import { SYSTEM_PROMPT_STREAM } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      blocks,
      apiConfig,
    }: {
      blocks: { id: string; content: string }[];
      apiConfig: ApiConfig;
    } = body;

    // 优先用请求中的配置，否则从环境变量读取
    const apiKey = apiConfig?.apiKey || process.env.DEEPSEEK_API_KEY;
    const baseUrl = apiConfig?.baseUrl || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const modelName = apiConfig?.modelName || process.env.DEEPSEEK_MODEL || "deepseek-chat";

    if (!blocks?.length || !apiKey) {
      return new Response(
        JSON.stringify({ error: "缺少 API Key：请在 .env.local 中配置 DEEPSEEK_API_KEY 或在页面中手动输入" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 拼接所有块
    const userContent = blocks
      .map((b) => b.content)
      .join("\n\n---\n\n");

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT_STREAM },
      { role: "user", content: userContent },
    ];

    const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    // 转发到 LLM API
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
        JSON.stringify({ error: `上游 API 错误 (${upstream.status}): ${errText}` }),
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
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "上游响应体为空" })}\n\n`)
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
                  encoder.encode(`event: done\ndata: ${JSON.stringify({ success: true })}\n\n`)
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
            encoder.encode(`event: done\ndata: ${JSON.stringify({ success: true })}\n\n`)
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