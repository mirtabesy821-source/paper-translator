// ============================================================
// LLM 翻译代理 API — SSE 流式转发（apiKey 由服务端注入）
// ============================================================
// POST /api/translate
// Body: { blocks: [{id,content}], apiConfig: {baseUrl,modelName,glossary,localModel} }
//
// 安全设计：apiKey 不从前端传入，永远从服务端环境变量读取。
// 本地模型模式（localModel=true）下跳过 API Key 检查，直接转发到本地端点（如 Ollama）。
// 超时控制：本地模型 5 分钟，云端 API 2 分钟。
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
      apiConfig?: { baseUrl?: string; modelName?: string; glossary?: { source: string; target: string }[]; localModel?: boolean };
    } = body;

    const isLocalModel = apiConfig?.localModel === true;

    // API Key 只从服务端环境变量读取（本地模式不需要）
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl =
      apiConfig?.baseUrl ||
      process.env.DEEPSEEK_BASE_URL ||
      "https://api.deepseek.com";
    const modelName =
      apiConfig?.modelName ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-chat";

    // 本地模式不需要 API Key；云端模式必须有
    if (!blocks?.length) {
      return new Response(
        JSON.stringify({ error: "没有需要翻译的文本块" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isLocalModel && !apiKey) {
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

    // ---- Glossary: 动态术语映射，拼入 system prompt ----
    let systemPrompt = SYSTEM_PROMPT_STREAM;
    const glossary = apiConfig?.glossary || [];
    if (glossary.length > 0) {
      const glossaryLines = glossary
        .map((g: any) => "  \"" + g.source + "\" \u2192 \"" + g.target + "\"")
        .join("\n");
      const block = "## 术语词库（强制遵循）\n\n以下术语必须严格按照指定译法翻译，不得使用其他译法：\n\n" + glossaryLines + "\n\n在整个翻译过程中，你必须始终使用上述映射，不得对这些术语使用替代译法。";
      systemPrompt = block + "\n\n" + systemPrompt;
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    // 超时控制：本地模型给 5 分钟（模型加载+生成较慢），云端 API 给 2 分钟
    const timeoutMs = isLocalModel ? 300_000 : 120_000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    // 请求头：本地模式不带 Authorization
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!isLocalModel && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // 转发到 LLM API（服务端注入 apiKey；本地模式直接请求本地端点）
    let upstream: Response;
    try {
      upstream = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: true,
          temperature: 0.3,
          max_tokens: 4096,
        }),
        signal: abortController.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isTimeout = fetchErr.name === "AbortError";
      const msg = isLocalModel
        ? (isTimeout
          ? `本地模型响应超时（${timeoutMs / 1000}s），请确认模型已加载或减小批量大小`
          : `无法连接到本地模型服务（${baseUrl}），请确认 Ollama 已启动且端口正确`)
        : (isTimeout
          ? `API 请求超时（${timeoutMs / 1000}s）`
          : `无法连接到 API 服务（${baseUrl}）`);
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!upstream.ok) {
      clearTimeout(timeoutId);
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
          clearTimeout(timeoutId);
          const isTimeout = err.name === "AbortError";
          const msg = isTimeout
            ? (isLocalModel
              ? "本地模型响应超时，请确认模型已加载或减小批量大小"
              : "API 响应超时")
            : err.message;
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`
            )
          );
        } finally {
          clearTimeout(timeoutId);
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