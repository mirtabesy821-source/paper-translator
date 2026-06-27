// ============================================================
// Markdown 导出服务 — 遍历 PageContent[] 生成双语对照 Markdown
// ============================================================
// 将每个 Block 的原始内容和 translatedText 交替拼接，
// 公式占位符还原为标准 $$/$ LaTeX 格式，表格转为 Markdown 表格。
// ============================================================

import type { PageContent, StructuredBlock } from "@/types";

/** 匹配残留的保护占位符 ⟨PROTECT_N_timestamp⟩ */
const PLACEHOLDER_REGEX = /⟨PROTECT_\d+_\d+⟩/g;

/** 匹配 <!--BLOCK:...--> 和 <!--SEPARATOR--> 结构标记 */
const MARKER_REGEX = /<!--\s*(?:BLOCK:[^>]+|SEPARATOR)\s*-->\s*\n?/g;

/**
 * 清理文本中的残留占位符和结构标记
 */
function cleanResidue(text: string): string {
  return text
    .replace(MARKER_REGEX, "")
    .replace(PLACEHOLDER_REGEX, "[公式]")
    .trim();
}

/**
 * 将公式内容规范化为 $$...$$ 块级格式
 */
function formatEquation(content: string): string {
  const cleaned = cleanResidue(content);

  // 已有 $$ 定界符
  if (cleaned.startsWith("$$") && cleaned.endsWith("$$")) return cleaned;

  // 行内 $...$ → 块级
  if (
    cleaned.startsWith("$") &&
    cleaned.endsWith("$") &&
    !cleaned.startsWith("$$")
  ) {
    return `$$${cleaned.slice(1, -1).trim()}$$`;
  }

  // \[...\] → $$...$$
  if (cleaned.startsWith("\\[") && cleaned.endsWith("\\]")) {
    return `$$${cleaned.slice(2, -2).trim()}$$`;
  }

  // \(...\) → $$...$$
  if (cleaned.startsWith("\\(") && cleaned.endsWith("\\)")) {
    return `$$${cleaned.slice(2, -2).trim()}$$`;
  }

  // \begin{env}...\end{env} → $$...$$
  if (/^\\begin\{/.test(cleaned)) {
    return `$$${cleaned}$$`;
  }

  // 默认包裹
  return `$$${cleaned}$$`;
}

/**
 * 将表格文本转为 Markdown 表格格式
 * 无法识别时用代码块保留原文
 */
function formatTable(content: string): string {
  const cleaned = cleanResidue(content);
  const lines = cleaned.split("\n").filter((l) => l.trim());

  if (lines.length < 2) return "```\n" + cleaned + "\n```";

  // 尝试按制表符或 2+ 空格拆分列
  const rows = lines.map((l) => l.split(/\t|\s{2,}/).filter((c) => c.trim()));
  const maxCols = Math.max(...rows.map((r) => r.length));

  if (maxCols < 2) return "```\n" + cleaned + "\n```";

  // 第一行作为表头
  const header = rows[0];
  const separator = Array(maxCols).fill("---");
  const body = rows.slice(1);

  let table = `| ${header.join(" | ")} |\n| ${separator.join(" | ")} |\n`;
  if (body.length > 0) {
    table += body.map((r) => `| ${r.join(" | ")} |`).join("\n");
  }
  return table;
}

/**
 * 根据 block 类型格式化单个块的 Markdown 输出
 */
function formatBlock(block: StructuredBlock): string[] {
  const parts: string[] = [];
  const original = cleanResidue(block.content);
  const translated = block.translated ? cleanResidue(block.translated) : "";
  const hasTranslation = translated && block.translationStatus === "done";

  switch (block.type) {
    case "heading":
      parts.push(`## ${original}`);
      if (hasTranslation) {
        parts.push(`\n**译文：** ${translated}`);
      }
      break;

    case "equation":
      parts.push(formatEquation(block.content));
      break;

    case "table":
      parts.push("**原文：**");
      parts.push("");
      parts.push(formatTable(block.content));
      if (hasTranslation) {
        parts.push("");
        parts.push("**译文：**");
        parts.push("");
        parts.push(formatTable(block.translated));
      }
      break;

    case "image":
      parts.push("*[图片]*");
      break;

    case "paragraph":
    default:
      if (original) {
        parts.push(`**原文：**`);
        parts.push("");
        parts.push(original);
      }
      if (hasTranslation) {
        if (original) parts.push("");
        parts.push(`**译文：**`);
        parts.push("");
        parts.push(translated);
      }
      break;
  }

  return parts;
}

/**
 * 将 PageContent[] 导出为双语对照 Markdown 文本
 *
 * 遍历每一页的每个 StructuredBlock，交替拼接原文与译文，
 * 公式还原为标准 LaTeX，表格转为 Markdown 格式。
 */
export function exportToMarkdown(pages: PageContent[]): string {
  const sections: string[] = [];

  sections.push("# 论文翻译");
  sections.push("");
  sections.push(`> 导出时间：${new Date().toLocaleString("zh-CN")}`);
  sections.push("");
  sections.push("---");

  for (const page of pages) {
    // 页面分隔标记（Markdown 注释，不渲染但保留结构信息）
    sections.push("");
    sections.push(`<!-- Page ${page.pageNumber} -->`);
    sections.push("");

    for (const block of page.blocks) {
      const blockParts = formatBlock(block);
      sections.push(...blockParts);
      sections.push("");
      sections.push("---");
      sections.push("");
    }
  }

  return sections.join("\n");
}

/**
 * 触发浏览器下载 Markdown 文件
 */
export function downloadMarkdown(pages: PageContent[], filename?: string): void {
  const markdown = exportToMarkdown(pages);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  a.download = filename || `paper-translation-${ts}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
