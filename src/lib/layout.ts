import type { Diagram, Layer, LayerGroup } from './types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SvgTextLayout {
  lines: string[];
  area: Rect;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  fill: string;
}

export interface LeafLayout {
  kind: 'leaf';
  frame: Rect;
  radius: number;
  fill: string;
  text: SvgTextLayout;
}

export interface GroupLayout {
  kind: 'group';
  frame: Rect;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  title: SvgTextLayout;
  children: LeafLayout[];
}

export type LayerChildLayout = LeafLayout | GroupLayout;

export interface LayerLayout {
  frame: Rect;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  title: SvgTextLayout;
  children: LayerChildLayout[];
}

export interface DiagramLayout {
  name: string;
  width: number;
  height: number;
  background: string;
  layers: LayerLayout[];
}

interface LeafStyleConfig {
  width: number;
  minWidth: number;
  maxWidth: number;
  maxLines: number;
  truncateOverflow: boolean;
  minHeight: number;
  fontSize: number;
  lineHeight: number;
  paddingX: number;
  paddingY: number;
  radius: number;
}

const COLORS = {
  background: '#FFFFFF',
  layerFill: '#EEF3FF',
  layerStroke: '#4D7CF7',
  groupFill: '#E9F0FF',
  leafFill: '#4B78E5',
  textDark: '#1C2432',
  textLight: '#FFFFFF',
};

const MIN_DIAGRAM_WIDTH = 960;
const MAX_DIAGRAM_WIDTH = 2400;
const PAGE_PADDING_X = 32;
const PAGE_PADDING_Y = 30;
const LAYER_GAP = 48;
const LAYER_PADDING_X = 24;
const LAYER_PADDING_TOP = 24;
const LAYER_PADDING_BOTTOM = 26;
const LAYER_TITLE_FONT_SIZE = 32;
const LAYER_TITLE_LINE_HEIGHT = 42;
const LAYER_TITLE_GAP = 28;
const TOP_LEAF_STYLE: LeafStyleConfig = {
  width: 240,
  minWidth: 140,
  maxWidth: 480,
  maxLines: 2,
  truncateOverflow: false,
  minHeight: 102,
  fontSize: 20,
  lineHeight: 30,
  paddingX: 18,
  paddingY: 18,
  radius: 14,
};
const MIXED_LEAF_STYLE: LeafStyleConfig = {
  width: 240,
  minWidth: 140,
  maxWidth: 480,
  maxLines: 2,
  truncateOverflow: false,
  minHeight: 102,
  fontSize: 20,
  lineHeight: 30,
  paddingX: 18,
  paddingY: 18,
  radius: 14,
};
const GROUP_LEAF_STYLE: LeafStyleConfig = {
  width: 156,
  minWidth: 84,
  maxWidth: 300,
  maxLines: 2,
  truncateOverflow: false,
  minHeight: 92,
  fontSize: 18,
  lineHeight: 28,
  paddingX: 14,
  paddingY: 16,
  radius: 12,
};
const TOP_ROW_GAP = 28;
const FLOW_ROW_GAP = 28;
const FLOW_MIN_GAP = 24;
const GROUP_MIN_WIDTH = 180;
const GROUP_BASE_MIN_WIDTH = 180;
const GROUP_PADDING_X = 20;
const GROUP_PADDING_TOP = 18;
const GROUP_PADDING_BOTTOM = 20;
const GROUP_TITLE_FONT_SIZE = 20;
const GROUP_TITLE_LINE_HEIGHT = 30;
const GROUP_TITLE_GAP = 16;
const GROUP_ROW_GAP = 16;
const GROUP_MIN_GAP = 16;
const TOP_LEAF_FIT_MIN_WIDTH = 120;
const MIXED_LEAF_FIT_MIN_WIDTH = 120;
const GROUP_LEAF_FIT_MIN_WIDTH = 64;

function isWideCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint >= 0x2e80;
}

function estimateCharacterWidth(character: string, fontSize: number): number {
  if (character === ' ') {
    return fontSize * 0.32;
  }

  if (isWideCharacter(character)) {
    return fontSize * 0.96;
  }

  if (/[A-Z]/.test(character)) {
    return fontSize * 0.66;
  }

  if (/[a-z0-9]/.test(character)) {
    return fontSize * 0.58;
  }

  return fontSize * 0.52;
}

