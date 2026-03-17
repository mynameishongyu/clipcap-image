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

const DIAGRAM_WIDTH = 1440;
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
  minHeight: 102,
  fontSize: 20,
  lineHeight: 30,
  paddingX: 18,
  paddingY: 18,
  radius: 14,
};
const MIXED_LEAF_STYLE: LeafStyleConfig = {
  width: 240,
  minHeight: 102,
  fontSize: 20,
  lineHeight: 30,
  paddingX: 18,
  paddingY: 18,
  radius: 14,
};
const GROUP_LEAF_STYLE: LeafStyleConfig = {
  width: 156,
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
const GROUP_MIN_WIDTH = 340;
const GROUP_PADDING_X = 20;
const GROUP_PADDING_TOP = 18;
const GROUP_PADDING_BOTTOM = 20;
const GROUP_TITLE_FONT_SIZE = 20;
const GROUP_TITLE_LINE_HEIGHT = 30;
const GROUP_TITLE_GAP = 16;
const GROUP_ROW_GAP = 16;
const GROUP_MIN_GAP = 16;
const TOP_MAX_PER_ROW = 4;
const GROUP_MAX_PER_ROW = 3;

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

export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const paragraphs = normalized.split('\n');
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    if (paragraph.length === 0) {
      lines.push('');
      return;
    }

    let currentLine = '';
    Array.from(paragraph).forEach((character) => {
      const nextLine = `${currentLine}${character}`;
      if (currentLine && estimateTextWidth(nextLine, fontSize) > maxWidth) {
        lines.push(currentLine);
        currentLine = character;
        return;
      }

      currentLine = nextLine;
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines.length > 0 ? lines : [''];
}

function createLeafLayout(title: string, style: LeafStyleConfig): LeafLayout {
  const lines = wrapText(title, style.width - style.paddingX * 2, style.fontSize);
  const textHeight = lines.length * style.lineHeight;
  const height = Math.max(style.minHeight, textHeight + style.paddingY * 2);
  const verticalPadding = (height - textHeight) / 2;

  return {
    kind: 'leaf',
    frame: {
      x: 0,
      y: 0,
      width: style.width,
      height,
    },
    radius: style.radius,
    fill: COLORS.leafFill,
    text: {
      lines,
      area: {
        x: style.paddingX,
        y: verticalPadding,
        width: style.width - style.paddingX * 2,
        height: textHeight,
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

function placeUniformRows(
  items: LeafLayout[],
  xStart: number,
  yStart: number,
  containerWidth: number,
  maxPerRow: number,
  rowGap: number,
  minGap: number,
): { items: LeafLayout[]; height: number } {
  const positionedItems: LeafLayout[] = [];
  let currentY = yStart;

  for (let index = 0; index < items.length; index += maxPerRow) {
    const rowItems = items.slice(index, index + maxPerRow);
    const totalWidth = rowItems.reduce((sum, item) => sum + item.frame.width, 0);
    const gap =
      rowItems.length === 1
        ? 0
        : Math.max(minGap, (containerWidth - totalWidth) / (rowItems.length - 1));
    const startX =
      rowItems.length === 1
        ? xStart + (containerWidth - rowItems[0].frame.width) / 2
        : xStart;
    let currentX = startX;
    let rowHeight = 0;

    rowItems.forEach((item) => {
      positionedItems.push(translateLeafLayout(item, currentX, currentY));
      currentX += item.frame.width + gap;
      rowHeight = Math.max(rowHeight, item.frame.height);
    });

    currentY += rowHeight + rowGap;
  }

  const height = positionedItems.length === 0 ? 0 : currentY - yStart - rowGap;
  return {
    items: positionedItems,
    height,
  };
}

function placeFlowRows(
  items: LayerChildLayout[],
  xStart: number,
  yStart: number,
  containerWidth: number,
  rowGap: number,
  minGap: number,
): { items: LayerChildLayout[]; height: number } {
  const rows: LayerChildLayout[][] = [];
  let currentRow: LayerChildLayout[] = [];
  let currentRowWidth = 0;

  items.forEach((item) => {
    const nextWidth =
      currentRow.length === 0
        ? item.frame.width
        : currentRowWidth + minGap + item.frame.width;

    if (nextWidth > containerWidth && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [item];
      currentRowWidth = item.frame.width;
      return;
    }

    currentRow.push(item);
    currentRowWidth = nextWidth;
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  const positionedItems: LayerChildLayout[] = [];
  let currentY = yStart;

  rows.forEach((row) => {
    const totalWidth = row.reduce((sum, item) => sum + item.frame.width, 0);
    const rowHeight = row.reduce((height, item) => Math.max(height, item.frame.height), 0);
    const gap =
      row.length === 1
        ? 0
        : Math.max(minGap, (containerWidth - totalWidth) / (row.length - 1));
    const startX =
      row.length === 1 ? xStart + (containerWidth - totalWidth) / 2 : xStart;
    let currentX = startX;

    row.forEach((item) => {
      positionedItems.push(translateChildLayout(item, currentX, currentY));
      currentX += item.frame.width + gap;
    });

    currentY += rowHeight + rowGap;
  });

  const height = rows.length === 0 ? 0 : currentY - yStart - rowGap;
  return {
    items: positionedItems,
    height,
  };
}

function createGroupLayout(group: LayerGroup, maxWidth: number): GroupLayout {
  const preferredColumns = Math.min(GROUP_MAX_PER_ROW, group.children.length);
  const contentWidthByChildren =
    preferredColumns * GROUP_LEAF_STYLE.width +
    (preferredColumns - 1) * GROUP_MIN_GAP +
    GROUP_PADDING_X * 2;
  const widthByTitle =
    estimateTextWidth(group.title, GROUP_TITLE_FONT_SIZE) + GROUP_PADDING_X * 2 + 20;
  const width = Math.min(
    maxWidth,
    Math.max(GROUP_MIN_WIDTH, contentWidthByChildren, widthByTitle),
  );
  const titleLines = wrapText(
    group.title,
    width - GROUP_PADDING_X * 2,
    GROUP_TITLE_FONT_SIZE,
  );
  const titleHeight = titleLines.length * GROUP_TITLE_LINE_HEIGHT;
  const titleArea = {
    x: GROUP_PADDING_X,
    y: GROUP_PADDING_TOP,
    width: width - GROUP_PADDING_X * 2,
    height: titleHeight,
  };
  const leafLayouts = group.children.map((childTitle) =>
    createLeafLayout(childTitle, GROUP_LEAF_STYLE),
  );
  const childrenOriginY = GROUP_PADDING_TOP + titleHeight + GROUP_TITLE_GAP;
  const childrenPlacement = placeUniformRows(
    leafLayouts,
    GROUP_PADDING_X,
    childrenOriginY,
    width - GROUP_PADDING_X * 2,
    preferredColumns,
    GROUP_ROW_GAP,
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

function createLayerLayout(layer: Layer, y: number): LayerLayout {
  const layerFrame: Rect = {
    x: PAGE_PADDING_X,
    y,
    width: DIAGRAM_WIDTH - PAGE_PADDING_X * 2,
    height: 0,
  };
  const titleLines = wrapText(
    layer.title,
    layerFrame.width - 220,
    LAYER_TITLE_FONT_SIZE,
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
  const containsGroups = layer.children.some((child) => typeof child !== 'string');

  let children: LayerChildLayout[] = [];
  let childrenHeight = 0;

  if (!containsGroups) {
    const leafLayouts = layer.children.map((child) =>
      createLeafLayout(child as string, TOP_LEAF_STYLE),
    );
    const placement = placeUniformRows(
      leafLayouts,
      contentX,
      childrenOriginY,
      contentWidth,
      TOP_MAX_PER_ROW,
      TOP_ROW_GAP,
      36,
    );
    children = placement.items;
    childrenHeight = placement.height;
  } else {
    const mixedLayouts = layer.children.map((child) =>
      typeof child === 'string'
        ? createLeafLayout(child, MIXED_LEAF_STYLE)
        : createGroupLayout(child, contentWidth),
    );
    const placement = placeFlowRows(
      mixedLayouts,
      contentX,
      childrenOriginY,
      contentWidth,
      FLOW_ROW_GAP,
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
  let currentY = PAGE_PADDING_Y;
  const layers: LayerLayout[] = [];

  diagram.layers.forEach((layer) => {
    const layerLayout = createLayerLayout(layer, currentY);
    layers.push(layerLayout);
    currentY += layerLayout.frame.height + LAYER_GAP;
  });

  return {
    name: diagram.name,
    width: DIAGRAM_WIDTH,
    height: currentY - LAYER_GAP + PAGE_PADDING_Y,
    background: COLORS.background,
    layers,
  };
}
