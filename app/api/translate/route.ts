// ============================================================
// LLM 翻译代理 API — 接收段落数组，以 SSE 流式转发
// ============================================================
// POST /api/translate
// Body: { blocks: {id,content}[], systemPrompt, apiConfig }
// Response: SSE 流 (text/event-stream)
//   事件: delta  → data: { blockId, text }
//   事件: done    → data: { success: true }
//   事件: error   → data: { message: string }
// ============================================================

import { NextRequest } from "next/server";
import type { ApiConfig, ChatMessage } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `你是一个专业的学术论文翻译专家。你的任务是将用户提供的英文（或源语言）学术文本翻译为中文。

## 核心规则（必须严格遵守）

1. **保护所有占位符**：文本中以 ⟨PROTECT_ 开头、以 ⟩ 结尾的内容是受保护的占位符，代表 LaTeX 公式、图片标签或代码块。你必须**原样保留**这些占位符，不得翻译、修改或删除其中的任何字符。

2. **保留所有标记**：文本中的 <!--BLOCK:...--> 和 <!--SEPARATOR--> 是结构标记，必须完整保留，不得修改。

3. **专业学术翻译**：
   - 使用准确、规范的学术中文
   - 保持原文的术语一致性
   - 公式变量名、数字、单位不翻译
   - 专有名词首次出现可保留英文并括号注中文

4. **结构一致**：输出必须与输入的结构完全对应，仅替换自然语言文本。`;

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
      { role: "system", content: SYSTEM_PROMPT },
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
