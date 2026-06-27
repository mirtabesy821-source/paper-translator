# Paper Translator — 学术论文双语对照翻译工具

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

> 一个基于 LLM 的学术论文双语对照翻译 Web 工具。  
> 上传 PDF，左侧展示原文渲染，右侧展示译文，公式（LaTeX）自动保护，支持同步滚动与流式翻译。
>
> A bilingual academic paper translation tool powered by LLM.  
> Upload a PDF — view the original on the left and the translation on the right.  
> LaTeX formulas are auto-protected, with synchronized scrolling and streaming translation.

---

## Features / 功能

- **📄 PDF 直接渲染** — 基于 PDF.js 将论文页面渲染为高质量 Canvas，保留原始排版
- **🔬 几何启发式段落提取** — 自动检测双栏布局，将碎片化文本重组为段落/标题/公式/表格
- **🤖 LLM 流式翻译** — 通过 SSE 代理调用 DeepSeek / OpenAI / 任意兼容 API，逐字符流式展示
- **🧮 公式完美保护** — LaTeX 公式自动识别并替换为占位符，翻译完成后无损还原
- **🔗 双向同步滚动** — 左右双栏联动滚动，点击任意一侧段落即可跳转到另一侧对应位置
- **🎯 段落级高亮联动** — 悬停/点击高亮在左右两侧同步显示
- **📊 翻译进度可视化** — 实时进度条、失败重试、批量并发翻译
- **🌙 深色模式支持** — 跟随系统主题自动切换
- **🔌 多 API 兼容** — DeepSeek、OpenAI、OpenRouter、自定义兼容端点均可
- **🏠 本地模型支持** — 一键切换 Ollama / vLLM / LM Studio 等本地部署模型，无需 API Key，数据不出本机
- **📖 术语词库** — 自定义专业术语映射，强制 LLM 遵循指定译法；支持导入/导出 JSON、localStorage 持久化、重复检测
- **📝 Markdown 导出** — 一键导出双语对照 Markdown 文件，公式还原为标准 LaTeX 格式

---

## Quick Start / 快速开始

### Prerequisites / 前置要求

- Node.js 18+
- npm / yarn / pnpm / bun
- An LLM API key (DeepSeek, OpenAI, or any OpenAI-compatible provider)

### Installation / 安装

```bash
# Clone the repository
git clone https://github.com/mirtabesy821-source/paper-translator.git
cd paper-translator

# Install dependencies
npm install
# or: yarn install / pnpm install / bun install
```

### Configuration / 配置

有两种方式配置 API：

**方式一：环境变量（推荐）**

将 `.env.local.example` 复制为 `.env.local`：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 填入你的 API Key：

```env
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

**方式二：页面 UI**

直接在应用界面中点击 ⚙️ API 按钮输入配置。配置会自动保存到 localStorage，刷新不丢失。

**方式三：本地模型（隐私优先）**

在 ⚙️ API 设置中开启「🏠 本地模型」Toggle，填入本地服务地址（默认 `http://localhost:11434/v1`），点击「拉取列表」获取可用模型。支持 Ollama / vLLM / LM Studio 等兼容 OpenAI API 的本地服务，无需 API Key，所有数据留在本机。

### Run / 启动

