// ============================================================
// PDF 解析服务 — 使用 PDF.js 提取文本并重组为结构化段落
// ============================================================

import * as pdfjsLib from "pdfjs-dist";
import type {
  TextItem,
  StructuredBlock,
  PageContent,
} from "@/types";

// ---- Worker 配置 ----
// 使用 public/ 目录下 postinstall 复制的 worker 文件
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// ---- 常量：几何启发式阈值 ----

/** 同一行内 Y 坐标偏差阈值（视口像素）。当前视口缩放 1.5x */
const SAME_LINE_Y_THRESHOLD = 5;

/** 段落间距阈值（视口像素）：行间距 ~18px，段落间距 ~30px，取中间值 */
const PARAGRAPH_GAP_THRESHOLD = 25;

/** 标题字号阈值（相对比例）：fontSize > 此值的块视为标题 */
const HEADING_FONT_SCALE = 1.2;

/** LaTeX 特征字符正则，用于检测公式 */
const LATEX_PATTERN = /[\\{}^_$]|\\alpha|\\beta|\\sum|\\int|\\frac|\\sqrt|\\begin|\\end/;

// ============================================================
// 主入口：加载 PDF 并提取所有页面的结构化数据
// ============================================================

/**
 * 加载 PDF 文件并提取所有页面的结构化内容。
 * 流程：加载 → 遍历每页 → Canvas 渲染 + 文本提取 → 返回 PageContent[]
 */
export async function loadPdf(file: File): Promise<PageContent[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PageContent[] = [];
  const totalPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // 1) Canvas 渲染：将页面绘制到离屏 Canvas 并导出 Data URL
    const viewport = page.getViewport({ scale: 1.5 }); // 1.5x 高清渲染
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvas,
      viewport,
    }).promise;

    const canvasDataUrl = canvas.toDataURL("image/png");

    // 2) 文本提取 + 结构化段落重组（传入 viewport 用于坐标转换）
    const blocks = await extractStructuredBlocks(page, pageNum, 1.5, viewport.height);

    pages.push({
      pageNumber: pageNum,
      canvasDataUrl,
      blocks,
    });
  }

  return pages;
}

// ============================================================
// 核心算法：几何启发式段落重组
// ============================================================

/**
 * 从单个 PDF 页面提取文本片段，并通过几何启发式算法
 * 将碎片化的 TextItem 合并为结构化段落（段落/标题/公式）。
 *
 * 算法流程：
 *  1. 调用 page.getTextContent() 获取所有 TextItem（碎片化文本）
 *  2. 按 Y 坐标排序（PDF 坐标系 Y 向上，故降序 = 从上到下）
 *  3. 纵向合并：Y 相近的 TextItem 归入同一"行"
 *  4. 段落拆分：行间 Y 间距过大则拆为新段落
 *  5. 公式检测：检查文本内容是否包含 LaTeX 特征字符
 */
