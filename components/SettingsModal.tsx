"use client";

// ============================================================
// SettingsModal — API 配置 + 专业术语词库（Glossary）
// ============================================================

import { useState, useMemo, useRef, type ChangeEvent } from "react";
import type { ApiConfig, GlossaryEntry } from "@/types";

interface SettingsModalProps {
  currentConfig: ApiConfig | null;
  onSave: (config: ApiConfig) => void;
  onClose: () => void;
}

type Tab = "api" | "glossary";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

const PLATFORM_PRESETS: { name: string; url: string; model: string }[] = [
  { name: "DeepSeek", url: "https://api.deepseek.com", model: "deepseek-chat" },
  { name: "OpenAI", url: "https://api.openai.com/v1", model: "gpt-4o" },
  { name: "OpenRouter", url: "https://openrouter.ai/api/v1", model: "openrouter/auto" },
  { name: "自定义", url: "", model: "" },
];

/** Parse plain-text glossary like "term1 -> trans1\nterm2 -> trans2" */
function parseGlossaryText(text: string): GlossaryEntry[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("->") || line.includes("→"))
    .map((line) => {
      const parts = line.split(/->|→/);
      return {
        source: parts[0]?.trim() || "",
        target: parts[1]?.trim() || "",
      };
    })
    .filter((e) => e.source && e.target);
}

/** Format GlossaryEntry[] to plain text */
function formatGlossaryText(entries: GlossaryEntry[]): string {
  return entries.map((e) => `${e.source} → ${e.target}`).join("\n");
}

export default function SettingsModal({
  currentConfig,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("api");

  // API config fields
  const [baseUrl, setBaseUrl] = useState(
    currentConfig?.baseUrl ?? DEFAULT_BASE_URL
  );
  const [modelName, setModelName] = useState(
    currentConfig?.modelName ?? DEFAULT_MODEL
  );
  const [selectedPreset, setSelectedPreset] = useState(0);

  // Glossary fields
  const [glossaryText, setGlossaryText] = useState(
    currentConfig?.glossary ? formatGlossaryText(currentConfig.glossary) : ""
  );

  // ---- 导入/导出 ----
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const entries = parseGlossaryText(glossaryText);
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glossary.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        // 尝试 JSON 格式
        const entries: unknown = JSON.parse(text);
        if (Array.isArray(entries)) {
          setGlossaryText(
            formatGlossaryText(
              entries.filter(
                (item): item is GlossaryEntry =>
                  typeof item === "object" &&
                  item !== null &&
                  "source" in item &&
                  "target" in item
              )
            )
          );
          return;
        }
      } catch {
        // 非 JSON，按纯文本格式加载
        setGlossaryText(text);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // 允许重复导入同一文件
  };

  // ---- 重复术语检测 ----
  const duplicateTerms = useMemo(() => {
    const entries = parseGlossaryText(glossaryText);
    const seen = new Map<string, number>();
    const dupes: string[] = [];
    for (const entry of entries) {
      const key = entry.source.toLowerCase();
      const count = (seen.get(key) || 0) + 1;
      seen.set(key, count);
      if (count === 2) dupes.push(entry.source);
    }
    return dupes;
  }, [glossaryText]);

  const handlePresetChange = (index: number) => {
    setSelectedPreset(index);
    const preset = PLATFORM_PRESETS[index];
    if (preset.url) setBaseUrl(preset.url);
    if (preset.model) setModelName(preset.model);
  };

  const handleSave = () => {
    const glossary = parseGlossaryText(glossaryText);
    onSave({
      baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
      modelName: modelName.trim() || DEFAULT_MODEL,
      ...(glossary.length > 0 ? { glossary } : {}),
    });
    onClose();
  };

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      activeTab === tab
        ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg p-0 mx-4 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 pt-2">
          <button onClick={() => setActiveTab("api")} className={tabClass("api")}>
            ⚙️ API 配置
          </button>
          <button onClick={() => setActiveTab("glossary")} className={tabClass("glossary")}>
            📖 术语词库
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* ============ API Tab ============ */}
          {activeTab === "api" && (
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                ⚠️ API Key 请在 <code className="font-mono text-xs">.env.local</code> 中配置
                <code className="font-mono text-xs"> DEEPSEEK_API_KEY</code>
              </p>

              {/* Platform presets */}
              <label className="block mb-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">平台</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {PLATFORM_PRESETS.map((p, i) => (
                    <button
                      key={p.name}
                      onClick={() => handlePresetChange(i)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        selectedPreset === i
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </label>

              {/* Base URL */}
              <label className="block mb-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Base URL</span>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={DEFAULT_BASE_URL}
                  className="w-full mt-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </label>

              {/* Model Name */}
              <label className="block mb-0">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Model</span>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={DEFAULT_MODEL}
                  className="w-full mt-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </label>
            </div>
          )}

          {/* ============ Glossary Tab ============ */}
          {activeTab === "glossary" && (
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                定义专业术语的固定译法，每行一个映射
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
                格式：<code className="font-mono text-xs">原文 → 译文</code>，用 {"->"} 或 {"→"} 分隔
              </p>

              <textarea
                value={glossaryText}
                onChange={(e) => setGlossaryText(e.target.value)}
                placeholder={"Laplace variable → p\ndiffraction order → j\nconvolution → 卷积\neigenvalue → 特征值"}
                rows={10}
                className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />

              {/* 重复术语警告 */}
              {duplicateTerms.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-1.5">
                  ⚠️ 检测到重复术语：{duplicateTerms.join("、")}
                </p>
              )}

              {/* 隐藏的文件导入 input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt"
                onChange={handleImportFile}
                className="hidden"
              />

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {parseGlossaryText(glossaryText).length} 条术语映射
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={handleImportClick}
                    className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    📥 导入
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={parseGlossaryText(glossaryText).length === 0}
                    className="text-xs text-blue-500 hover:text-blue-600 transition-colors disabled:text-zinc-300 dark:disabled:text-zinc-600 disabled:cursor-not-allowed"
                  >
                    📤 导出
                  </button>
                  <button
                    onClick={() => setGlossaryText("")}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    清空
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end px-5 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}