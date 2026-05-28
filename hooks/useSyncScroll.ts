"use client";

// ============================================================
// useSyncScroll — 左右同步滚动 + 高亮联动
// ============================================================

import { useRef, useCallback, useState } from "react";
import type { ScrollSource } from "@/types";

interface UseSyncScrollReturn {
  /** 左侧滚动容器 ref */
  leftRef: React.RefObject<HTMLDivElement | null>;
  /** 右侧滚动容器 ref */
  rightRef: React.RefObject<HTMLDivElement | null>;
  /** 当前同步源 */
  syncSource: React.MutableRefObject<ScrollSource | null>;
  /** 当前悬停的 blockId */
  hoveredBlockId: string | null;
  /** 当前点击高亮的 blockId */
  activeBlockId: string | null;
  onBlockHover: (blockId: string | null) => void;
  onBlockClick: (blockId: string) => void;
  /** 同步滚动核心函数 */
  syncScroll: (source: ScrollSource) => void;
}

export function useSyncScroll(): UseSyncScrollReturn {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const syncSource = useRef<ScrollSource | null>(null);
  const isSyncing = useRef(false);

  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // ---- 同步滚动 ----
  const syncScroll = useCallback(
    (source: ScrollSource) => {
      if (isSyncing.current) return;
      isSyncing.current = true;

      const leftEl = leftRef.current;
      const rightEl = rightRef.current;
      if (!leftEl || !rightEl) {
        isSyncing.current = false;
        return;
      }

      if (source === "left") {
        const ratio =
          leftEl.scrollTop / Math.max(leftEl.scrollHeight - leftEl.clientHeight, 1);
        rightEl.scrollTop =
          ratio * Math.max(rightEl.scrollHeight - rightEl.clientHeight, 1);
      } else {
        const ratio =
          rightEl.scrollTop / Math.max(rightEl.scrollHeight - rightEl.clientHeight, 1);
        leftEl.scrollTop =
          ratio * Math.max(leftEl.scrollHeight - leftEl.clientHeight, 1);
      }

      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    },
    []
  );

  // ---- 高亮联动 ----
  const onBlockHover = useCallback((blockId: string | null) => {
    setHoveredBlockId(blockId);
  }, []);

  const onBlockClick = useCallback((blockId: string) => {
    setActiveBlockId(blockId);
  }, []);

  return {
    leftRef,
    rightRef,
    syncSource,
    hoveredBlockId,
    activeBlockId,
    onBlockHover,
    onBlockClick,
    syncScroll,
  };
}
