"use client";

// ============================================================
// 主页面 — 学术论文双语对照翻译
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import FileUpload from "@/components/FileUpload";
import PdfCanvas from "@/components/PdfCanvas";
import type { PdfCanvasHandle } from "@/components/PdfCanvas";
import TranslationPanel from "@/components/TranslationPanel";
import type { TranslationPanelHandle } from "@/components/TranslationPanel";
import ProgressBar from "@/components/ProgressBar";
import SettingsModal from "@/components/SettingsModal";
import { usePdfLoader } from "@/hooks/usePdfLoader";
import { useSyncScroll } from "@/hooks/useSyncScroll";
import { useTranslationQueue } from "@/hooks/useTranslationQueue";
import type { ApiConfig, PageContent } from "@/types";

export default function Home() {
  // ---- PDF 加载 ----
  const { pages, loading, error, loadFile, reset, totalPages } = usePdfLoader();

  // ---- 同步滚动 & 高亮联动 ----
  const {
    leftRef,
    rightRef,
    syncScroll,
    hoveredBlockId,
    activeBlockId,
    onBlockHover,
    onBlockClick,
  } = useSyncScroll();

  // ---- 翻译队列 ----
  const {
    progress,
    translatedCount,
    totalBlocks,
    isTranslating,
    startTranslation,
    cancelTranslation,
    retryFailedBlocks,
  } = useTranslationQueue();

  // ---- UI 状态 ----
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("paper-translator-api-config");
      return saved ? (JSON.parse(saved) as ApiConfig) : null;
    } catch {
      return null;
    }
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [syncEnabled, setSyncEnabled] = useState(false);

  // ---- Refs ----
  const pdfCanvasRef = useRef<PdfCanvasHandle>(null);
  const translationPanelRef = useRef<TranslationPanelHandle>(null);

  // 内部 pages 状态（用于翻译更新）
  const [pagesState, setPagesState] = useState<PageContent[]>([]);

  // ---- 同步滚动（仅 syncEnabled 时生效） ----
  const displayPages = pagesState.length > 0 ? pagesState : pages;

  // ---- 持久化 API 配置（含 glossary）到 localStorage ----
  useEffect(() => {
    try {
      if (apiConfig) {
        localStorage.setItem("paper-translator-api-config", JSON.stringify(apiConfig));
      } else {
        localStorage.removeItem("paper-translator-api-config");
      }
    } catch {
      // localStorage 不可用时静默失败
    }
  }, [apiConfig]);

  useEffect(() => {
    if (!syncEnabled) return;

    const leftEl = leftRef.current;
    const rightEl = rightRef.current;
    if (!leftEl || !rightEl) return;

    const handleLeftScroll = () => syncScroll("left");
    const handleRightScroll = () => syncScroll("right");

    leftEl.addEventListener("scroll", handleLeftScroll, { passive: true });
    rightEl.addEventListener("scroll", handleRightScroll, { passive: true });

    return () => {
      leftEl.removeEventListener("scroll", handleLeftScroll);
      rightEl.removeEventListener("scroll", handleRightScroll);
    };
  }, [syncEnabled, leftRef, rightRef, syncScroll]);

  // ---- 文件上传 ----
  const handleFileSelect = useCallback(
    async (file: File) => {
      await loadFile(file);
    },
    [loadFile]
  );

  const handlePagesUpdate = useCallback((updatedPages: PageContent[]) => {
    setPagesState(updatedPages);
  }, []);

  // ---- 页面可见性 ----
  const handleLeftPageVisible = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
  }, []);

  const handleRightPageVisible = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
  }, []);

  // ---- 双向点击跳转：点击任一侧 → 另一侧滚动到对应段落 ----
  const handleLeftBlockClick = useCallback(
    (blockId: string) => {
      onBlockClick(blockId);
      translationPanelRef.current?.scrollToBlock(blockId);
    },
    [onBlockClick]
  );

  const handleRightBlockClick = useCallback(
    (blockId: string) => {
      onBlockClick(blockId);
      pdfCanvasRef.current?.scrollToBlock(blockId);
    },
    [onBlockClick]
  );

  // ---- 开始翻译 ----
  const handleStartTranslation = useCallback(() => {
    const targetPages = pagesState.length > 0 ? pagesState : pages;
    if (targetPages.length === 0) return;

    if (pagesState.length === 0) {
      setPagesState(JSON.parse(JSON.stringify(pages)));
    }

    const currentPages = pagesState.length > 0 ? pagesState : pages;
    // apiConfig 可为空 — 服务端 /api/translate 会从 .env.local 读取 Key
    startTranslation(currentPages, (apiConfig || { baseUrl: '', modelName: '' }), handlePagesUpdate);
  }, [apiConfig, pages, pagesState, startTranslation, handlePagesUpdate]);

  // ---- 渲染：空状态 ----
  if (pages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            📄 学术论文双语翻译
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
            上传 PDF 论文，左侧原文右侧译文，公式排版完美保留，支持流式翻译
          </p>
        </div>

        <FileUpload onFileSelect={handleFileSelect} disabled={loading} />

        {error && (
          <div className="mt-6 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm max-w-lg">
            {error}
          </div>
        )}

        <button
          onClick={() => setShowSettingsModal(true)}
          className="mt-8 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-2"
        >
          ⚙️ 配置 API
        </button>

        {showSettingsModal && (
          <SettingsModal
            currentConfig={apiConfig}
            onSave={setApiConfig}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </div>
    );
  }

  // ---- 加载中 ----
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">
            正在解析 PDF，请稍候...
          </p>
        </div>
      </div>
    );
  }

  // ---- 主视图：双栏对照 ----
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950">
      {/* 顶部工具栏 */}
      <header className="flex items-center gap-4 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0">
        <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mr-2 whitespace-nowrap">
          📄 论文翻译
        </h1>

        <div className="flex-1 max-w-md">
          <ProgressBar
            progress={progress}
            translatedCount={translatedCount}
            totalCount={
              totalBlocks ||
              displayPages.flatMap((p) => p.blocks).length
            }
            isTranslating={isTranslating}
          />
        </div>

        <div className="flex items-center gap-2">
          {!isTranslating ? (
            <button
              onClick={handleStartTranslation}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              title="开始翻译"
            >
              开始翻译
            </button>
          ) : (
            <button
              onClick={cancelTranslation}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              取消
            </button>
          )}

          {!isTranslating &&
            displayPages.flatMap((p) => p.blocks).filter((b) => b.translationStatus === "error").length > 0 && (
              <button
                onClick={retryFailedBlocks}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                title="重试失败的段落"
              >
                🔄 重试 (
                {
                  displayPages
                    .flatMap((p) => p.blocks)
                    .filter((b) => b.translationStatus === "error").length
                }
                )
              </button>
          )}

          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            ⚙️ API
          </button>

          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            📂 重新上传
          </button>

          <button
            onClick={() => setSyncEnabled(!syncEnabled)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              syncEnabled
                ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                : "border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
            title={syncEnabled ? "关闭同步滚动" : "开启同步滚动"}
          >
            {syncEnabled ? "🔗 同步中" : "🔓 同步"}
          </button>

          <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2 whitespace-nowrap">
            {currentPage} / {totalPages}
          </span>
        </div>
      </header>

      {/* 主内容区：双栏 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：PDF Canvas */}
        <div className="w-1/2 flex flex-col border-r border-zinc-300 dark:border-zinc-600">
          <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              原文 (Original)
            </span>
          </div>
          <PdfCanvas
            ref={pdfCanvasRef}
            pages={displayPages}
            currentPage={currentPage}
            hoveredBlockId={hoveredBlockId}
            activeBlockId={activeBlockId}
            onBlockHover={onBlockHover}
            onBlockClick={handleLeftBlockClick}
            onPageVisible={handleLeftPageVisible}
            syncScrollRef={leftRef}
          />
        </div>

        {/* 右侧：译文 */}
        <div className="w-1/2 flex flex-col">
          <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              译文 (Translation)
            </span>
          </div>
          <TranslationPanel
            ref={translationPanelRef}
            pages={displayPages}
            currentPage={currentPage}
            hoveredBlockId={hoveredBlockId}
            activeBlockId={activeBlockId}
            onBlockHover={onBlockHover}
            onBlockClick={handleRightBlockClick}
            onPageVisible={handleRightPageVisible}
            syncScrollRef={rightRef}
          />
        </div>
      </div>

      {/* API 配置弹窗 */}
      {showSettingsModal && (
        <SettingsModal
          currentConfig={apiConfig}
          onSave={(cfg) => {
            setApiConfig(cfg);
            setShowSettingsModal(false);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}
