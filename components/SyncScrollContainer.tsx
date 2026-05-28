"use client";

// ============================================================
// SyncScrollContainer — 双栏同步滚动容器
// ============================================================

import { useRef, useEffect, useCallback, type ReactNode } from "react";
import type { ScrollSource } from "@/types";

interface SyncScrollContainerProps {
  children: [ReactNode, ReactNode]; // [left, right]
  leftRef: React.RefObject<HTMLDivElement | null>;
  rightRef: React.RefObject<HTMLDivElement | null>;
  /** 当前同步源（谁在主动滚动） */
  syncSource: React.MutableRefObject<ScrollSource | null>;
}

/**
 * SyncScrollContainer — 实现左右两侧的同步滚动。
 *
 * 策略：
 * - 监听 scroll 事件
 * - 如果 scrollSource 是 "left"，则按比例同步右侧
 * - 如果 scrollSource 是 "right"，则按比例同步左侧
 * - 使用 isSyncing 标志防止递归触发
 */
export default function SyncScrollContainer({
  children,
  leftRef,
  rightRef,
  syncSource,
}: SyncScrollContainerProps) {
  const isSyncing = useRef(false);

  // ---- 同步滚动核心逻辑 ----
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
        // 左侧主动滚动 → 按比例同步右侧
        const ratio =
          leftEl.scrollTop / (leftEl.scrollHeight - leftEl.clientHeight);
        rightEl.scrollTop =
          ratio * (rightEl.scrollHeight - rightEl.clientHeight);
      } else {
        // 右侧主动滚动 → 按比例同步左侧
        const ratio =
          rightEl.scrollTop / (rightEl.scrollHeight - rightEl.clientHeight);
        leftEl.scrollTop =
          ratio * (leftEl.scrollHeight - leftEl.clientHeight);
      }

      // 使用 requestAnimationFrame 在重绘后重置标志位
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    },
    [leftRef, rightRef]
  );

  // ---- 绑定滚动事件（通过事件委托方式手动绑定，因为 children 是动态渲染的） ----
  useEffect(() => {
    const leftEl = leftRef.current;
    const rightEl = rightRef.current;

    const onLeftScroll = () => {
      syncSource.current = "left";
      syncScroll("left");
    };
    const onRightScroll = () => {
      syncSource.current = "right";
      syncScroll("right");
    };

    leftEl?.addEventListener("scroll", onLeftScroll, { passive: true });
    rightEl?.addEventListener("scroll", onRightScroll, { passive: true });

    return () => {
      leftEl?.removeEventListener("scroll", onLeftScroll);
      rightEl?.removeEventListener("scroll", onRightScroll);
    };
  }, [leftRef, rightRef, syncSource, syncScroll]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 左侧：PDF 原文 */}
      <div className="w-1/2 flex flex-col border-r border-zinc-300 dark:border-zinc-600">
        {children[0]}
      </div>
      {/* 右侧：译文 */}
      <div className="w-1/2 flex flex-col">
        {children[1]}
      </div>
    </div>
  );
}
