import type {
  DiagramLayout,
  GroupLayout,
  LayerChildLayout,
  LayerLayout,
  LeafLayout,
  SvgTextLayout,
} from './layout';
import { sanitizeFilename } from './filename';

const FONT_FAMILY =
  "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'Hiragino Sans GB', sans-serif";

export interface DownloadableDiagram {
  filename: string;
  svgMarkup: string;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderText(layout: SvgTextLayout): string {
  const centerX = layout.area.x + layout.area.width / 2;
  const totalTextHeight = layout.lines.length * layout.lineHeight;
  const firstBaseline =
    layout.area.y +
    (layout.area.height - totalTextHeight) / 2 +
    layout.fontSize * 0.88;
  const tspans = layout.lines
    .map(
      (line, index) =>
        `<tspan x="${formatNumber(centerX)}" y="${formatNumber(
          firstBaseline + index * layout.lineHeight,
        )}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  return `<text text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${formatNumber(
    layout.fontSize,
  )}" font-weight="${layout.fontWeight}" fill="${layout.fill}">${tspans}</text>`;
}

function renderLeaf(layout: LeafLayout): string {
  return [
    `<rect x="${formatNumber(layout.frame.x)}" y="${formatNumber(
      layout.frame.y,
    )}" width="${formatNumber(layout.frame.width)}" height="${formatNumber(
      layout.frame.height,
    )}" rx="${layout.radius}" fill="${layout.fill}" />`,
    renderText(layout.text),
  ].join('');
}

function renderGroup(layout: GroupLayout): string {
  return [
    `<rect x="${formatNumber(layout.frame.x)}" y="${formatNumber(
      layout.frame.y,
    )}" width="${formatNumber(layout.frame.width)}" height="${formatNumber(
      layout.frame.height,
    )}" rx="${layout.radius}" fill="${layout.fill}" stroke="${layout.stroke}" stroke-width="${layout.strokeWidth}" />`,
    renderText(layout.title),
    layout.children.map(renderLeaf).join(''),
  ].join('');
}

function renderLayerChild(layout: LayerChildLayout): string {
  return layout.kind === 'leaf' ? renderLeaf(layout) : renderGroup(layout);
}

function renderLayer(layout: LayerLayout): string {
  return [
    `<rect x="${formatNumber(layout.frame.x)}" y="${formatNumber(
      layout.frame.y,
    )}" width="${formatNumber(layout.frame.width)}" height="${formatNumber(
      layout.frame.height,
    )}" rx="${layout.radius}" fill="${layout.fill}" stroke="${layout.stroke}" stroke-width="${layout.strokeWidth}" />`,
    renderText(layout.title),
    layout.children.map(renderLayerChild).join(''),
  ].join('');
}

export function buildSvgMarkup(layout: DiagramLayout): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" shape-rendering="geometricPrecision">`,
    `<rect width="${layout.width}" height="${layout.height}" fill="${layout.background}" />`,
    layout.layers.map(renderLayer).join(''),
    '</svg>',
  ].join('');
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('SVG 图片加载失败'));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG 转换失败'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function wait(delay: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delay);
  });
}

export async function downloadDiagramPng({
  filename,
  svgMarkup,
}: DownloadableDiagram): Promise<void> {
  const safeName = sanitizeFilename(filename);
  if (safeName.length === 0) {
    throw new Error('文件名无效，无法导出 PNG');
  }

  const svgBlob = new Blob([svgMarkup], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('无法创建 Canvas 上下文');
    }

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.drawImage(image, 0, 0);

    const pngBlob = await canvasToBlob(canvas);
    const pngUrl = URL.createObjectURL(pngBlob);
    triggerDownload(pngUrl, `${safeName}.png`);
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1_000);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function downloadManyPng(items: DownloadableDiagram[]): Promise<void> {
  for (const item of items) {
    await downloadDiagramPng(item);
    await wait(180);
  }
}
