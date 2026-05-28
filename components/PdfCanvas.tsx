"use client";

// ============================================================
// PdfCanvas — 左侧：逐页 Canvas 渲染 + 透明 textLayer 覆盖层
// ============================================================

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import type { PageContent, StructuredBlock } from "@/types";

interface PdfCanvasProps {
  pages: PageContent[];
  /** 当前可视页码 */
  currentPage: number;
  /** 鼠标悬停时高亮的 blockId */
  hoveredBlockId: string | null;
  /** 当前高亮的 blockId（右侧同步过来的） */
  activeBlockId: string | null;
  onBlockHover: (blockId: string | null) => void;
  onBlockClick: (blockId: string) => void;
  onPageVisible: (pageNumber: number) => void;
}

export interface PdfCanvasHandle {
  scrollToBlock: (blockId: string) => void;
  getScrollContainer: () => HTMLDivElement | null;
}

/**
 * PdfCanvas — 左侧 PDF 渲染组件
 *
 * 结构：外层滚动容器 → 逐页 div.page-container →
 *   <canvas>（渲染 PDF 页面）
 *   <div.text-layer>（透明覆盖层，用于划词选中和悬停高亮）
 */
const PdfCanvas = forwardRef<PdfCanvasHandle, PdfCanvasProps>(
  function PdfCanvas(
    { pages, currentPage, hoveredBlockId, activeBlockId, onBlockHover, onBlockClick, onPageVisible },
    ref
  ) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

    // ---- 暴露给父组件的方法 ----
    useImperativeHandle(ref, () => ({
      scrollToBlock(blockId: string) {
        // 解析 block ID → 找到对应页码和 Y 坐标
        const match = blockId.match(/page(\d+)-block(\d+)/);
        if (!match) return;
        const pageNum = parseInt(match[1]);
        const block = pages.find((p) => p.pageNumber === pageNum)
          ?.blocks.find((b) => b.id === blockId);
        if (!block) return;

        const pageEl = pageRefs.current.get(pageNum);
        if (pageEl && scrollRef.current) {
          const pageTop = pageEl.offsetTop;
          // 根据 block 的 yStart 比例计算相对偏移
          const canvasEl = canvasRefs.current.get(pageNum);
          if (canvasEl) {
            const ratio = block.yStart / canvasEl.height;
            scrollRef.current.scrollTo({
              top: pageTop + ratio * canvasEl.clientHeight - 100,
              behavior: "smooth",
            });
          }
        }
      },
      getScrollContainer: () => scrollRef.current,
    }));

    // ---- Canvas 渲染 ----
    useEffect(() => {
      for (const page of pages) {
        const canvas = canvasRefs.current.get(page.pageNumber);
        if (!canvas || !page.canvasDataUrl) continue;

        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = page.canvasDataUrl;
      }
    }, [pages]);

    // ---- Intersection Observer：检测当前可视页面 ----
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const pageNum = parseInt(
                (entry.target as HTMLElement).dataset.pageNum || "1"
              );
              onPageVisible(pageNum);
            }
          }
        },
        { threshold: 0.5 }
      );

      pageRefs.current.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }, [pages, onPageVisible]);

    // ---- 渲染 ----
    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-800"
      >
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            ref={(el) => {
              if (el) pageRefs.current.set(page.pageNumber, el);
            }}
            data-page-num={page.pageNumber}
            className="relative mx-auto my-4 shadow-lg bg-white dark:bg-zinc-900"
            style={{ maxWidth: "100%" }}
          >
            {/* Canvas 层 */}
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(page.pageNumber, el);
              }}
              className="block w-full h-auto"
            />

            {/* 透明 textLayer 覆盖层 — 用于悬停高亮和划词选中 */}
            <div className="absolute inset-0 textLayer">
              {page.blocks.map((block) => {
                // 计算 textLayer 中块的位置（按比例映射）
                const canvas = canvasRefs.current.get(page.pageNumber);
                const canvasH = canvas?.height ?? 1000;
                const topPct = (block.yStart / canvasH) * 100;
                const bottomPct = (block.yEnd / canvasH) * 100;
                const heightPct = Math.max(bottomPct - topPct, 1);

                const isHovered = hoveredBlockId === block.id;
                const isActive = activeBlockId === block.id;

                return (
                  <div
                    key={block.id}
                    data-block-id={block.id}
                    onMouseEnter={() => onBlockHover(block.id)}
                    onMouseLeave={() => onBlockHover(null)}
                    onClick={() => onBlockClick(block.id)}
                    className={`
                      absolute left-0 right-0 cursor-pointer transition-colors duration-150
                      ${isHovered || isActive
                        ? "bg-yellow-200/40 dark:bg-yellow-500/20"
                        : "hover:bg-blue-200/20 dark:hover:bg-blue-500/10"
                      }
                    `}
                    style={{
                      top: `${topPct}%`,
                      height: `${heightPct}%`,
                    }}
                    title={block.content.slice(0, 100)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

export default PdfCanvas;
