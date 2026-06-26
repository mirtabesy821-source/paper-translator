// ============================================================
// 结构保护服务 — 保护 LaTeX 公式 / 图片 / 代码块，翻译后回填
// ============================================================

import type { StructuredBlock } from "@/types";

/** 保护区块映射：占位符 → 原始内容 */
interface ProtectMap {
  [placeholder: string]: string;
}

// 占位符前缀
const PLACEHOLDER_PREFIX = "⟨PROTECT_";
const PLACEHOLDER_SUFFIX = "⟩";

let protectCounter = 0;

/** 重置占位符计数器（每次新翻译任务开始时调用） */
export function resetProtectCounter(): void {
  protectCounter = 0;
}

// ============================================================
// LaTeX / 公式保护
// ============================================================

/**
 * 匹配 LaTeX 公式的正则：
 * - $...$  行内公式
 * - $$...$$ 块级公式
 * - \(...\) 行内公式
 * - \[...\] 块级公式
 * - \begin{...}...\end{...} 环境
 */
const LATEX_REGEX =
  /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})/g;

/**
 * 匹配 Markdown 图片：![alt](url)
 */
const MD_IMAGE_REGEX = /!\[.*?\]\(.*?\)/g;

/**
 * 匹配 HTML <img> 标签
 */
const HTML_IMAGE_REGEX = /<img\b[^>]*\/?>/gi;

/**
 * 匹配代码块：```...```
 */
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

// ============================================================
// 核心 API
// ============================================================

/**
 * 对结构化文本块列表进行"保护处理"：
 * 将公式、图片、代码块替换为唯一的占位符，返回：
 * - protectedBlocks: 占位符化后的文本块列表
 * - protectMap: 占位符 → 原始内容 映射表
 */
export function protectBlocks(
  blocks: StructuredBlock[]
): { protectedContent: string; protectMap: ProtectMap } {
  const map: ProtectMap = {};

  // 将所有块拼接为一个完整文本（保持顺序和分隔）
  const joinedContent = blocks
    .map((b) => `<!--BLOCK:${b.id}-->\n${b.content}`)
    .join("\n\n<!--SEPARATOR-->\n\n");

  const protectedContent = applyProtection(joinedContent, map);

  return { protectedContent, protectMap: map };
}

/**
 * 对外暴露：保护单个文本块中的特殊内容
 */
export function protectSingleBlock(
  blockId: string,
  content: string
): { protectedContent: string; protectMap: ProtectMap } {
  const map: ProtectMap = {};
  const wrapped = `<!--BLOCK:${blockId}-->\n${content}`;
  return {
    protectedContent: applyProtection(wrapped, map),
    protectMap: map,
  };
}

/**
 * 将翻译后的文本中的占位符还原为原始内容
 */
export function restoreBlocks(
  translated: string,
  protectMap: ProtectMap
): string {
  let result = translated;

  // 1) 剥离结构标记 <!--BLOCK:...-->（LLM 按要求保留了它，但不应显示给用户）
  result = result.replace(/<!--\s*BLOCK:\s*[^>]+\s*-->\s*\n?/g, "");

  // 2) 还原保护占位符 → 原始公式/图片
  for (const [placeholder, original] of Object.entries(protectMap)) {
    result = result.replace(
      new RegExp(escapeRegex(placeholder), "g"),
      original
    );
  }
  return result.trim();
}

/**
 * 从受保护的翻译结果中按块 ID 拆分为各块的译文
 */
export function splitTranslatedBlocks(
  translated: string
): { blockId: string; content: string }[] {
  const result: { blockId: string; content: string }[] = [];
  const blockRegex = /<!--BLOCK:([^>]+)-->\n([\s\S]*?)(?=\n\n<!--SEPARATOR-->|$)/g;

  let match;
  while ((match = blockRegex.exec(translated)) !== null) {
    result.push({
      blockId: match[1],
      content: match[2].trim(),
    });
  }

  return result;
}

// ============================================================
// 内部工具
// ============================================================

/**
 * 对文本应用所有保护规则，将特殊内容替换为占位符
 */
function applyProtection(text: string, map: ProtectMap): string {
  let result = text;

  // 保护顺序：代码块 → 公式 → 图片（避免嵌套冲突）

  // 1) 代码块
  result = result.replace(CODE_BLOCK_REGEX, (match) => {
    const placeholder = generatePlaceholder();
    map[placeholder] = match;
    return placeholder;
  });

  // 2) LaTeX 公式（$$...$$ 在前避免被 $...$ 误匹配）
  result = result.replace(LATEX_REGEX, (match) => {
    const placeholder = generatePlaceholder();
    map[placeholder] = match;
    return placeholder;
  });

  // 3) HTML <img> 标签
  result = result.replace(HTML_IMAGE_REGEX, (match) => {
    const placeholder = generatePlaceholder();
    map[placeholder] = match;
    return placeholder;
  });

  // 4) Markdown 图片
  result = result.replace(MD_IMAGE_REGEX, (match) => {
    const placeholder = generatePlaceholder();
    map[placeholder] = match;
    return placeholder;
  });

  return result;
}

function generatePlaceholder(): string {
  return `${PLACEHOLDER_PREFIX}${protectCounter++}_${Date.now()}${PLACEHOLDER_SUFFIX}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
