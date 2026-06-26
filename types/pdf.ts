// ============================================================
// 类型：PDF 文本提取与结构化块
// ============================================================

/** PDF.js 提取的原始文本片段 */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

/** 结构化文本块类型 */
export type BlockType = "paragraph" | "heading" | "equation" | "image" | "table";

/** 翻译状态 */
export type TranslationStatus = "pending" | "translating" | "done" | "error";

/** 几何启发式结构化文本块 */
export interface StructuredBlock {
  id: string;
  type: BlockType;
  content: string;
  pageNumber: number;
  yStart: number;
  yEnd: number;
  xStartPct: number;
  xEndPct: number;
  translated: string;
  translationStatus: TranslationStatus;
}

/** 单页结构化数据 */
export interface PageContent {
  pageNumber: number;
  canvasDataUrl: string | null;
  blocks: StructuredBlock[];
}