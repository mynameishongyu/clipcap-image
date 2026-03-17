import { describe, expect, it } from 'vitest';
import { EXAMPLE_SOURCE } from './example';
import {
  SchemaValidationError,
  formatSchemaIssue,
  parseDiagrams,
} from './schema';

describe('parseDiagrams', () => {
  it('parses multiple diagrams from the example source', () => {
    const diagrams = parseDiagrams(EXAMPLE_SOURCE);
    const firstDiagram = diagrams[0];

    expect(diagrams).toHaveLength(2);
    expect(firstDiagram).toBeDefined();
    expect(firstDiagram?.layers[2]?.children?.[0]).toMatchObject({
      title: '数据存储',
    });
    expect(firstDiagram?.layers[0]?.nodes).toContain('Web 管理后台');
  });

  it('rejects nodes and children in the same layer', () => {
    expect(() =>
      parseDiagrams(
        JSON.stringify([
          {
            name: '混合层级',
            layers: [
              {
                title: '综合层',
                nodes: ['模块A'],
                children: [
                  {
                    title: '数据子集',
                    nodes: ['条目1', '条目2'],
                  },
                ],
              },
            ],
          },
        ]),
      ),
    ).toThrowError(SchemaValidationError);

    try {
      parseDiagrams(
        JSON.stringify([
          {
            name: '混合层级',
            layers: [
              {
                title: '综合层',
                nodes: ['模块A'],
                children: [
                  {
                    title: '数据子集',
                    nodes: ['条目1', '条目2'],
                  },
                ],
              },
            ],
          },
        ]),
      );
    } catch (error) {
      const validationError = error as SchemaValidationError;
      expect(validationError.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining('第1层'),
            message: 'nodes 和 children 只能二选一，不能同时存在',
          }),
        ]),
      );
    }
  });

  it('reports JSON parse failures with a dedicated JSON path', () => {
    expect(() => parseDiagrams('[{')).toThrowError(SchemaValidationError);

    try {
      parseDiagrams('[{');
    } catch (error) {
      const validationError = error as SchemaValidationError;
      expect(validationError.issues[0].path).toContain('JSON');
      expect(formatSchemaIssue(validationError.issues[0])).toContain('解析失败');
    }
  });

  it('reports line and column for multiline JSON parse failures', () => {
    try {
      parseDiagrams('[\n  {\n    "name": "示例图",\n  }\n]');
    } catch (error) {
      const validationError = error as SchemaValidationError;
      expect(validationError.issues[0].path).toContain('第4行第3列');
      expect(formatSchemaIssue(validationError.issues[0])).toContain('解析失败');
      return;
    }

    throw new Error('expected parseDiagrams to throw');
  });

  it('rejects invalid group nodes and empty layer content', () => {
    expect(() =>
      parseDiagrams(
        JSON.stringify([
          {
            name: '错误示例',
            layers: [
              {
                title: '数据集层',
                children: [
                  {
                    title: '子集',
                    nodes: [{ title: '再嵌套', nodes: ['非法'] }, ''],
                  },
                ],
              },
            ],
          },
        ]),
      ),
    ).toThrowError(SchemaValidationError);

    try {
      parseDiagrams(
        JSON.stringify([
          {
            name: '错误示例',
            layers: [
              {
                title: '数据集层',
                children: [
                  {
                    title: '子集',
                    nodes: [{ title: '再嵌套', nodes: ['非法'] }, ''],
                  },
                ],
              },
            ],
          },
        ]),
      );
    } catch (error) {
      const validationError = error as SchemaValidationError;
      expect(validationError.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining('children[0] / nodes / [0]'),
            message: '节点必须是字符串',
          }),
          expect.objectContaining({
            path: expect.stringContaining('children[0] / nodes / [1]'),
            message: '节点不能为空字符串',
          }),
          expect.objectContaining({
            path: expect.stringContaining('children[0] / nodes'),
            message: '不能为空数组',
          }),
        ]),
      );
    }
  });
});
