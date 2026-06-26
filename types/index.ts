// ============================================================
// 学术论文双语对照翻译网页 — 类型定义
// ============================================================

// ---- PDF 文本提取相关 ----

/** PDF.js 提取的原始文本片段（碎片化） */
export interface TextItem {
  /** 文本内容（可能是单字、短词或单词） */
  str: string;
  /** 变换矩阵中的 X 坐标（水平位置） */
  x: number;
  /** 变换矩阵中的 Y 坐标（垂直位置） */
  y: number;
  /** 文本宽度 */
  width: number;
  /** 文本高度（行高） */
  height: number;
  /** 字体名称 */
  fontName: string;
  /** 是否包含上下标特征 */
  hasEOL: boolean;
}

/** 结构化文本块类型 */
export type BlockType = "paragraph" | "heading" | "equation" | "image" | "table";

/** 几何启发式算法产生的结构化文本块 */
export interface StructuredBlock {
  /** 唯一标识 */
  id: string;
  /** 块类型 */
  type: BlockType;
  /** 文本内容 */
  content: string;
  /** 所属页码（从 1 开始） */
  pageNumber: number;
  /** 页面内 Y 起始坐标 */
  yStart: number;
  /** 页面内 Y 结束坐标 */
  yEnd: number;
  /** 水平起始位置（百分比 0~100） */
  xStartPct: number;
  /** 水平结束位置（百分比 0~100） */
  xEndPct: number;
  /** 翻译后的文本 */
  translated: string;
  /** 翻译状态 */
  translationStatus: TranslationStatus;
}

/** 单页结构化数据 */
export interface PageContent {
  pageNumber: number;
  /** Canvas 渲染图片数据（可能为 null 表示未生成） */
  canvasDataUrl: string | null;
  /** 结构化文本块列表 */
  blocks: StructuredBlock[];
}

/** 翻译状态 */
export type TranslationStatus =
  | "pending"
  | "translating"
  | "done"
  | "error";

// ---- LLM API 相关 ----

/**
 * API 配置（前端版本 — 不含 apiKey，安全原因）
 * apiKey 永远从服务端环境变量读取
 */
export interface ApiConfig {
  /** API Base URL */
  baseUrl: string;
  /** 模型名称 */
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
  /** 前端传来的 baseUrl 和 modelName，服务端自行注入 apiKey */
  apiConfig?: ApiConfig;
}

/** 流式翻译增量数据 */
export interface TranslationDelta {
  blockId: string;
  text: string;
}

// ---- 同步滚动相关 ----

/** 滚动同步方向 */
export type ScrollSource = "left" | "right";

// ---- 应用全局状态 ----

/** 应用主状态 */
export interface AppState {
  pdfLoaded: boolean;
  pages: PageContent[];
  currentPage: number;
  totalPages: number;
  translationProgress: number;
  isTranslating: boolean;
  apiConfig: ApiConfig | null;
}