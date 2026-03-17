import type { Diagram } from './types';

const exampleDiagrams: Diagram[] = [
  {
    name: '心理健康科研架构图',
    layers: [
      {
        title: '科研应用层',
        children: [
          '智能筛查算法验证模块',
          '高危人群识别研究',
          '风险特征分析报告',
          '干预转介与协作复核接口',
        ],
      },
      {
        title: '模型与智能体层',
        children: [
          '文本语义理解模型',
          '情绪状态识别模型',
          '风险分层分类模型',
          '筛查策略编排智能体',
        ],
      },
      {
        title: '数据集层',
        children: [
          {
            title: '心理识别与辅助诊断数据集',
            children: [
              '常见心理问题筛查数据集',
              '分人群心理特征诊断数据集',
              '高危心理危机识别数据集',
            ],
          },
          {
            title: '心理健康教学应用数据集',
            children: ['分学段心理健康通识教学数据集', '专业心理服务人员实训数据集'],
          },
          {
            title: '心理援助与行为干预数据集',
            children: ['心理干预话术与过程数据集', '心理危机干预处置数据集'],
          },
        ],
      },
    ],
  },
  {
    name: '科研数据层样例',
    layers: [
      {
        title: '科研数据层',
        children: ['智能筛查算法验证模块', '高危人群识别研究'],
      },
      {
        title: '模型与智能体层',
        children: ['文本语义理解模型', '情绪状态识别模型'],
      },
      {
        title: '数据集层',
        children: [
          {
            title: '心理识别与辅助诊断数据集',
            children: ['常见心理问题筛查数据集', '分人群心理特征诊断数据集'],
          },
        ],
      },
    ],
  },
];

export const EXAMPLE_SOURCE = JSON.stringify(exampleDiagrams, null, 2);
