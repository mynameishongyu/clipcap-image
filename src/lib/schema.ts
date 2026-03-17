import { sanitizeFilename } from './filename';
import type { Diagram, Layer, LayerGroup } from './types';

export interface SchemaIssue {
  path: string;
  message: string;
}

export class SchemaValidationError extends Error {
  issues: SchemaIssue[];

  constructor(issues: SchemaIssue[]) {
    super(issues.map(formatSchemaIssue).join('\n'));
    this.name = 'SchemaValidationError';
    this.issues = issues;
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function getLineAndColumn(source: string, position: number): { line: number; column: number } {
  const safePosition = Math.max(0, Math.min(position, source.length));
  let line = 1;
  let column = 1;

  for (let index = 0; index < safePosition; index += 1) {
    if (source[index] === '\n') {
      line += 1;
      column = 1;
      continue;
    }

    column += 1;
  }

  return { line, column };
}

function getJsonParseLocation(source: string, message: string): string | null {
  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColumnMatch) {
    const [, line, column] = lineColumnMatch;
    return `第${line}行第${column}列`;
  }

  const positionMatch = message.match(/position\s+(\d+)/i);
  if (!positionMatch) {
    return null;
  }

  const { line, column } = getLineAndColumn(source, Number(positionMatch[1]));
  return `第${line}行第${column}列`;
}

function createPath(diagramIndex: number, segments: string[]): string {
  return [`第${diagramIndex + 1}张图`, ...segments].join(' / ');
}

function addIssue(
  issues: SchemaIssue[],
  diagramIndex: number,
  segments: string[],
  message: string,
): void {
  issues.push({
    path: createPath(diagramIndex, segments),
    message,
  });
}

function readNonEmptyString(
  value: unknown,
  issues: SchemaIssue[],
  diagramIndex: number,
  segments: string[],
  emptyMessage: string,
): string | null {
  if (typeof value !== 'string') {
    addIssue(issues, diagramIndex, segments, '必须是字符串');
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    addIssue(issues, diagramIndex, segments, emptyMessage);
    return null;
  }

  return trimmed;
}

function parseLayerGroup(
  value: unknown,
  issues: SchemaIssue[],
  diagramIndex: number,
  layerIndex: number,
  childIndex: number,
): LayerGroup | null {
  const baseSegments = [`第${layerIndex + 1}层`, `children[${childIndex}]`];

  if (!isPlainObject(value)) {
    addIssue(issues, diagramIndex, baseSegments, '子集必须是包含 title 和 children 的对象');
    return null;
  }

  const title = readNonEmptyString(
    value.title,
    issues,
    diagramIndex,
    [...baseSegments, 'title'],
    '不能为空字符串',
  );

  if (!Array.isArray(value.children)) {
    addIssue(issues, diagramIndex, [...baseSegments, 'children'], '必须是数组');
    return null;
  }

  if (value.children.length === 0) {
    addIssue(issues, diagramIndex, [...baseSegments, 'children'], '不能为空数组');
  }

  const children: string[] = [];
  value.children.forEach((child, nestedIndex) => {
    const childPath = [...baseSegments, `children[${nestedIndex}]`];
    if (typeof child === 'string') {
      const trimmed = child.trim();
      if (trimmed.length === 0) {
        addIssue(issues, diagramIndex, childPath, '叶子节点不能为空字符串');
        return;
      }

      children.push(trimmed);
      return;
    }

    if (isPlainObject(child)) {
      addIssue(
        issues,
        diagramIndex,
        childPath,
        '仅支持两层嵌套，子集 children 不能继续包含对象',
      );
      return;
    }

    addIssue(issues, diagramIndex, childPath, '叶子节点必须是字符串');
  });

  if (!title) {
    return null;
  }

  return {
    title,
    children,
  };
}

function parseLayer(
  value: unknown,
  issues: SchemaIssue[],
  diagramIndex: number,
  layerIndex: number,
): Layer | null {
  const baseSegments = [`第${layerIndex + 1}层`];

  if (!isPlainObject(value)) {
    addIssue(issues, diagramIndex, baseSegments, '每一层都必须是包含 title 和 children 的对象');
    return null;
  }

  const title = readNonEmptyString(
    value.title,
    issues,
    diagramIndex,
    [...baseSegments, 'title'],
    '不能为空字符串',
  );

  if (!Array.isArray(value.children)) {
    addIssue(issues, diagramIndex, [...baseSegments, 'children'], '必须是数组');
    return null;
  }

  if (value.children.length === 0) {
    addIssue(issues, diagramIndex, [...baseSegments, 'children'], '不能为空数组');
  }

  const children: Array<string | LayerGroup> = [];
  value.children.forEach((child, childIndex) => {
    const childPath = [...baseSegments, `children[${childIndex}]`];

    if (typeof child === 'string') {
      const trimmed = child.trim();
      if (trimmed.length === 0) {
        addIssue(issues, diagramIndex, childPath, '叶子节点不能为空字符串');
        return;
      }

      children.push(trimmed);
      return;
    }

    const group = parseLayerGroup(child, issues, diagramIndex, layerIndex, childIndex);
    if (group) {
      children.push(group);
      return;
    }

    if (!isPlainObject(child)) {
      addIssue(issues, diagramIndex, childPath, 'children 只能包含字符串或子集对象');
    }
  });

  if (!title) {
    return null;
  }

  return {
    title,
    children,
  };
}

function parseDiagram(
  value: unknown,
  issues: SchemaIssue[],
  diagramIndex: number,
): Diagram | null {
  if (!isPlainObject(value)) {
    addIssue(issues, diagramIndex, [], '每张图必须是对象，且包含 name 和 layers');
    return null;
  }

  const name = readNonEmptyString(value.name, issues, diagramIndex, ['name'], '不能为空字符串');
  if (name && sanitizeFilename(name).length === 0) {
    addIssue(issues, diagramIndex, ['name'], '不能只包含非法文件名字符');
  }

  if (!Array.isArray(value.layers)) {
    addIssue(issues, diagramIndex, ['layers'], '必须是数组');
    return null;
  }

  if (value.layers.length === 0) {
    addIssue(issues, diagramIndex, ['layers'], '不能为空数组');
  }

  const layers: Layer[] = [];
  value.layers.forEach((layer, layerIndex) => {
    const parsedLayer = parseLayer(layer, issues, diagramIndex, layerIndex);
    if (parsedLayer) {
      layers.push(parsedLayer);
    }
  });

  if (!name) {
    return null;
  }

  return {
    name,
    layers,
  };
}

export function formatSchemaIssue(issue: SchemaIssue): string {
  return `${issue.path}: ${issue.message}`;
}

export function parseDiagrams(source: string): Diagram[] {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    const location = getJsonParseLocation(source, message);
    throw new SchemaValidationError([
      {
        path: location ? `JSON / ${location}` : 'JSON',
        message: `解析失败: ${message}`,
      },
    ]);
  }

  if (!Array.isArray(parsedValue)) {
    throw new SchemaValidationError([
      {
        path: 'JSON',
        message: '顶层必须是数组，每个元素代表一张完整架构图',
      },
    ]);
  }

  if (parsedValue.length === 0) {
    throw new SchemaValidationError([
      {
        path: 'JSON',
        message: '数组不能为空，至少需要 1 张图',
      },
    ]);
  }

  const issues: SchemaIssue[] = [];
  const diagrams: Diagram[] = [];

  parsedValue.forEach((diagramValue, diagramIndex) => {
    const diagram = parseDiagram(diagramValue, issues, diagramIndex);
    if (diagram) {
      diagrams.push(diagram);
    }
  });

  if (issues.length > 0) {
    throw new SchemaValidationError(issues);
  }

  return diagrams;
}
