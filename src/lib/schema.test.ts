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

    expect(diagrams).toHaveLength(2);
    expect(diagrams[0].layers[2].children[0]).toMatchObject({
      title: '心理识别与辅助诊断数据集',
    });
  });

  it('accepts mixed string children and layer groups in the same layer', () => {
    const diagrams = parseDiagrams(
      JSON.stringify([
        {
          name: '混合层级',
          layers: [
            {
              title: '综合层',
              children: [
                '模块A',
                {
                  title: '数据子集',
                  children: ['条目1', '条目2'],
                },
              ],
            },
          ],
        },
      ]),
    );

    expect(diagrams[0].layers[0].children).toEqual([
      '模块A',
      {
        title: '数据子集',
        children: ['条目1', '条目2'],
      },
    ]);
  });

  it('reports JSON parse failures with a dedicated JSON path', () => {
    expect(() => parseDiagrams('[{')).toThrowError(SchemaValidationError);

    try {
      parseDiagrams('[{');
    } catch (error) {
      const validationError = error as SchemaValidationError;
      expect(validationError.issues[0].path).toBe('JSON');
      expect(formatSchemaIssue(validationError.issues[0])).toContain('解析失败');
    }
  });

  it('rejects nested objects inside a group and empty leaf nodes', () => {
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
                    children: [{ title: '再嵌套', children: ['非法'] }, ''],
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
                    children: [{ title: '再嵌套', children: ['非法'] }, ''],
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
            path: expect.stringContaining('children[0] / children[0]'),
            message: '仅支持两层嵌套，子集 children 不能继续包含对象',
          }),
          expect.objectContaining({
            path: expect.stringContaining('children[0] / children[1]'),
            message: '叶子节点不能为空字符串',
          }),
        ]),
      );
    }
  });
});
