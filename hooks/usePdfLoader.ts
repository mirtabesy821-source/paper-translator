"use client";

// ============================================================
// usePdfLoader — PDF 加载状态管理
// ============================================================

import { useState, useCallback } from "react";
import type { PageContent } from "@/types";

interface UsePdfLoaderReturn {
  /** PDF 各页内容 */
  pages: PageContent[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 总页数 */
  totalPages: number;
  /** 加载 PDF 文件 */
  loadFile: (file: File) => Promise<void>;
  /** 重置状态 */
  reset: () => void;
}

export function usePdfLoader(): UsePdfLoaderReturn {
  const [pages, setPages] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = pages.length;

  const loadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setPages([]);

    try {
      // 动态导入 pdfjs-dist（仅客户端可用）
      const { loadPdf } = await import("@/services/pdfParser");
      const extractedPages = await loadPdf(file);
      setPages(extractedPages);
    } catch (err: any) {
      console.error("PDF 加载失败:", err);
      setError(err.message || "PDF 解析失败，请确认文件未损坏");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPages([]);
    setError(null);
    setLoading(false);
  }, []);

  return {
    pages,
    loading,
    error,
    totalPages,
    loadFile,
    reset,
  };
}
