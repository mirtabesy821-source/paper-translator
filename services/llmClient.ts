// ============================================================
// LLM 客户端 — 流式调用 OpenAI 兼容 API
// ============================================================

import type { ApiConfig, ChatMessage } from "@/types";
import { SYSTEM_PROMPT_BATCH } from "@/lib/prompts";

// ============================================================
// 流式翻译（通过 Next.js 代理 API 转发，避免浏览器 CORS 限制）
// ============================================================

/**
 * 流式翻译：通过 /api/translate 代理转发到 LLM API。
 * 前端不直接请求 OpenAI/OpenRouter，避免 CORS 被拦截。
 *
 * 代理 SSE 事件格式：
 *   event: delta  → data: { text: "..." }   增量文本
 *   event: done   → data: { success: true }  翻译完成
 *   event: error  → data: { message: "..." } 错误信息
 *
 * @param blocks 待翻译的文本块（已保护处理）
 * @param apiConfig API 配置
 * @param onDelta 每次收到增量文本时的回调
 * @param signal AbortSignal 用于取消请求
 * @throws 网络错误或代理返回的错误
 */
export async function streamTranslate(
  blocks: { id: string; content: string }[],
  apiConfig: ApiConfig,
  onDelta: (blockId: string, fullText: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks, apiConfig }),
    signal,
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `代理请求失败 (${response.status})`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("响应体为空，无法读取流");

  const decoder = new TextDecoder();
  let accumulatedText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // 解析代理 SSE 格式：event: <type>\ndata: <json>\n\n
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || ""; // 不完整的留到下次

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventType = "";
      let dataStr = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          dataStr = line.slice(6).trim();
        }
      }

      if (!eventType || !dataStr) continue;

      try {
        const payload = JSON.parse(dataStr);

        if (eventType === "delta") {
          accumulatedText += payload.text || "";
          onDelta("__accumulated__", accumulatedText);
        } else if (eventType === "error") {
          throw new Error(payload.message || "上游翻译失败");
        }
        // "done" 事件：忽略，循环结束后正常返回
      } catch (err: any) {
        // 重新解析 dataStr 获取错误消息
        let errMsg = "翻译失败";
        try {
          const p = JSON.parse(dataStr);
          errMsg = p.message || errMsg;
        } catch {}
        if (err.message !== "上游翻译失败" && !(err instanceof SyntaxError)) throw err;
        throw new Error(errMsg);
      }
    }
  }

  return accumulatedText;
}

// ============================================================
// 非流式翻译（备选方案）
// ============================================================

/**
 * 非流式调用 LLM API，一次性返回完整翻译结果。
 */
export async function translateBatch(
  text: string,
  apiConfig: ApiConfig,
  signal?: AbortSignal
): Promise<string> {
  const { apiKey, baseUrl, modelName } = apiConfig;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT_BATCH },
    { role: "user", content: text },
  ];

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: false,
      temperature: 0.3,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}