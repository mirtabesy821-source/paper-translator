// ============================================================
// 类型：LLM API 配置与请求
// ============================================================

/** API 配置（前端版本 — 不含 apiKey，安全原因） */
export interface ApiConfig {
  baseUrl: string;
  modelName: string;
}

/** LLM 请求消息 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 翻译请求载荷（给服务端 API） */
export interface TranslationRequest {
  blocks: { id: string; content: string }[];
  apiConfig?: ApiConfig;
}

/** 流式翻译增量数据 */
export interface TranslationDelta {
  blockId: string;
  text: string;
}

/** 应用主状态 */
export interface AppState {
  pdfLoaded: boolean;
  pages: import("./pdf").PageContent[];
  currentPage: number;
  totalPages: number;
  translationProgress: number;
  isTranslating: boolean;
  apiConfig: ApiConfig | null;
}