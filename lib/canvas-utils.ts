// ============================================================
// Canvas 渲染工具 — 使用 Blob URL 替代 Data URL 减少内存开销
// ============================================================

/**
 * 将 Canvas 转为 Blob URL（比 Data URL 节省约 33% 内存）
 */
export async function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob failed"));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}

/**
 * 释放 Blob URL（避免内存泄漏）
 */
export function revokeBlobUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}