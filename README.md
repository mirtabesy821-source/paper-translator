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

直接在应用界面中点击 ⚙️ API 按钮输入配置。

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
3. **配置 API** — 首次使用需点击 ⚙️ API 输入 Key
4. **开始翻译** — 点击「开始翻译」按钮，右侧逐段呈现译文
5. **同步浏览** — 开启 🔗 同步 按钮，左右两侧滚动联动；点击段落可交叉跳转

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
| `llmClient.ts` | 流式调用 LLM API（客户端 → 代理 → LLM） |
| `useTranslationQueue.ts` | 翻译队列管理：分批、并发、重试、进度追踪 |
| `useSyncScroll.ts` | 左右双栏滚动同步与高亮联动 |
| `PdfCanvas.tsx` | 左侧 PDF Canvas 渲染 + 透明 textLayer 覆盖层 |
| `TranslationPanel.tsx` | 右侧译文面板，逐页展示 |
| `BlockView.tsx` | 单个段落块的渲染（支持 KaTeX 公式渲染） |

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
- **LLM**: OpenAI-compatible API (DeepSeek / OpenAI / OpenRouter)

---

## Project Structure / 项目结构

```
paper-translator/
├── app/
│   ├── api/translate/route.ts    # LLM 代理 API (SSE)
│   ├── favicon.ico
│   ├── globals.css               # 全局样式 + 自定义滚动条
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 主页
├── components/
│   ├── ApiKeyModal.tsx           # API 配置弹窗
│   ├── BlockView.tsx             # 译文块渲染
│   ├── FileUpload.tsx            # PDF 拖拽上传
│   ├── PdfCanvas.tsx             # 左侧 PDF Canvas
│   ├── ProgressBar.tsx           # 翻译进度条
│   └── TranslationPanel.tsx      # 右侧译文面板
├── hooks/
│   ├── usePdfLoader.ts           # PDF 加载状态管理
│   ├── useSyncScroll.ts          # 双栏同步滚动
│   └── useTranslationQueue.ts    # 翻译队列
├── services/
│   ├── llmClient.ts              # LLM 调用客户端
│   ├── pdfParser.ts              # PDF 解析 + 段落重组
│   └── structureProtector.ts     # 公式/代码保护
├── types/
│   └── index.ts                  # TypeScript 类型定义
├── public/
│   └── pdf.worker.min.mjs        # PDF.js Web Worker
└── 启动论文翻译.bat               # Windows 快捷启动
```

---

## FAQ

**Q: 为什么翻译结果乱码或公式丢失？**  
A: 请确认使用的 LLM 模型遵循保护规则（保留 ⟨PROTECT_...⟩ 占位符）。如果反复出现，尝试使用更强的模型。

**Q: 支持哪些 PDF？**  
A: 学术论文 PDF 效果最佳。扫描件（纯图片 PDF）不支持文本提取。

**Q: 能否部署在 Vercel 上？**  
A: 可以，但注意 Vercel Serverless Function 有 10s 超时限制，大型 PDF 可能超时。建议使用 Node.js 服务器部署。

**Q: API Key 安全吗？**  
A: 通过环境变量配置的 API Key 存在服务端，不会暴露给浏览器。通过 UI 输入的 Key 仅临时存储在页面内存中。

---

## Contributing / 贡献

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License / 许可证

[MIT](LICENSE) © 2024-2025