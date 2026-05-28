"use client";

// ============================================================
// TranslationPanel — 右侧：译文容器，与左侧逐页虚拟对齐
// ============================================================

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import BlockView from "./BlockView";
import type { PageContent, StructuredBlock } from "@/types";

interface TranslationPanelProps {
  pages: PageContent[];
  currentPage: number;
  hoveredBlockId: string | null;
  activeBlockId: string | null;
  onBlockHover: (blockId: string | null) => void;
  onBlockClick: (blockId: string) => void;
  onPageVisible: (pageNumber: number) => void;
}

export interface TranslationPanelHandle {
  scrollToBlock: (blockId: string) => void;
  getScrollContainer: () => HTMLDivElement | null;
}

/**
 * TranslationPanel — 右侧译文面板
 *
 * 与左侧 PdfCanvas 逐页对应：
 * - 每个"虚拟页面容器"对应左侧一页 PDF
 * - 页面内的 blocks 按顺序渲染
 * - 悬停/点击事件通过 blockId 与左侧联动
 */
const TranslationPanel = forwardRef<TranslationPanelHandle, TranslationPanelProps>(
  function TranslationPanel(
    {
      pages,
      currentPage,
      hoveredBlockId,
      activeBlockId,
      onBlockHover,
      onBlockClick,
      onPageVisible,
    },
    ref
  ) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // ---- 暴露给父组件 ----
    useImperativeHandle(ref, () => ({
      scrollToBlock(blockId: string) {
        const el = scrollRef.current?.querySelector(
          `[data-block-id="${blockId}"]`
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      getScrollContainer: () => scrollRef.current,
    }));

    // ---- Intersection Observer：检测可视页面 ----
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

    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700"
      >
        {pages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">
            上传 PDF 后，译文将在此显示
          </div>
        )}

        {pages.map((page) => (
          <div
            key={page.pageNumber}
            ref={(el) => {
              if (el) pageRefs.current.set(page.pageNumber, el);
            }}
            data-page-num={page.pageNumber}
            className="border-b border-zinc-200 dark:border-zinc-700 pb-4"
          >
            {/* 页面标签 */}
            <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                第 {page.pageNumber} 页
              </span>
              <span className="ml-2 text-xs text-zinc-300 dark:text-zinc-600">
                {page.blocks.filter((b) => b.translationStatus === "done").length}
                /{page.blocks.length} 段落
              </span>
            </div>

            {/* 该页所有 block */}
            <div className="px-4 py-2 space-y-1">
              {page.blocks.map((block) => (
                <BlockView
                  key={block.id}
                  block={block}
                  isActive={activeBlockId === block.id}
                  isHovered={hoveredBlockId === block.id}
                  onMouseEnter={() => onBlockHover(block.id)}
                  onMouseLeave={() => onBlockHover(null)}
                  onClick={() => onBlockClick(block.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

export default TranslationPanel;
