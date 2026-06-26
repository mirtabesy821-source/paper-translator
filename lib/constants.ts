// ============================================================
// 共享常量：翻译配置、PDF 解析阈值、UI 参数
// ============================================================
// 所有魔术数字集中管理，方便调优和文档化
// ============================================================

// ---- PDF 解析阈值 ----

/** 同一行内 Y 坐标偏差阈值（视口像素），当前视口缩放 1.5x */
export const SAME_LINE_Y_THRESHOLD = 5;

/** 段落间距阈值（视口像素）：行间距 ≈18px，段落间距 ≈30px，取中间值 */
export const PARAGRAPH_GAP_THRESHOLD = 25;

/** 标题字号阈值（相对比例）：fontSize > 此值的块视为标题 */
export const HEADING_FONT_SCALE = 1.2;

/** 直方图峰值检测阈值：bin 内条目比例下限 */
export const HISTOGRAM_PEAK_THRESHOLD = 0.03;

/** 多栏检测：相邻峰值合并距离（像素） */
export const COLUMN_PEAK_MERGE_DISTANCE = 30;

/** PDF 渲染缩放倍率 */
export const PDF_RENDER_SCALE = 1.5;

// ---- 翻译队列配置 ----

/** 每批发送的段落数 */
export const TRANSLATION_BATCH_SIZE = 6;

/** 并行翻译批次数 */
export const TRANSLATION_CONCURRENCY = 2;

/** 每批最大重试次数 */
export const TRANSLATION_MAX_RETRIES = 2;

/** 流式翻译 debounce 延迟（ms） */
export const STREAM_DEBOUNCE_MS = 300;

// ---- LLM 翻译参数 ----

/** 翻译温度（低温度保证一致性） */
export const TRANSLATION_TEMPERATURE = 0.3;

/** 翻译最大输出 token 数 */
export const TRANSLATION_MAX_TOKENS = 4096;

// ---- PDF 文件限制 ----

/** 最大 PDF 文件大小（字节），50MB */
export const MAX_PDF_FILE_SIZE = 50 * 1024 * 1024;

// ---- UI 参数 ----

/** IntersectionObserver threshold */
export const INTERSECTION_THRESHOLD = 0.5;

/** Canvas 可视页窗口半径（可视页 ± 此值） */
export const CANVAS_VISIBLE_WINDOW = 1;