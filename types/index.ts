// ============================================================
// 类型汇总 — 统一重新导出
// ============================================================

export type { TextItem, BlockType, TranslationStatus, StructuredBlock, PageContent } from "./pdf";
export type {
  ApiConfig,
  ChatMessage,
  TranslationRequest,
  TranslationDelta,
  AppState,
} from "./api";

/** 滚动同步方向 */
export type ScrollSource = "left" | "right";