export function estimateTextWidth(text: string, fontSize: number): number {
  return Array.from(text).reduce(
    (width, character) => width + estimateCharacterWidth(character, fontSize),
    0,
  );
}

function truncateLineToFit(text: string, maxWidth: number, fontSize: number): string {
  if (estimateTextWidth(text, fontSize) <= maxWidth) {
    return text;
  }

  const ellipsis = '...';
  const ellipsisWidth = estimateTextWidth(ellipsis, fontSize);
  let current = '';
  let currentWidth = 0;

  for (const character of Array.from(text)) {
    const characterWidth = estimateCharacterWidth(character, fontSize);
    if (current && currentWidth + characterWidth + ellipsisWidth > maxWidth) {
      break;
    }

    current += character;
    currentWidth += characterWidth;
  }

  return current.length > 0 ? `${current}${ellipsis}` : ellipsis;
}

function getLeafDesiredWidth(title: string, style: LeafStyleConfig): number {
  const textWidth = estimateTextWidth(title, style.fontSize);
  const estimatedLineWidth =
    style.maxLines <= 1 ? textWidth : Math.ceil(textWidth / style.maxLines);
  const desiredWidth = estimatedLineWidth + style.paddingX * 2 + 24;

  return Math.max(style.minWidth, Math.min(style.maxWidth, Math.ceil(desiredWidth)));
}

