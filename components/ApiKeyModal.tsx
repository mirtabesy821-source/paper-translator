"use client";

// ============================================================
// ApiKeyModal — API 配置弹窗
// ============================================================

import { useState } from "react";
import type { ApiConfig } from "@/types";

interface ApiKeyModalProps {
  /** 当前配置（可能为 null） */
  currentConfig: ApiConfig | null;
  onSave: (config: ApiConfig) => void;
  onClose: () => void;
}

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

export default function ApiKeyModal({
  currentConfig,
  onSave,
  onClose,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey ?? "");
  const [baseUrl, setBaseUrl] = useState(
    currentConfig?.baseUrl ?? DEFAULT_BASE_URL
  );
  const [modelName, setModelName] = useState(
    currentConfig?.modelName ?? DEFAULT_MODEL
  );
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    onSave({
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
      modelName: modelName.trim() || DEFAULT_MODEL,
    });
    onClose();
  };

  const isValid = apiKey.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
        {/* 标题 */}
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          ⚙️ API 配置
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
          配置大语言模型 API（默认 DeepSeek，也兼容 OpenAI / OpenRouter 等平台）
        </p>

        {/* API Key */}
        <label className="block mb-3">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            API Key
          </span>
          <div className="relative mt-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 pr-10 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              title={showKey ? "隐藏" : "显示"}
            >
              {showKey ? "🙈" : "👁️"}
            </button>
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
          <p className="mt-1 text-xs text-zinc-400">
            DeepSeek: https://api.deepseek.com ｜ OpenAI: https://api.openai.com/v1
          </p>
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
            disabled={!isValid}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              isValid
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed"
            }`}
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
