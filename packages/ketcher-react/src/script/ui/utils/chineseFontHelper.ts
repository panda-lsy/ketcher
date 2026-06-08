/**
 * 中文字体注入工具
 * 用于 SVG/PNG 导出时注入 Noto Sans SC 字体支持
 */

const CHINESE_FONT_CSS =
  "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');";

const CHINESE_FONT_FAMILY =
  "'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', Arial, sans-serif";

/**
 * 在 SVG 字符串中注入中文字体支持
 */
export function injectChineseFont(svgString: string): string {
  if (!svgString || !svgString.includes('<svg')) return svgString;

  // 注入 Google Fonts CSS 到 <defs><style>
  const fontDef = `<defs><style>${CHINESE_FONT_CSS}</style></defs>`;
  let result = svgString.replace(/<svg([^>]*)>/, `<svg$1>${fontDef}`);

  // 给所有 <text> 元素添加 font-family
  result = result.replace(/<text /g, `<text font-family="${CHINESE_FONT_FAMILY}" `);
  result = result.replace(/<text>/g, `<text font-family="${CHINESE_FONT_FAMILY}">`);

  return result;
}

/**
 * 将 SVG 字符串转换为 PNG data URL（通过浏览器 Canvas 渲染）
 */
export function svgToPngDataUrl(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * 2; // 2x for retina
      canvas.height = img.naturalHeight * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.scale(2, 2);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for PNG conversion'));
    };

    img.src = url;
  });
}

/**
 * 处理 base64 编码的 SVG：注入中文字体
 */
export function processBase64Svg(base64: string): string {
  try {
    const svgString = atob(base64);
    const processed = injectChineseFont(svgString);
    return btoa(unescape(encodeURIComponent(processed)));
  } catch {
    return base64;
  }
}
