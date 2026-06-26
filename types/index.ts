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
  /** 唯一标识，如 "page1-block3" */
  id: string;
  /** 块类型 */
  type: BlockType;
  /** 文本内容（对于 paragraph/heading 是自然语言文本；equation 是 LaTeX 源码） */
  content: string;
  /** 所属页码（从 1 开始） */
  pageNumber: number;
  /** 在页面内的 Y 起始坐标（用于左右对齐） */
  yStart: number;
  /** 在页面内的 Y 结束坐标 */
  yEnd: number;
  /** 块在页面宽度中的水平起始位置（百分比 0~100） */
  xStartPct: number;
  /** 块在页面宽度中的水平结束位置（百分比 0~100） */
  xEndPct: number;
  /** 翻译后的文本（初始为空） */
  translated: string;
  /** 翻译状态 */
  translationStatus: TranslationStatus;
}

/** 单页结构化数据 */
export interface PageContent {
  pageNumber: number;
  /** Canvas 渲染用的图片数据（通过 page.render 生成） */
  canvasDataUrl: string | null;
  /** 该页的结构化文本块列表 */
  blocks: StructuredBlock[];
}

/** 翻译状态 */
export type TranslationStatus =
  | "pending"    // 等待翻译
  | "translating" // 正在翻译（流式接收中）
  | "done"       // 翻译完成
  | "error";     // 翻译失败

// ---- LLM API 相关 ----

/** LLM API 配置 */
export interface ApiConfig {
  /** API Key */
  apiKey: string;
  /** API Base URL（兼容 OpenAI 格式，如 OpenRouter） */
  baseUrl: string;
  /** 模型名称 */
  modelName: string;
}

/** LLM 请求消息 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 翻译请求载荷 */
export interface TranslationRequest {
  /** 受保护的文本块数组（公式/图片已替换为占位符） */
  blocks: { id: string; content: string }[];
  /** System Prompt */
  systemPrompt: string;
  /** API 配置 */
  apiConfig: ApiConfig;
}

/** 流式翻译的增量数据 */
export interface TranslationDelta {
  blockId: string;
  /** 该块的累积译文 */
  text: string;
}

// ---- 同步滚动相关 ----

/** 滚动同步方向 */
export type ScrollSource = "left" | "right";

// ---- 应用全局状态 ----

/** 应用主状态 */
export interface AppState {
  /** PDF 文件是否已加载 */
  pdfLoaded: boolean;
  /** 各页结构化内容 */
  pages: PageContent[];
  /** 当前页码 */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 翻译进度 (0~1) */
  translationProgress: number;
  /** 是否正在翻译 */
  isTranslating: boolean;
  /** API 配置 */
  apiConfig: ApiConfig | null;
}
