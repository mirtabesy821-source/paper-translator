"use client";

// ============================================================
// useTranslationQueue — 翻译队列管理：批次并发 + 流式更新 + 自动重试
// ============================================================

import { useState, useCallback, useRef } from "react";
import type {
  PageContent,
  StructuredBlock,
  ApiConfig,
} from "@/types";
import {
  protectBlocks,
  restoreBlocks,
  splitTranslatedBlocks,
  resetProtectCounter,
} from "@/services/structureProtector";
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
  /** 重试所有失败的块 */
  retryFailedBlocks: () => void;
}

const BATCH_SIZE = 6;   // 每批发送的段落数
const CONCURRENCY = 2;  // 并行批次数
const MAX_RETRIES = 2;  // 每批最大重试次数

/**
 * useTranslationQueue
 *
 * 翻译策略：
 * - 将段落按 BATCH_SIZE 分批，每批用 protectBlocks 拼接后一起发送
 * - LLM 能利用批内上下文提升术语一致性和质量
 * - splitTranslatedBlocks 将 LLM 响应拆分回各块
 * - 每批最多重试 MAX_RETRIES 次，指数退避（1s, 2s）
 * - CONCURRENCY 个 worker 并行处理批次
 */
export function useTranslationQueue(): UseTranslationQueueReturn {
  const [progress, setProgress] = useState(0);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const blockMapRef = useRef<Map<string, StructuredBlock>>(new Map());
  const pagesRef = useRef<PageContent[]>([]);
  const onPagesUpdateRef = useRef<((pages: PageContent[]) => void) | null>(null);
  const apiConfigRef = useRef<ApiConfig>({} as ApiConfig);

  // ---- 取消翻译 ----
  const cancelTranslation = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsTranslating(false);
  }, []);

  // ---- 生成更新后的 pages（用于触发 React 重渲染） ----
  const buildUpdatedPages = useCallback(
    (pages: PageContent[]): PageContent[] => {
      return pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((b) => ({
          ...b,
          translated: blockMapRef.current.get(b.id)?.translated ?? b.translated,
          translationStatus:
            blockMapRef.current.get(b.id)?.translationStatus ??
            b.translationStatus,
        })),
      }));
    },
    []
  );

  // ---- 开始翻译 ----
  const startTranslation = useCallback(
    async (
      pages: PageContent[],
      apiConfig: ApiConfig,
      onPagesUpdate: (pages: PageContent[]) => void
    ) => {
      // 存储引用，供 retryFailedBlocks 使用
      pagesRef.current = pages;
      onPagesUpdateRef.current = onPagesUpdate;
      apiConfigRef.current = apiConfig;

      // 重置计数器
      resetProtectCounter();

      // 收集所有待翻译的块（翻译文本类型，排除公式和图片）
      const allBlocks = pages.flatMap((p) => p.blocks);
      const pendingBlocks = allBlocks.filter(
        (b) =>
          b.translationStatus === "pending" &&
          b.type !== "equation" &&
          b.type !== "image"
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

      // ---- 批处理 ----
      const batches: StructuredBlock[][] = [];
      for (let i = 0; i < pendingBlocks.length; i += BATCH_SIZE) {
        batches.push(pendingBlocks.slice(i, i + BATCH_SIZE));
      }

      let completedCount = 0;

      const updatePages = () => {
        onPagesUpdate(buildUpdatedPages(pages));
      };

      /**
       * 翻译一个批次：将多个 block 拼接后一起发送给 LLM
       */
      const translateBatch = async (batch: StructuredBlock[]): Promise<void> => {
        if (signal.aborted) return;

        // 标记整批为翻译中
        for (const block of batch) {
          const stored = blockMapRef.current.get(block.id);
          if (stored) stored.translationStatus = "translating";
        }
        updatePages();

        // 保护所有块（拼接为 <!--BLOCK:id--> + <!--SEPARATOR--> 格式）
        const { protectedContent, protectMap } = protectBlocks(batch);

        let attempt = 0;

        while (attempt <= MAX_RETRIES) {
          if (signal.aborted) return;

          try {
            const fullText = await streamTranslate(
              [{ id: batch[0].id, content: protectedContent }],
              apiConfig,
              () => {
                // 批次模式下不做逐字流式更新，避免频繁重渲染
              },
              signal
            );

            if (!signal.aborted) {
              // 拆分 LLM 响应回各块
              const results = splitTranslatedBlocks(fullText);
              const foundIds = new Set(results.map((r) => r.blockId));

              for (const { blockId, content } of results) {
                const stored = blockMapRef.current.get(blockId);
                if (stored) {
                  stored.translated = restoreBlocks(content, protectMap);
                  stored.translationStatus = "done";
                }
              }

              // 兜底：LLM 未返回的块保留原文
              for (const block of batch) {
                const stored = blockMapRef.current.get(block.id);
                if (stored && stored.translationStatus === "translating") {
                  stored.translated = stored.content;
                  stored.translationStatus = "done";
                }
              }
            }
            return; // 成功，退出重试循环
          } catch (err: any) {
            attempt++;
            if (attempt <= MAX_RETRIES && !signal.aborted) {
              // 指数退避：1s, 2s
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
          }
        }

        // 重试耗尽 → 标记为 error
        for (const block of batch) {
          const stored = blockMapRef.current.get(block.id);
          if (stored && stored.translationStatus === "translating") {
            stored.translationStatus = "error";
          }
        }
      };

      // ---- 并发 worker ----
      const workers: Promise<void>[] = [];
      let batchIdx = 0;

      const batchWorker = async () => {
        while (batchIdx < batches.length && !signal.aborted) {
          const batch = batches[batchIdx++];
          await translateBatch(batch);
          completedCount += batch.length;
          setTranslatedCount(completedCount);
          setProgress(completedCount / pendingBlocks.length);
          updatePages();
        }
      };

      for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(batchWorker());
      }

      await Promise.all(workers);
      setIsTranslating(false);
    },
    [buildUpdatedPages]
  );

  // ---- 重试失败的块 ----
  const retryFailedBlocks = useCallback(() => {
    const pages = pagesRef.current;
    const onPagesUpdate = onPagesUpdateRef.current;
    if (!pages || !onPagesUpdate) return;

    // 将有 error 状态的块重置为 pending
    const resetPages = pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) => ({
        ...b,
        translationStatus:
          b.translationStatus === "error"
            ? ("pending" as const)
            : b.translationStatus,
        translated: b.translationStatus === "error" ? "" : b.translated,
      })),
    }));

    onPagesUpdate(resetPages);
    // 重新触发翻译
    startTranslation(resetPages, apiConfigRef.current, onPagesUpdate);
  }, [startTranslation]);

  return {
    progress,
    translatedCount,
    totalBlocks,
    isTranslating,
    startTranslation,
    cancelTranslation,
    retryFailedBlocks,
  };
}
