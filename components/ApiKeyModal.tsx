"use client";

// ============================================================
// ApiKeyModal — API 配置弹窗
// ============================================================
// 安全设计：不再收集 API Key。
// API Key 通过服务端 .env.local 环境变量配置。
// 用户只需指定 baseUrl 和 modelName。
// ============================================================

import { useState } from "react";
import type { ApiConfig } from "@/types";

interface ApiKeyModalProps {
  currentConfig: ApiConfig | null;
  onSave: (config: ApiConfig) => void;
  onClose: () => void;
}

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

const PLATFORM_PRESETS: { name: string; url: string; model: string }[] = [
  { name: "DeepSeek", url: "https://api.deepseek.com", model: "deepseek-chat" },
  { name: "OpenAI", url: "https://api.openai.com/v1", model: "gpt-4o" },
  { name: "OpenRouter", url: "https://openrouter.ai/api/v1", model: "openrouter/auto" },
  { name: "自定义", url: "", model: "" },
];

export default function ApiKeyModal({
  currentConfig,
  onSave,
  onClose,
}: ApiKeyModalProps) {
  const [baseUrl, setBaseUrl] = useState(
    currentConfig?.baseUrl ?? DEFAULT_BASE_URL
  );
  const [modelName, setModelName] = useState(
    currentConfig?.modelName ?? DEFAULT_MODEL
  );
  const [selectedPreset, setSelectedPreset] = useState(0);

  const handlePresetChange = (index: number) => {
    setSelectedPreset(index);
    const preset = PLATFORM_PRESETS[index];
    if (preset.url) setBaseUrl(preset.url);
    if (preset.model) setModelName(preset.model);
  };

  const handleSave = () => {
    onSave({
      baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
      modelName: modelName.trim() || DEFAULT_MODEL,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          ⚙️ API 配置
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
          配置大语言模型端点
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-5 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
          ⚠️ API Key 请在 <code className="font-mono text-xs">.env.local</code> 中配置
          <code className="font-mono text-xs"> DEEPSEEK_API_KEY</code> 环境变量
        </p>

        {/* 平台预设 */}
        <label className="block mb-3">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            平台
          </span>
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
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Base URL
          </span>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={DEFAULT_BASE_URL}
            className="w-full mt-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </label>

        {/* Model Name */}
        <label className="block mb-5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Model
          </span>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder={DEFAULT_MODEL}
            className="w-full mt-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </label>

        {/* 按钮 */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}