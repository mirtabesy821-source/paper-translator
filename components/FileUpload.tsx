"use client";

// ============================================================
// FileUpload — 拖拽上传 PDF 区域
// ============================================================

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type === "application/pdf") {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center
        w-full max-w-lg mx-auto p-10 border-2 border-dashed rounded-2xl
        transition-all duration-200 cursor-pointer select-none
        ${isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.02]"
          : "border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-500"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* 图标 */}
      <svg
        className={`w-14 h-14 mb-4 ${isDragging ? "text-blue-500" : "text-zinc-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>

      <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
        拖拽 PDF 文件到此处，或点击选择
      </p>
      <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
        支持学术论文 PDF（最大 50MB）
      </p>
    </div>
  );
}
