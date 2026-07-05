import { KetcherLogger } from './KetcherLogger';

const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';
const ADDITIONAL_TOP_MARGIN = 54;
const ADDITIONAL_LEFT_MARGIN = 50;
const DEFAULT_MARGIN = 10;

type Margins = {
  horizontal: number;
  vertical: number;
};

const CHINESE_FONT_FAMILY =
  "'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', Arial, sans-serif";

function isDarkMode(): boolean {
  try {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  } catch (_) {
    return false;
  }
}

function getStrokeColor(): string {
  return isDarkMode() ? '#e9eef5' : '#000';
}

/**
 * 在 SVG 字符串中替换中文字体（字符串级操作，避免 DOM 序列化问题）
 */
function injectChineseFontSvg(svgStr: string): string {
  // 替换所有 font-family="..." 为中文字体
  return svgStr.replace(
    /font-family="[^"]*"/g,
    `font-family="${CHINESE_FONT_FAMILY}"`,
  );
}

/**
 * 替换 SVG 中的黑色笔触为当前主题颜色
 */
function applyThemeColors(svg: SVGSVGElement): void {
  const strokeColor = getStrokeColor();
  if (strokeColor === '#000') return; // 亮色模式无需修改

  // 替换 stroke 和 fill 中的黑色
  svg.querySelectorAll('[stroke="#000"], [stroke="black"]').forEach((el) => {
    el.setAttribute('stroke', strokeColor);
  });
  svg.querySelectorAll('[fill="#000"], [fill="black"]').forEach((el) => {
    el.setAttribute('fill', strokeColor);
  });

  // 替换内联 style 中的颜色
  svg.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style') || '';
    if (style.includes('#000') || style.includes('black')) {
      el.setAttribute(
        'style',
        style
          .replace(/stroke:\s*#000/g, `stroke: ${strokeColor}`)
          .replace(/stroke:\s*black/g, `stroke: ${strokeColor}`)
          .replace(/fill:\s*#000/g, `fill: ${strokeColor}`)
          .replace(/fill:\s*black/g, `fill: ${strokeColor}`),
      );
    }
  });
}

export const getSvgFromDrawnStructures = (
  canvas: SVGSVGElement,
  type: 'preview' | 'file',
  margins: Margins | number = {
    horizontal: DEFAULT_MARGIN,
    vertical: DEFAULT_MARGIN,
  },
) => {
  // Convert number to Margins object to support backward compatibility
  const marginValues: Margins =
    typeof margins === 'number'
      ? { horizontal: margins, vertical: margins }
      : {
          horizontal: DEFAULT_MARGIN + margins.horizontal,
          vertical: DEFAULT_MARGIN + margins.vertical,
        };

  // Copy and clean up svg structures before previewing or saving
  let svgInnerHTML = canvas?.innerHTML || '';
  const wrapper = document.createElementNS(SVG_NAMESPACE_URI, 'svg');
  wrapper.innerHTML = svgInnerHTML;
  // remove #rectangle-selection-area
  wrapper.querySelector('#rectangle-selection-area')?.remove();
  // remove dynamic elements (scrolls, highlighters, attachment points...)
  wrapper.querySelectorAll('.dynamic-element')?.forEach((el) => el.remove());
  // set default cursor, mostly for sequence mode
  wrapper
    .querySelectorAll('text')
    ?.forEach((el) => el.setAttribute('cursor', 'default'));
  wrapper.querySelectorAll('rect')?.forEach((el) => {
    if (el.getAttribute('cursor') === 'text') el.removeAttribute('cursor');
  });
  // remove opacity of structures, mostly for sequence "edit in RNA builder" mode
  wrapper.querySelectorAll('g')?.forEach((el) => {
    if (el.hasAttribute('opacity')) el.removeAttribute('opacity');
  });

  // ★ 应用主题颜色（暗色模式下黑色→白色）
  applyThemeColors(wrapper);

  svgInnerHTML = wrapper.innerHTML;
  // ★ 注入中文字体（字符串级替换，避免 DOM 序列化重复属性）
  svgInnerHTML = injectChineseFontSvg(svgInnerHTML);
  // remove "cursor: pointer" style only from elements where it appears standalone,
  // preserving other style properties on bond path elements (stroke, fill, stroke-width, etc.)
  svgInnerHTML = svgInnerHTML?.replace(/\bcursor:\s*pointer;\s*/g, '');

  const drawStructureClientRect = canvas
    ?.getElementsByClassName('drawn-structures')[0]
    ?.getBoundingClientRect();

  if (!drawStructureClientRect || !svgInnerHTML) {
    const errorMessage = 'Cannot get drawn structures!';
    KetcherLogger.error(errorMessage);
    return;
  }

  const viewBoxX =
    drawStructureClientRect.x -
    ADDITIONAL_LEFT_MARGIN -
    marginValues.horizontal;
  const viewBoxY =
    drawStructureClientRect.y - ADDITIONAL_TOP_MARGIN - marginValues.vertical;
  const viewBoxWidth =
    drawStructureClientRect.width + marginValues.horizontal * 2;
  const viewBoxHeight =
    drawStructureClientRect.height + marginValues.vertical * 2;
  const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;

  // ★ 暗色模式下预览使用透明背景，亮色模式使用白色背景
  const dark = isDarkMode();
  const bgStyle =
    type === 'preview'
      ? dark
        ? "style='background: transparent'"
        : "style='background: white'"
      : '';

  if (type === 'preview')
    return `<svg width='100%' height='100%' ${bgStyle} viewBox='${viewBox}'>${svgInnerHTML}</svg>`;
  else if (type === 'file')
    return `<svg width='${viewBoxWidth}' height='${viewBoxHeight}' viewBox='${viewBox}' xmlns='${SVG_NAMESPACE_URI}'>${svgInnerHTML}</svg>`;
  else return `<svg xmlns='${SVG_NAMESPACE_URI}' />`;
};
