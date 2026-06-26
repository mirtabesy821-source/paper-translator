// ============================================================
// LLM 客户端 — 流式调用 OpenAI 兼容 API（走代理）
// ============================================================
// 注意：apiConfig 不再包含 apiKey，Key 从服务端环境变量读取
// ============================================================

import type { ApiConfig } from "@/types";

// ============================================================
// 流式翻译（通过 Next.js 代理 API 转发）
// ============================================================

/**
 * 流式翻译：通过 /api/translate 代理转发到 LLM API。
 * 前端不直接请求 LLM API，API Key 由服务端注入。
 *
 * 代理 SSE 事件格式：
 *   event: delta  → data: { text: "..." }   增量文本
 *   event: done   → data: { success: true }  翻译完成
 *   event: error  → data: { message: "..." } 错误信息
 *
 * @param blocks 待翻译的文本块（已保护处理）
 * @param apiConfig API 配置（baseUrl + modelName，不含 apiKey）
 * @param onDelta 每次收到增量文本时的回调
 * @param signal AbortSignal 用于取消请求
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
    body: JSON.stringify({ blocks, apiConfig: { baseUrl: apiConfig.baseUrl, modelName: apiConfig.modelName, glossary: apiConfig.glossary } }),
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

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

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
      } catch (err: any) {
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