```bash
npm run dev
# or: yarn dev / pnpm dev / bun dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## Usage Guide / 使用指南

1. **上传 PDF** — 拖拽或点击选择学术 PDF 论文
2. **等待解析** — 页面自动逐页渲染左侧原文
3. **配置 API** — 首次使用需点击 ⚙️ API 输入 Key（或开启本地模型模式）
4. **术语词库**（可选） — 在 ⚙️ API → 📖 术语词库 Tab 中定义专业术语映射
5. **开始翻译** — 点击「开始翻译」按钮，右侧逐段呈现译文
6. **同步浏览** — 开启 🔗 同步 按钮，左右两侧滚动联动；点击段落可交叉跳转
7. **导出 Markdown** — 点击 📝 导出 按钮，下载双语对照 Markdown 文件（公式还原为 LaTeX）

---

## Architecture / 架构

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                  │
│  ┌──────────────┐    ┌──────────────┐              │
│  │  PdfCanvas   │    │TranslPanel   │              │
│  │  (原文)       │    │  (译文)       │              │
│  └──────┬───────┘    └──────┬───────┘              │
│         │                   │                       │
│         ▼                   ▼                       │
│  ┌──────────────────────────────────────────────┐   │
│  │           useSyncScroll (双栏联动)              │   │
│  │           useTranslationQueue (翻译队列)         │   │
│  │           usePdfLoader (PDF 加载)              │   │
│  └──────────────────────────────────────────────┘   │
│         │                                            │
│         ▼                                            │
│  ┌────────────────────────────┐                      │
│  │  Services                  │                      │
│  │  ├─ pdfParser.ts          │                      │
│  │  ├─ llmClient.ts          │                      │
│  │  └─ structureProtector.ts │                      │
│  └─────────┬──────────────────┘                      │
└────────────┼──────────────────────────────────────────┘
             │ POST /api/translate  (SSE stream)
             ▼
┌──────────────────────────────────────────────┐
│        Next.js Server (Route Handler)        │
│  ┌──────────────────────────────────────┐    │
│  │  /api/translate/route.ts            │    │
│  │  → 接收 blocks，转发到 LLM API      │    │
│  │  → SSE 流式响应回浏览器              │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
             │ HTTP POST (stream: true)
             ▼
┌──────────────────────────────────────┐
│     LLM API (DeepSeek / OpenAI)      │
└──────────────────────────────────────┘
```

### Key Components / 核心组件

| Component | Responsibility |
|-----------|---------------|
| `pdfParser.ts` | 使用 PDF.js 提取文本，几何启发式段落重组，多栏检测 |
| `structureProtector.ts` | 识别并保护 LaTeX 公式、代码块、图片等特殊内容 |
| `llmClient.ts` | 流式调用 LLM API（客户端 → 代理 → LLM），传递 localModel 标记 |
| `exportMarkdown.ts` | 遍历 PageContent[] 生成双语对照 Markdown，公式还原为标准 LaTeX |
| `useTranslationQueue.ts` | 翻译队列管理：分批、并发、重试、进度追踪 |
| `useSyncScroll.ts` | 左右双栏滚动同步与高亮联动 |
| `PdfCanvas.tsx` | 左侧 PDF Canvas 渲染 + 透明 textLayer 覆盖层 |
| `TranslationPanel.tsx` | 右侧译文面板，逐页展示 |
| `BlockView.tsx` | 单个段落块的渲染（支持 KaTeX 公式渲染） |
| `SettingsModal.tsx` | API 配置 + 本地模型 Toggle + 术语词库（导入/导出/重复检测） |
| `/api/translate/route.ts` | LLM 代理 API (SSE)，本地模式跳过 Key 检查 + 超时控制 |
| `/api/local-models/route.ts` | 本地模型列表代理，避免 CORS，SSRF 防护 |

### Translation Pipeline / 翻译流水线

```
PDF → loadPdf() → TextItems → 几何合并 → StructuredBlock[]
                                                      ↓
                                            protectBlocks()
                                                      ↓
                                            LLM (batch of 6, concurrency 2)
                                                      ↓
                                            splitTranslatedBlocks()
                                                      ↓
                                            restoreBlocks()
                                                      ↓
                                            更新 PageContent[]
```

---

