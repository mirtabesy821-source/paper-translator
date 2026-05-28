"use client";

// ============================================================
// ProgressBar — 翻译进度条
// ============================================================

interface ProgressBarProps {
  /** 进度 0~1 */
  progress: number;
  /** 已翻译块数 */
  translatedCount: number;
  /** 总块数 */
  totalCount: number;
  /** 是否正在翻译 */
  isTranslating: boolean;
}

export default function ProgressBar({
  progress,
  translatedCount,
  totalCount,
  isTranslating,
}: ProgressBarProps) {
  const pct = Math.round(progress * 100);

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* 进度条 */}
      <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isTranslating
              ? "bg-blue-500 animate-pulse"
              : pct === 100
                ? "bg-green-500"
                : "bg-blue-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 文字 */}
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap tabular-nums min-w-[80px] text-right">
        {isTranslating ? (
          <span className="text-blue-500">🔄 {pct}%</span>
        ) : pct === 100 ? (
          <span className="text-green-500">✅ 完成</span>
        ) : (
          <span>
            {translatedCount}/{totalCount}
          </span>
        )}
      </span>
    </div>
  );
}
