import { describe, expect, it } from 'vitest';
import { buildDiagramLayout } from './layout';
import type { Diagram } from './types';

describe('buildDiagramLayout', () => {
  it('increases leaf height when the title needs extra wrapped lines', () => {
    const diagram: Diagram = {
      name: '长标题测试',
      layers: [
        {
          title: '科研应用层',
          children: ['这是一个明显会被自动换行的超长模块标题用于验证高度计算是否正确'],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);
    const leaf = layout.layers[0].children[0];

    expect(leaf.kind).toBe('leaf');
    if (leaf.kind === 'leaf') {
      expect(leaf.frame.height).toBeGreaterThan(102);
      expect(leaf.text.lines.length).toBeGreaterThan(2);
    }
  });

  it('wraps dataset groups into multiple rows when they exceed the available width', () => {
    const diagram: Diagram = {
      name: '多子集布局',
      layers: [
        {
          title: '数据集层',
          children: [
            { title: '子集一', children: ['A', 'B', 'C'] },
            { title: '子集二', children: ['A', 'B', 'C'] },
            { title: '子集三', children: ['A', 'B', 'C'] },
            { title: '子集四', children: ['A', 'B', 'C'] },
          ],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);
    const groups = layout.layers[0].children.filter((child) => child.kind === 'group');

    expect(groups).toHaveLength(4);
    expect(groups[3].frame.y).toBeGreaterThan(groups[0].frame.y);
  });
});
