import type { Diagram } from './types';

const exampleDiagrams: Diagram[] = [
  {
    name: '通用业务平台架构图',
    layers: [
      {
        title: '接入层',
        nodes: [
          'Web 管理后台',
          '移动端小程序',
          '开放接口网关',
          '合作方接入 API',
        ],
      },
      {
        title: '业务能力层',
        nodes: [
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
            nodes: [
              '关系型数据库',
              '对象存储',
              '搜索索引服务',
            ],
          },
          {
            title: '平台支撑',
            nodes: ['缓存服务', '任务调度服务'],
          },
          {
            title: '运维保障',
            nodes: ['日志采集系统', '监控告警平台'],
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
        nodes: ['CDN 加速节点', '负载均衡器'],
      },
      {
        title: '应用层',
        nodes: ['前端静态站点', '后端应用服务'],        
      },
      {
        title: '支撑层',        
        children: [
          {
            title: '数据服务',
            nodes: ['主数据库', '缓存实例'],
          },
        ],
      },
    ],
  },
];

export const EXAMPLE_SOURCE = JSON.stringify(exampleDiagrams, null, 2);

export const MODEL_OUTPUT_PROMPT = `请直接输出一个合法的 JSON 数组，用于生成架构图。

硬性要求：
1. 只输出 JSON，不要输出 Markdown、代码块、解释说明、注释或任何多余文字。
2. 顶层必须是数组，数组每个元素都必须是：
{
  "name": "图名称",
  "layers": [
    {
      "title": "普通层名称",
      "nodes": ["节点1", "节点2"]
    },
    {
      "title": "分组层名称",
      "children": [
        {
          "title": "子集名称",
          "nodes": ["节点1", "节点2"]
        }
      ]
    }
  ]
}
3. 每个 layer 只能二选一：
   - 普通层：只写 "nodes"
   - 分组层：只写 "children"
   同一层绝对不能同时出现 "nodes" 和 "children"。
4. "children" 只能有一层，children 里的每个对象都必须包含：
   - "title": 非空字符串
   - "nodes": 非空字符串数组
   子集对象里不能再出现下一层 "children"。
5. "name"、所有 "title"、所有 "nodes" 里的内容都必须是非空字符串。
6. "layers" 必须是非空数组；每个 layer 的 "nodes" 或 "children" 也必须是非空数组。
7. 除 "name"、"layers"、"title"、"nodes"、"children" 外，不要输出任何其他字段。
8. nodes 里的文字会直接画在图里的节点上，请尽量简洁，控制在 2 行内可读，不要写过长句子。
9. 如果需要输出多张图，请继续在顶层数组中追加对象。`;
