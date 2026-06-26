"use client";

// ============================================================
// usePdfLoader — PDF 加载状态管理
// ============================================================

import { useState, useCallback } from "react";
import type { PageContent } from "@/types";
import { MAX_PDF_FILE_SIZE } from "@/lib/constants";

interface UsePdfLoaderReturn {
  pages: PageContent[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  loadFile: (file: File) => Promise<void>;
  reset: () => void;
}

export function usePdfLoader(): UsePdfLoaderReturn {
  const [pages, setPages] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = pages.length;

  const loadFile = useCallback(async (file: File) => {
    // 文件大小检查
    if (file.size > MAX_PDF_FILE_SIZE) {
      setError(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大支持 50MB`);
      return;
    }

    setLoading(true);
    setError(null);
    setPages([]);

    try {
      const { loadPdf } = await import("@/services/pdfParser");
      const extractedPages = await loadPdf(file);

      // 检测是否为扫描件（无文本提取出）
      const totalBlocks = extractedPages.reduce((sum, p) => sum + p.blocks.length, 0);
      if (totalBlocks === 0) {
        setError(
          "此 PDF 可能为扫描件（无可提取文本）。本工具仅支持原生文字型 PDF，不支持扫描件 OCR。"
        );
        setPages([]);
        setLoading(false);
        return;
      }

      setPages(extractedPages);
    } catch (err: any) {
      console.error("PDF 加载失败:", err);

      // 检测加密 PDF
      const errMsg = err?.message || "";
      if (errMsg.toLowerCase().includes("password") || err?.name === "PasswordException") {
        setError("此 PDF 已加密，需要密码才能打开。请先解除 PDF 密码保护。");
      } else {
        setError(errMsg || "PDF 解析失败，请确认文件未损坏");
      }
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