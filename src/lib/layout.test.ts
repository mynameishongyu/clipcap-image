import { describe, expect, it } from 'vitest';
import { buildDiagramLayout } from './layout';
import type { Diagram } from './types';

describe('buildDiagramLayout', () => {
  it('keeps upper-layer nodes within two centered lines without ellipsis', () => {
    const diagram: Diagram = {
      name: '长标题测试',
      layers: [
        {
          title: '科研应用层',
          nodes: ['这是一个明显会被自动换行的超长模块标题用于验证高度计算是否正确并且不能显示省略号'],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);
    const leaf = layout.layers[0].children[0];

    expect(leaf.kind).toBe('leaf');
    if (leaf.kind === 'leaf') {
      expect(leaf.text.lines.length).toBeLessThanOrEqual(2);
      expect(leaf.text.lines.join('')).not.toContain('...');
      expect(leaf.text.area.height).toBe(leaf.frame.height);
      expect(leaf.text.area.x + leaf.text.area.width / 2).toBe(
        leaf.frame.x + leaf.frame.width / 2,
      );
    }
  });

  it('renders group-only layers correctly', () => {
    const diagram: Diagram = {
      name: '分组层测试',
      layers: [
        {
          title: '数据集层',
          children: [
            {
              title: '数据子集',
              nodes: ['条目1', '条目2'],
            },
          ],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);

    expect(layout.layers[0].children).toHaveLength(1);
    expect(layout.layers[0].children[0].kind).toBe('group');
  });

  it('lets a single top-level node expand to the full available width', () => {
    const diagram: Diagram = {
      name: '单节点铺满',
      layers: [
        {
          title: '接入层',
          nodes: ['Web 管理后台'],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);
    const layer = layout.layers[0];
    const child = layer.children[0];

    expect(child.kind).toBe('leaf');
    if (child.kind === 'leaf') {
      expect(child.frame.x).toBe(layer.frame.x + 24);
      expect(child.frame.width).toBe(layer.frame.width - 48);
      expect(child.frame.width).toBeGreaterThan(480);
    }
  });

  it('keeps dataset groups on a single row', () => {
    const diagram: Diagram = {
      name: '多子集布局',
      layers: [
        {
          title: '数据集层',
          children: [
            { title: '子集一', nodes: ['A', 'B', 'C'] },
            { title: '子集二', nodes: ['A', 'B', 'C'] },
            { title: '子集三', nodes: ['A', 'B', 'C'] },
            { title: '子集四', nodes: ['A', 'B', 'C'] },
          ],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);
    const groups = layout.layers[0].children.filter((child) => child.kind === 'group');

    expect(groups).toHaveLength(4);
    expect(new Set(groups.map((group) => group.frame.y)).size).toBe(1);
  });

  it('widens upper-layer node cards to reduce excessive whitespace', () => {
    const diagram: Diagram = {
      name: '宽度自适应',
      layers: [
        {
          title: '科研应用层',
          nodes: ['模块A', '模块B', '模块C'],
        },
        {
          title: '数据集层',
          children: [
            { title: '子集一', nodes: ['A', 'B', 'C'] },
            { title: '子集二', nodes: ['A', 'B', 'C'] },
            { title: '子集三', nodes: ['A', 'B', 'C'] },
          ],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);
    const upperLayerLeaves = layout.layers[0].children.filter((child) => child.kind === 'leaf');

    expect(upperLayerLeaves).toHaveLength(3);
    upperLayerLeaves.forEach((leaf) => {
      expect(leaf.frame.width).toBeGreaterThan(240);
    });
  });

  it('keeps titles on one line while allowing dataset nodes to wrap to two lines', () => {
    const diagram: Diagram = {
      name: '标题与子项行数',
      layers: [
        {
          title: '这是一个很长但必须保持单行显示的数据集层标题',
          children: [
            {
              title: '这是一个很长但也必须保持单行显示的子集标题',
              nodes: ['这是一个很长的数据集叶子节点名称，允许在这里最多显示成两行'],
            },
          ],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);
    const layer = layout.layers[0];
    const group = layer.children[0];

    expect(layer.title.lines).toHaveLength(1);
    expect(group.kind).toBe('group');

    if (group.kind === 'group') {
      expect(group.title.lines).toHaveLength(1);
      expect(group.children[0].text.lines.length).toBeLessThanOrEqual(2);
      expect(group.children[0].text.lines.join('')).not.toContain('...');
    }
  });

  it('expands diagram width to fit long two-line node content', () => {
    const veryLongTitle =
      '这是一个非常非常长并且要求在两行内尽量完整显示的模块标题'.repeat(4);
    const diagram: Diagram = {
      name: '动态宽度',
      layers: [
        {
          title: '这是一个非常非常长并且要求保持单行显示的科研应用层标题'.repeat(3),
          nodes: [
            `${veryLongTitle}A`,
            `${veryLongTitle}B`,
          ],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);

    expect(layout.width).toBeGreaterThan(1440);
    expect(layout.width).toBeLessThanOrEqual(2400);
    expect(layout.layers[0].title.lines).toHaveLength(1);
    layout.layers[0].children.forEach((child) => {
      expect(child.kind).toBe('leaf');
      if (child.kind === 'leaf') {
        expect(child.text.lines.length).toBeLessThanOrEqual(2);
        expect(child.text.lines.join('')).not.toContain('...');
      }
    });
  });

  it('keeps top-layer nodes within the layer frame', () => {
    const diagram: Diagram = {
      name: '边界检查',
      layers: [
        {
          title: '接入层',
          nodes: [
            'Web 管理后台adadadadadadadada',
            '移动端小程序dadawkjfajflwa',
            '开放接口网关',
            '超长超长超长超长超长标题',
          ],
        },
      ],
    };

    const layout = buildDiagramLayout(diagram);
    const layer = layout.layers[0];
    const rightEdge = layer.frame.x + layer.frame.width;

    layer.children.forEach((child) => {
      expect(child.frame.x + child.frame.width).toBeLessThanOrEqual(rightEdge);
      expect(child.frame.x).toBeGreaterThanOrEqual(layer.frame.x);
    });
  });
});
