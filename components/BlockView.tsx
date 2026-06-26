"use client";

// ============================================================
// BlockView — 单个译文块渲染（段落 / 公式 / 标题 / 图片占位）
// ============================================================

import { useEffect, useRef } from "react";
import katex from "katex";
import type { StructuredBlock } from "@/types";

interface BlockViewProps {
  block: StructuredBlock;
  isActive: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

export default function BlockView({
  block,
  isActive,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: BlockViewProps) {
  const equationRef = useRef<HTMLDivElement>(null);

  // ---- 渲染公式 ----
  useEffect(() => {
    if (block.type === "equation" && equationRef.current) {
      const content = block.translated || block.content;
      // 尝试移除可能残留的占位符标记
      const cleanContent = content.replace(/⟨PROTECT_\d+_\d+⟩/g, "");
      try {
        katex.render(cleanContent, equationRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        // KaTeX 渲染失败时显示原始文本
        equationRef.current.textContent = cleanContent;
      }
    }
  }, [block.translated, block.content, block.type]);

  // ---- 根据块类型渲染 ----
  const renderContent = () => {
    const displayText = block.translated || block.content;

    switch (block.type) {
      case "heading":
        return (
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {displayText}
          </h3>
        );

      case "equation":
        return (
          <div className="my-4 py-3 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div
              ref={equationRef}
              className="flex justify-center overflow-x-auto"
            />
          </div>
        );

      case "image":
        return (
          <div className="my-4 py-6 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 text-center text-zinc-400 text-sm">
            📷 [图片占位符]
          </div>
        );

      case "table": {
        const rows = displayText
          .split("\n")
          .filter((line) => line.trim());
        return (
          <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-600">
            <table className="min-w-full border-collapse text-sm">
              <tbody>
                {rows.map((row, ri) => {
                  const cells = row
                    .split(/\s{2,}/)
                    .filter((c) => c.trim());
                  return (
                    <tr
                      key={ri}
                      className={
                        ri % 2 === 0
                          ? "bg-white dark:bg-zinc-900"
                          : "bg-zinc-50 dark:bg-zinc-800/50"
                      }
                    >
                      {cells.map((cell, ci) => (
                        <td
                          key={ci}
                          className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                        >
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      case "paragraph":
      default:
        return (
          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 text-justify">
            {displayText}
          </p>
        );
    }
  };

  // ---- 翻译状态标签 ----
  const statusBadge = () => {
    switch (block.translationStatus) {
      case "pending":
        return (
          <span className="ml-2 text-xs text-zinc-400">⏳ 等待翻译</span>
        );
      case "translating":
        return (
          <span className="ml-2 text-xs text-blue-500 animate-pulse">
            🔄 翻译中...
          </span>
        );
      case "error":
        return (
          <span className="ml-2 text-xs text-red-500">❌ 翻译失败</span>
        );
      case "done":
        return null;
    }
  };

  return (
    <div
      data-block-id={block.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={`
        px-3 py-2 rounded-md transition-all duration-150 cursor-pointer
        ${isActive || isHovered
          ? "bg-yellow-100/70 dark:bg-yellow-500/15 ring-1 ring-yellow-300 dark:ring-yellow-600/30"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        }
      `}
    >
      {statusBadge()}
      {renderContent()}
    </div>
  );
}