export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines?: number,
  truncateOverflow = true,
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const paragraphs = normalized.split('\n');
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    if (paragraph.length === 0) {
      lines.push('');
      return;
    }

    let currentLine = '';
    let currentLineWidth = 0;

    Array.from(paragraph).forEach((character) => {
      const characterWidth = estimateCharacterWidth(character, fontSize);
      if (currentLine && currentLineWidth + characterWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = character;
        currentLineWidth = characterWidth;
        return;
      }

      currentLine = `${currentLine}${character}`;
      currentLineWidth += characterWidth;
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  const normalizedLines = lines.length > 0 ? lines : [''];
  if (!maxLines || normalizedLines.length <= maxLines) {
    return normalizedLines;
  }

  if (!truncateOverflow) {
    return normalizedLines.slice(0, maxLines);
  }

  const limitedLines = normalizedLines.slice(0, maxLines);
  const overflowText = normalizedLines.slice(maxLines - 1).join('');
  limitedLines[maxLines - 1] = truncateLineToFit(overflowText, maxWidth, fontSize);
  return limitedLines;
}

function createLeafLayout(title: string, style: LeafStyleConfig, width = style.width): LeafLayout {
  const lines = wrapText(
    title,
    width - style.paddingX * 2,
    style.fontSize,
    style.maxLines,
    style.truncateOverflow,
  );
  const textHeight = lines.length * style.lineHeight;
  const height = Math.max(style.minHeight, textHeight + style.paddingY * 2);

  return {
    kind: 'leaf',
    frame: {
      x: 0,
      y: 0,
      width,
      height,
    },
    radius: style.radius,
    fill: COLORS.leafFill,
    text: {
      lines,
      area: {
        x: style.paddingX,
        y: 0,
        width: width - style.paddingX * 2,
        height,
      },
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      fontWeight: 500,
      fill: COLORS.textLight,
    },
  };
}

function translateLeafLayout(layout: LeafLayout, dx: number, dy: number): LeafLayout {
  return {
    ...layout,
    frame: {
      ...layout.frame,
      x: layout.frame.x + dx,
      y: layout.frame.y + dy,
    },
    text: {
      ...layout.text,
      area: {
        ...layout.text.area,
        x: layout.text.area.x + dx,
        y: layout.text.area.y + dy,
      },
    },
  };
}

function translateGroupLayout(layout: GroupLayout, dx: number, dy: number): GroupLayout {
  return {
    ...layout,
    frame: {
      ...layout.frame,
      x: layout.frame.x + dx,
      y: layout.frame.y + dy,
    },
    title: {
      ...layout.title,
      area: {
        ...layout.title.area,
        x: layout.title.area.x + dx,
        y: layout.title.area.y + dy,
      },
    },
    children: layout.children.map((child) => translateLeafLayout(child, dx, dy)),
  };
}

function translateChildLayout(layout: LayerChildLayout, dx: number, dy: number): LayerChildLayout {
  return layout.kind === 'leaf'
    ? translateLeafLayout(layout, dx, dy)
    : translateGroupLayout(layout, dx, dy);
}

function distributeWidths(
  desiredWidths: number[],
  minWidths: number[],
  totalWidth: number,
): number[] {
  const widths = new Array(desiredWidths.length).fill(0);
  let remainingIndices = desiredWidths.map((_, index) => index);
  let remainingWidth = totalWidth;

  while (remainingIndices.length > 0) {
    const remainingDesiredTotal = remainingIndices.reduce(
      (sum, index) => sum + desiredWidths[index],
      0,
    );

    if (remainingDesiredTotal <= 0) {
      const evenWidth = remainingWidth / remainingIndices.length;
      remainingIndices.forEach((index) => {
        widths[index] = Math.max(minWidths[index], evenWidth);
      });
      break;
    }

    const scale = remainingWidth / remainingDesiredTotal;
    const fixedIndices: number[] = [];

    remainingIndices.forEach((index) => {
      const scaledWidth = desiredWidths[index] * scale;
      if (scaledWidth <= minWidths[index]) {
        widths[index] = minWidths[index];
        remainingWidth -= minWidths[index];
        fixedIndices.push(index);
      }
    });

    if (fixedIndices.length === 0) {
      remainingIndices.forEach((index) => {
        widths[index] = desiredWidths[index] * scale;
      });
      break;
    }

    remainingIndices = remainingIndices.filter((index) => !fixedIndices.includes(index));
  }

  const roundedWidths = widths.map((width) => Math.round(width));
  let delta = totalWidth - roundedWidths.reduce((sum, width) => sum + width, 0);

  while (delta !== 0 && roundedWidths.length > 0) {
    let changed = false;

    for (let index = 0; index < roundedWidths.length && delta !== 0; index += 1) {
      if (delta > 0) {
        roundedWidths[index] += 1;
        delta -= 1;
        changed = true;
        continue;
      }

      if (roundedWidths[index] - 1 >= Math.round(minWidths[index])) {
        roundedWidths[index] -= 1;
        delta += 1;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return roundedWidths;
}

function placeSingleRow<T extends LayerChildLayout>(
  items: T[],
  xStart: number,
  yStart: number,
  containerWidth: number,
  minGap: number,
): { items: T[]; height: number } {
  if (items.length === 0) {
    return { items: [], height: 0 };
  }

  const totalWidth = items.reduce((sum, item) => sum + item.frame.width, 0);
  const rowHeight = items.reduce((height, item) => Math.max(height, item.frame.height), 0);
  const gap =
    items.length === 1
      ? 0
      : Math.max(0, (containerWidth - totalWidth) / (items.length - 1));
  const startX =
    items.length === 1 ? xStart + (containerWidth - totalWidth) / 2 : xStart;
  const positionedItems: T[] = [];
  let currentX = startX;

  items.forEach((item) => {
    positionedItems.push(translateChildLayout(item, currentX, yStart) as T);
    currentX += item.frame.width + gap;
  });

  return {
    items: positionedItems,
    height: rowHeight,
  };
}

function createGroupLayout(group: LayerGroup, width: number): GroupLayout {
  const titleLines = wrapText(
    group.title,
    width - GROUP_PADDING_X * 2,
    GROUP_TITLE_FONT_SIZE,
    1,
  );
  const titleHeight = titleLines.length * GROUP_TITLE_LINE_HEIGHT;
  const titleArea = {
    x: GROUP_PADDING_X,
    y: GROUP_PADDING_TOP,
    width: width - GROUP_PADDING_X * 2,
    height: titleHeight,
  };
  const childrenOriginY = GROUP_PADDING_TOP + titleHeight + GROUP_TITLE_GAP;
  const availableChildrenWidth =
    width -
    GROUP_PADDING_X * 2 -
    Math.max(0, (group.nodes.length - 1) * GROUP_MIN_GAP);
  const childWidth = Math.max(
    GROUP_LEAF_FIT_MIN_WIDTH,
    Math.min(
      GROUP_LEAF_STYLE.maxWidth,
      Math.floor(availableChildrenWidth / Math.max(1, group.nodes.length)),
    ),
  );
  const leafLayouts = group.nodes.map((childTitle) =>
    createLeafLayout(childTitle, GROUP_LEAF_STYLE, childWidth),
  );
  const childrenPlacement = placeSingleRow(
    leafLayouts,
    GROUP_PADDING_X,
    childrenOriginY,
    width - GROUP_PADDING_X * 2,
    GROUP_MIN_GAP,
  );
  const height = childrenOriginY + childrenPlacement.height + GROUP_PADDING_BOTTOM;

  return {
    kind: 'group',
    frame: {
      x: 0,
      y: 0,
      width,
      height,
    },
    radius: 14,
    fill: COLORS.groupFill,
    stroke: COLORS.layerStroke,
    strokeWidth: 2,
    title: {
      lines: titleLines,
      area: titleArea,
      fontSize: GROUP_TITLE_FONT_SIZE,
      lineHeight: GROUP_TITLE_LINE_HEIGHT,
      fontWeight: 700,
      fill: COLORS.textDark,
    },
    children: childrenPlacement.items,
  };
}

function getRequiredGroupWidth(group: LayerGroup): number {
  const childrenWidth =
    group.nodes.reduce(
      (sum, child) => sum + getLeafDesiredWidth(child, GROUP_LEAF_STYLE),
      0,
    ) +
    Math.max(0, (group.nodes.length - 1) * GROUP_MIN_GAP) +
    GROUP_PADDING_X * 2;

  const titleWidth =
    estimateTextWidth(group.title, GROUP_TITLE_FONT_SIZE) + GROUP_PADDING_X * 2 + 20;

  return Math.max(GROUP_MIN_WIDTH, GROUP_BASE_MIN_WIDTH, childrenWidth, titleWidth);
}

function getRequiredLayerWidth(layer: Layer): number {
  const titleWidth = estimateTextWidth(layer.title, LAYER_TITLE_FONT_SIZE) + 160;
  const layerNodes = layer.nodes ?? [];
  const layerGroups = layer.children ?? [];
  const containsGroups = layerGroups.length > 0;

  const childrenWidth = !containsGroups
    ? layerNodes.reduce(
        (sum, child) => sum + getLeafDesiredWidth(child, TOP_LEAF_STYLE),
        0,
      ) + Math.max(0, (layerNodes.length - 1) * TOP_ROW_GAP)
    : [
        ...layerNodes.map((node) => getLeafDesiredWidth(node, MIXED_LEAF_STYLE)),
        ...layerGroups.map((child) => getRequiredGroupWidth(child)),
      ].reduce((sum, width) => sum + width, 0) +
      Math.max(0, (layerNodes.length + layerGroups.length - 1) * FLOW_MIN_GAP);

  return Math.max(titleWidth, childrenWidth) + LAYER_PADDING_X * 2 + PAGE_PADDING_X * 2;
}

function createLayerLayout(layer: Layer, y: number, diagramWidth: number): LayerLayout {
  const layerFrame: Rect = {
    x: PAGE_PADDING_X,
    y,
    width: diagramWidth - PAGE_PADDING_X * 2,
    height: 0,
  };
  const titleLines = wrapText(
    layer.title,
    layerFrame.width - 220,
    LAYER_TITLE_FONT_SIZE,
    1,
  );
  const titleHeight = titleLines.length * LAYER_TITLE_LINE_HEIGHT;
  const titleArea: Rect = {
    x: layerFrame.x + 80,
    y: y + LAYER_PADDING_TOP,
    width: layerFrame.width - 160,
    height: titleHeight,
  };
  const childrenOriginY = y + LAYER_PADDING_TOP + titleHeight + LAYER_TITLE_GAP;
  const contentWidth = layerFrame.width - LAYER_PADDING_X * 2;
  const contentX = layerFrame.x + LAYER_PADDING_X;
  const layerNodes = layer.nodes ?? [];
  const layerGroups = layer.children ?? [];
  const containsGroups = layerGroups.length > 0;

  let children: LayerChildLayout[] = [];
  let childrenHeight = 0;

  if (!containsGroups) {
    const totalGap = Math.max(0, (layerNodes.length - 1) * TOP_ROW_GAP);
    const availableItemWidth = contentWidth - totalGap;
    const desiredWidths = layerNodes.map((node) => getLeafDesiredWidth(node, TOP_LEAF_STYLE));
    const minWidths = layerNodes.map(() => TOP_LEAF_FIT_MIN_WIDTH);
    const itemWidths = distributeWidths(desiredWidths, minWidths, availableItemWidth);
    const leafLayouts = layerNodes.map((node, index) =>
      createLeafLayout(
        node,
        TOP_LEAF_STYLE,
        Math.max(
          TOP_LEAF_FIT_MIN_WIDTH,
          Math.min(TOP_LEAF_STYLE.maxWidth, itemWidths[index]),
        ),
      ),
    );
    const placement = placeSingleRow(
      leafLayouts,
      contentX,
      childrenOriginY,
      contentWidth,
      36,
    );
    children = placement.items;
    childrenHeight = placement.height;
  } else {
    const totalGap =
      Math.max(0, (layerNodes.length + layerGroups.length - 1) * FLOW_MIN_GAP);
    const availableItemWidth = contentWidth - totalGap;
    const desiredWidths = [
      ...layerNodes.map((node) => getLeafDesiredWidth(node, MIXED_LEAF_STYLE)),
      ...layerGroups.map((child) => getRequiredGroupWidth(child)),
    ];
    const minWidths = [
      ...layerNodes.map(() => MIXED_LEAF_FIT_MIN_WIDTH),
      ...layerGroups.map((child) =>
        Math.max(
          GROUP_BASE_MIN_WIDTH,
          estimateTextWidth(child.title, GROUP_TITLE_FONT_SIZE) + GROUP_PADDING_X * 2,
          child.nodes.length * GROUP_LEAF_STYLE.minWidth +
            Math.max(0, (child.nodes.length - 1) * GROUP_MIN_GAP) +
            GROUP_PADDING_X * 2,
        ),
      ),
    ];
    const itemWidths = distributeWidths(desiredWidths, minWidths, availableItemWidth);
    const nodeLayouts = layerNodes.map((node, index) =>
      createLeafLayout(
        node,
        MIXED_LEAF_STYLE,
        Math.max(
          MIXED_LEAF_FIT_MIN_WIDTH,
          Math.min(MIXED_LEAF_STYLE.maxWidth, itemWidths[index]),
        ),
      ),
    );
    const groupLayouts = layerGroups.map((child, index) =>
      createGroupLayout(
        child,
        Math.max(
          GROUP_LEAF_FIT_MIN_WIDTH * 2,
          itemWidths[layerNodes.length + index],
        ),
      ),
    );
    const mixedLayouts = [...nodeLayouts, ...groupLayouts];
    const placement = placeSingleRow(
      mixedLayouts,
      contentX,
      childrenOriginY,
      contentWidth,
      FLOW_MIN_GAP,
    );
    children = placement.items;
    childrenHeight = placement.height;
  }

  return {
    frame: {
      ...layerFrame,
      height:
        LAYER_PADDING_TOP +
        titleHeight +
        LAYER_TITLE_GAP +
        childrenHeight +
        LAYER_PADDING_BOTTOM,
    },
    radius: 18,
    fill: COLORS.layerFill,
    stroke: COLORS.layerStroke,
    strokeWidth: 3,
    title: {
      lines: titleLines,
      area: titleArea,
      fontSize: LAYER_TITLE_FONT_SIZE,
      lineHeight: LAYER_TITLE_LINE_HEIGHT,
      fontWeight: 700,
      fill: COLORS.textDark,
    },
    children,
  };
}

export function buildDiagramLayout(diagram: Diagram): DiagramLayout {
  const requiredWidth = Math.max(
    MIN_DIAGRAM_WIDTH,
    ...diagram.layers.map((layer) => getRequiredLayerWidth(layer)),
  );
  const diagramWidth = Math.min(MAX_DIAGRAM_WIDTH, requiredWidth);
  let currentY = PAGE_PADDING_Y;
  const layers: LayerLayout[] = [];

  diagram.layers.forEach((layer) => {
    const layerLayout = createLayerLayout(layer, currentY, diagramWidth);
    layers.push(layerLayout);
    currentY += layerLayout.frame.height + LAYER_GAP;
  });

  return {
    name: diagram.name,
    width: diagramWidth,
    height: currentY - LAYER_GAP + PAGE_PADDING_Y,
    background: COLORS.background,
    layers,
  };
}