export async function extractStructuredBlocks(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number,
  scale: number,
  viewportHeight: number
): Promise<StructuredBlock[]> {
  const textContent = await page.getTextContent();

  // --- Step 1: 将 TextItem 转换为我们的类型，并将 Y 坐标从 PDF 空间转为视口空间 ---
  // PDF 空间：原点左下，Y 向上，单位 = PDF points（如 pageHeight=792）
  // 视口空间：原点左上，Y 向下，单位 = 像素（如 viewportHeight=1188=792*1.5）
  // 转换公式：viewportY = viewportHeight - pdfY * scale
  const items: TextItem[] = textContent.items
    .filter((item): item is Extract<typeof item, { str: string }> =>
      "str" in item && typeof item.str === "string" && item.str.trim().length > 0
    )
    .map((item) => {
      // PDF.js 的 transform 数组: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const transform = (item as any).transform as number[];
      const pdfY = transform[5];                      // PDF 原始 Y（底→顶）
      const viewportY = viewportHeight - pdfY * scale; // 视口 Y（顶→底）
      return {
        str: (item as any).str as string,
        x: transform[4],
        y: viewportY,
        width: (item as any).width as number,
        height: (item as any).height as number,
        fontName: (item as any).fontName as string,
        hasEOL: (item as any).hasEOL as boolean,
      };
    });

  if (items.length === 0) return [];

  // --- Step 2: 按 Y 升序排序（视口空间：Y 小 = 靠上），同 Y 按 X 升序（左→右） ---
  items.sort((a, b) => {
    const yDiff = a.y - b.y; // Y 升序：小的在上
    if (Math.abs(yDiff) > SAME_LINE_Y_THRESHOLD) return yDiff;
    return a.x - b.x;
  });

  // --- Step 3: 纵向合并 → 行 ---
  // 将 Y 坐标相近的 TextItem 合并为同一"行"
  interface TextLine {
    items: TextItem[];
    y: number;      // 行平均 Y 坐标
    maxHeight: number;
  }

  const lines: TextLine[] = [];
  let currentLine: TextLine | null = null;

  for (const item of items) {
    if (
      currentLine &&
      Math.abs(item.y - currentLine.y) <= SAME_LINE_Y_THRESHOLD
    ) {
      // 同一行：追加 TextItem
      currentLine.items.push(item);
      currentLine.y = (currentLine.y + item.y) / 2; // 更新平均 Y
      currentLine.maxHeight = Math.max(currentLine.maxHeight, item.height);
    } else {
      // 新行
      if (currentLine) {
        // 行内按 X 排序
        currentLine.items.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
      }
      currentLine = {
        items: [item],
        y: item.y,
        maxHeight: item.height,
      };
    }
  }
  if (currentLine) {
    currentLine.items.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
  }

  // --- Step 4: 段落拆分 ---
  const blocks: StructuredBlock[] = [];
  let blockIdCounter = 0;
  let paraLines: TextLine[] = [];
  let paraYStart = 0;

  const flushParagraph = () => {
    if (paraLines.length === 0) return;

    // 合并行内文本
    const fullText = paraLines
      .map((line) => line.items.map((it) => it.str).join(" "))
      .join("\n");

    // 计算平均字号用于标题检测
    const avgHeight =
      paraLines.reduce((s, l) => s + l.maxHeight, 0) / paraLines.length;
    const globalAvgHeight =
      lines.reduce((s, l) => s + l.maxHeight, 0) / lines.length;

    // 检测类型
    let type: StructuredBlock["type"] = "paragraph";

    // 标题检测：字号明显大于平均值
    if (avgHeight > globalAvgHeight * HEADING_FONT_SCALE && paraLines.length <= 2) {
      type = "heading";
    }

    // 公式检测：包含 LaTeX 特征字符 或 含 $$ 界定符
    if (LATEX_PATTERN.test(fullText) || /^\s*\$\$/.test(fullText)) {
      type = "equation";
    }

    const blockId = `page${pageNumber}-block${blockIdCounter++}`;

    blocks.push({
      id: blockId,
      type,
      content: fullText.trim(),
      pageNumber,
      yStart: paraYStart,
      yEnd: paraLines[paraLines.length - 1].y,
      translated: "",
      translationStatus: "pending",
    });

    paraLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (paraLines.length === 0) {
      // 开始新段落
      paraLines.push(line);
      paraYStart = line.y;
    } else {
      const prevLine = paraLines[paraLines.length - 1];
      const gap = line.y - prevLine.y; // 视口 Y 向下，gap > 0 表示有间距

      if (gap > PARAGRAPH_GAP_THRESHOLD) {
        // 间距过大 → 当前段落结束，新段落开始
        flushParagraph();
        paraLines.push(line);
        paraYStart = line.y;
      } else {
        // 间距小 → 同一段落内的新行
        paraLines.push(line);
      }
    }
  }
  // 刷出最后一个段落
  flushParagraph();

  return blocks;
}

// ============================================================
// 工具函数：获取单页 Canvas 渲染图
// ============================================================

/**
 * 将 PDF 单页渲染为 Canvas Data URL（用于左侧显示）。
 * @param page PDF 页面对象
 * @param scale 渲染倍率，默认 1.5（高清）
 */
export async function renderPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  scale: number = 1.5
): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL("image/png");
}
