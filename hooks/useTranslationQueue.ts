"use client";

// ============================================================
// useTranslationQueue — 翻译队列管理：段落级并发 + 流式更新
// ============================================================

import { useState, useCallback, useRef } from "react";
import type {
  PageContent,
  StructuredBlock,
  ApiConfig,
} from "@/types";
import { protectSingleBlock, restoreBlocks } from "@/services/structureProtector";
import { streamTranslate } from "@/services/llmClient";

interface UseTranslationQueueReturn {
  /** 翻译进度 0~1 */
  progress: number;
  /** 已翻译块数 */
  translatedCount: number;
  /** 总块数 */
  totalBlocks: number;
  /** 是否正在翻译 */
  isTranslating: boolean;
  /** 开始翻译 */
  startTranslation: (
    pages: PageContent[],
    apiConfig: ApiConfig,
    onPagesUpdate: (pages: PageContent[]) => void
  ) => void;
  /** 取消翻译 */
  cancelTranslation: () => void;
}

/**
 * useTranslationQueue
 *
 * 翻译策略：
 * - 以"段落"为单位发送给 LLM
 * - 每次并发 3 个段落请求（可调整）
 * - 每个段落流式接收，逐字更新到对应块的 translated 字段
 */
export function useTranslationQueue(): UseTranslationQueueReturn {
  const [progress, setProgress] = useState(0);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const blockMapRef = useRef<Map<string, StructuredBlock>>(new Map());

  const cancelTranslation = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsTranslating(false);
  }, []);

  const startTranslation = useCallback(
    async (
      pages: PageContent[],
      apiConfig: ApiConfig,
      onPagesUpdate: (pages: PageContent[]) => void
    ) => {
      // 收集所有待翻译的 block
      const allBlocks = pages.flatMap((p) => p.blocks);
      const pendingBlocks = allBlocks.filter(
        (b) => b.translationStatus === "pending" && b.type === "paragraph"
      );

      if (pendingBlocks.length === 0) return;

      setTotalBlocks(pendingBlocks.length);
      setTranslatedCount(0);
      setProgress(0);
      setIsTranslating(true);

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // 建立 block 索引以便快速更新
      blockMapRef.current.clear();
      for (const b of allBlocks) {
        blockMapRef.current.set(b.id, b);
      }

      // 并发控制：最多 3 个并行请求
      const CONCURRENCY = 3;
      const queue = [...pendingBlocks];
      let completedCount = 0;

      const updatePages = () => {
        // 深拷贝 pages 以触发 React 重渲染
        const updatedPages = pages.map((page) => ({
          ...page,
          blocks: page.blocks.map((b) => ({
            ...b,
            translated: blockMapRef.current.get(b.id)?.translated ?? b.translated,
            translationStatus:
              blockMapRef.current.get(b.id)?.translationStatus ??
              b.translationStatus,
          })),
        }));
        onPagesUpdate(updatedPages);
      };

      /**
       * 翻译单个 block
       */
      const translateOneBlock = async (
        block: StructuredBlock
      ): Promise<void> => {
        if (signal.aborted) return;

        // 标记为翻译中
        const stored = blockMapRef.current.get(block.id);
        if (stored) stored.translationStatus = "translating";
        updatePages();

        // 保护公式/图片
        const { protectedContent, protectMap } = protectSingleBlock(
          block.id,
          block.content
        );

        try {
          // 流式翻译（通过 Next.js 代理 API），返回完整译文
          const fullText = await streamTranslate(
            [{ id: block.id, content: protectedContent }],
            apiConfig,
            (_, text) => {
              if (signal.aborted) return;
              // 流式更新：实时显示翻译进度
              const restored = restoreBlocks(text, protectMap);
              const stored = blockMapRef.current.get(block.id);
              if (stored) stored.translated = restored;
              updatePages();
            },
            signal
          );

          // 翻译完成
          if (!signal.aborted) {
            const stored = blockMapRef.current.get(block.id);
            if (stored) {
              stored.translated = restoreBlocks(fullText, protectMap);
              stored.translationStatus = "done";
            }
          }
        } catch (err: any) {
          // 流式中断但有译文 → 算完成；完全没收到的才是真失败
          console.error(`翻译异常 (${block.id}):`, err);
          const stored = blockMapRef.current.get(block.id);
          if (stored) {
            stored.translationStatus = stored.translated ? "done" : "error";
          }
        }

        completedCount++;
        setTranslatedCount(completedCount);
        setProgress(completedCount / pendingBlocks.length);
        updatePages();
      };

      // ---- 并发执行队列 ----
      const workers: Promise<void>[] = [];
      let idx = 0;

      const worker = async () => {
        while (idx < queue.length && !signal.aborted) {
          const block = queue[idx++];
          await translateOneBlock(block);
        }
      };

      // 启动 CONCURRENCY 个 worker
      for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker());
      }

      await Promise.all(workers);
      setIsTranslating(false);
    },
    []
  );

  return {
    progress,
    translatedCount,
    totalBlocks,
    isTranslating,
    startTranslation,
    cancelTranslation,
  };
}
