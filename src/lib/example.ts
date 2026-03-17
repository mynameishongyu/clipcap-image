import type { Diagram } from './types';

const exampleDiagrams: Diagram[] = [
  {
    name: '通用业务平台架构图',
    layers: [
      {
        title: '接入层',
        children: [
          'Web 管理后台',
          '移动端小程序',
          '开放接口网关',
          '合作方接入 API',
        ],
      },
      {
        title: '业务能力层',
        children: [
          '用户与权限服务',
          '订单处理服务',
          '通知消息服务',
          '运营配置中心',
        ],
      },
      {
        title: '数据与基础设施层',
        children: [
          {
            title: '数据存储',
            children: [
              '关系型数据库',
              '对象存储',
              '搜索索引服务',
            ],
          },
          {
            title: '平台支撑',
            children: ['缓存服务', '任务调度服务'],
          },
          {
            title: '运维保障',
            children: ['日志采集系统', '监控告警平台'],
          },
        ],
      },
    ],
  },
  {
    name: '测试环境部署样例',
    layers: [
      {
        title: '入口层',
        children: ['CDN 加速节点', '负载均衡器'],
      },
      {
        title: '应用层',
        children: ['前端静态站点', '后端应用服务'],
      },
      {
        title: '支撑层',
        children: [
          {
            title: '数据服务',
            children: ['主数据库', '缓存实例'],
          },
        ],
      },
    ],
  },
];

export const EXAMPLE_SOURCE = JSON.stringify(exampleDiagrams, null, 2);

export const MODEL_OUTPUT_PROMPT = `请直接输出一个合法的 JSON 数组，用于生成架构图。

要求：
1. 只输出 JSON，不要输出 Markdown、代码块、解释说明或多余文字。
2. 顶层必须是数组，数组元素结构如下：
[
  {
    "name": "图名称",
    "layers": [
      {
        "title": "层名称",
        "children": [
          "叶子节点",
          {
            "title": "子集名称",
            "children": ["叶子节点1", "叶子节点2"]
          }
        ]
      }
    ]
  }
]
3. "name"、"title" 和所有叶子节点都必须是非空字符串。
4. "layers" 必须是非空数组。
5. 每个 layer 的 "children" 只能包含字符串，或者一层子集对象。
6. 子集对象必须包含 "title" 和 "children"，并且它的 "children" 里只能继续放字符串，不能再嵌套对象。
7. 如果需要输出多张图，请继续在顶层数组中追加对象。`;