## Tech Stack / 技术栈

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript 5
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **PDF**: [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) 5.x
- **Math**: [KaTeX](https://katex.org/) 0.17
- **LLM**: OpenAI-compatible API (DeepSeek / OpenAI / OpenRouter / Ollama / vLLM / LM Studio)

---

## Project Structure / 项目结构

```
paper-translator/
├── app/
│   ├── api/
│   │   ├── translate/route.ts     # LLM 代理 API (SSE)，本地模式支持
│   │   └── local-models/route.ts  # 本地模型列表代理（避免 CORS）
│   ├── favicon.ico
│   ├── globals.css                # 全局样式 + 自定义滚动条
│   ├── layout.tsx                 # 根布局
│   └── page.tsx                   # 主页
├── components/
│   ├── BlockView.tsx              # 译文块渲染
│   ├── FileUpload.tsx             # PDF 拖拽上传
│   ├── PdfCanvas.tsx              # 左侧 PDF Canvas
│   ├── ProgressBar.tsx            # 翻译进度条
│   ├── SettingsModal.tsx          # API 配置 + 本地模型 + 术语词库
│   └── TranslationPanel.tsx       # 右侧译文面板
├── hooks/
│   ├── usePdfLoader.ts            # PDF 加载状态管理
│   ├── useSyncScroll.ts           # 双栏同步滚动
│   └── useTranslationQueue.ts     # 翻译队列
├── lib/
│   ├── constants.ts               # 可调阈值常量
│   └── prompts.ts                 # LLM System Prompt
├── services/
│   ├── canvasUtils.ts             # Canvas → Blob URL 转换
│   ├── exportMarkdown.ts          # 双语 Markdown 导出
│   ├── llmClient.ts               # LLM 调用客户端
│   ├── pdfParser.ts               # PDF 解析 + 段落重组
│   └── structureProtector.ts      # 公式/代码保护
├── types/
│   ├── api.ts                     # API 配置与请求类型
│   ├── index.ts                   # 类型导出
│   └── pdf.ts                     # PDF 文本块类型
├── public/
│   └── pdf.worker.min.mjs         # PDF.js Web Worker
├── start.bat                      # Windows 快捷启动
└── package.json
```

---

## FAQ

**Q: 为什么翻译结果乱码或公式丢失？**  
A: 请确认使用的 LLM 模型遵循保护规则（保留 ⟨PROTECT_...⟩ 占位符）。如果反复出现，尝试使用更强的模型。

**Q: 支持哪些 PDF？**  
A: 学术论文 PDF 效果最佳。扫描件（纯图片 PDF）不支持文本提取。

**Q: 能否部署在 Vercel 上？**  
A: 可以，但注意 Vercel Serverless Function 有 10s 超时限制，大型 PDF 可能超时。建议使用 Node.js 服务器部署。本地模型模式不支持 Vercel 部署（无法访问 localhost）。

**Q: API Key 安全吗？**  
A: 通过环境变量配置的 API Key 存在服务端，不会暴露给浏览器。通过 UI 输入的配置（baseUrl、modelName、glossary）保存在浏览器 localStorage 中，不包含 API Key。

**Q: 如何使用本地模型？**  
A: 在 ⚙️ API 设置中开启「🏠 本地模型」Toggle，确保 Ollama 等服务已启动（如 `ollama serve`），填入 Base URL（默认 `http://localhost:11434/v1`），点击「拉取列表」选择模型即可。翻译请求通过 Next.js 服务端转发，无跨域问题。

**Q: 术语词库怎么用？**  
A: 在 ⚙️ API → 📖 术语词库 Tab 中，每行输入一条映射（格式：`原文 → 译文`）。翻译时这些映射会作为强制规则注入 LLM 的 system prompt。支持导入/导出 JSON 文件，配置自动保存到 localStorage。

**Q: 导出的 Markdown 格式是怎样的？**  
A: 每个段落块交替输出原文和译文，标题转为 `##`，公式还原为 `$$...$$` 标准格式，表格转为 Markdown 表格语法。可直接在 Obsidian、VS Code 等支持 LaTeX 的编辑器中阅读。

---

## Contributing / 贡献

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License / 许可证

[MIT](LICENSE) © 2024-2025