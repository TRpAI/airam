import { KnowledgeItem, Project, GitHubRepository, SyncLog, Tag } from '../types';

export const initialTags: Tag[] = [
  { id: 'tag-1', name: 'Cloudflare', color: 'orange' },
  { id: 'tag-2', name: 'D1-SQLite', color: 'blue' },
  { id: 'tag-3', name: 'GitHub-API', color: 'purple' },
  { id: 'tag-4', name: 'Workers', color: 'amber' },
  { id: 'tag-5', name: 'TypeScript', color: 'sky' },
  { id: 'tag-6', name: '架构设计', color: 'emerald' },
  { id: 'tag-7', name: 'Queue', color: 'rose' },
  { id: 'tag-8', name: '离线优先', color: 'indigo' },
];

export const initialGitHubRepos: GitHubRepository[] = [
  {
    id: 'repo-1',
    github_id: 84210923,
    owner: 'developer',
    name: 'CloudPulse',
    full_name: 'developer/CloudPulse',
    description: 'Cloudflare 边缘全景监控与 Worker/D1 健康诊断仪表盘。',
    html_url: 'https://github.com/developer/CloudPulse',
    homepage: 'https://pulse.dev-worker.org',
    language: 'TypeScript',
    license: 'MIT',
    stars: 142,
    forks: 18,
    watchers: 142,
    open_issues: 3,
    default_branch: 'main',
    is_private: false,
    is_fork: false,
    topics: ['cloudflare', 'workers', 'monitoring', 'd1', 'react'],
    readme_content: `# CloudPulse ⚡

Cloudflare 边缘环境健康与服务状态轻量监控工具。

## 特色
- 🚀 原生运行于 Cloudflare Workers 与 Pages
- 📊 D1 存储指标历史，无需外部时序数据库
- 🔔 支持 Discord / Telegram / Lark Webhook 告警
- ⚡ 毫秒级全球多 PoP 节点自动探活

## 快速部署
\`\`\`bash
npm install
npm run deploy:d1
wrangler deploy
\`\`\`
`,
    package_json_content: JSON.stringify({
      name: 'cloudpulse',
      dependencies: { hono: '^4.6.0', react: '^19.0.0', 'lucide-react': '^0.540.0' }
    }, null, 2),
    created_at: '2025-11-12T08:00:00Z',
    updated_at: '2026-10-07T18:20:00Z',
    pushed_at: '2026-10-07T18:20:00Z',
    last_synced_at: '2026-10-07T18:30:00Z',
    sync_status: 'synced',
    auto_generate_card: true,
  },
  {
    id: 'repo-2',
    github_id: 91024312,
    owner: 'developer',
    name: 'qiyue-ledger',
    full_name: 'developer/qiyue-ledger',
    description: '栖月账本：支持端侧加密与离线优先的极简研发财务管理应用。',
    html_url: 'https://github.com/developer/qiyue-ledger',
    homepage: 'https://ledger.qiyue.space',
    language: 'TypeScript',
    license: 'Apache-2.0',
    stars: 86,
    forks: 9,
    watchers: 86,
    open_issues: 1,
    default_branch: 'main',
    is_private: false,
    is_fork: false,
    topics: ['finance', 'offline-first', 'react', 'sqlite', 'pwa'],
    readme_content: `# 栖月账本 (Qiyue Ledger)

专为独立开发者与个人定制的极简账本，秉持数据私有与离线优先理念。

## 技术栈
- 前端: React + Tailwind CSS + IndexedDB
- 后端: Cloudflare Workers + D1 增量同步
- 导出: 标准 CSV 与 JSON 加密备份
`,
    created_at: '2026-02-10T14:30:00Z',
    updated_at: '2026-10-06T10:15:00Z',
    pushed_at: '2026-10-06T10:15:00Z',
    last_synced_at: '2026-10-06T11:00:00Z',
    sync_status: 'synced',
    auto_generate_card: true,
  },
  {
    id: 'repo-3',
    github_id: 97812044,
    owner: 'developer',
    name: 'personal-dev-knowledge-os',
    full_name: 'developer/personal-dev-knowledge-os',
    description: '以 GitHub 项目为核心数据源的个人研发知识中枢 (Cloudflare Workers + D1)。',
    html_url: 'https://github.com/developer/personal-dev-knowledge-os',
    homepage: 'https://knowledge.edge-dev.site',
    language: 'TypeScript',
    license: 'MIT',
    stars: 215,
    forks: 24,
    watchers: 215,
    open_issues: 0,
    default_branch: 'main',
    is_private: false,
    is_fork: false,
    topics: ['knowledge-base', 'cloudflare-workers', 'd1', 'github-api', 'dev-tools'],
    readme_content: `# Personal Dev Knowledge OS 🧠

告别笨重的前端笔记！以 GitHub 仓库资产为数据中枢的边缘计算个人知识库。

## 核心设计
1. **GitHub 同步机制**: Webhook 实时触发 + 定时增量兜底
2. **边缘无服务器**: Cloudflare D1 驱动结构化检索，可选 R2 用于文件归档
3. **单用户无侵入安全**: 结合 Cloudflare Access 或轻量 API Token
`,
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-10-07T21:00:00Z',
    pushed_at: '2026-10-07T21:00:00Z',
    last_synced_at: '2026-10-07T21:10:00Z',
    sync_status: 'synced',
    auto_generate_card: true,
  },
  {
    id: 'repo-4',
    github_id: 10423011,
    owner: 'developer',
    name: 'cf-edge-toolkit',
    full_name: 'developer/cf-edge-toolkit',
    description: '轻量高性能 Cloudflare Workers 中间件合集：HMAC 验签、D1 事务、RateLimiter。',
    html_url: 'https://github.com/developer/cf-edge-toolkit',
    language: 'TypeScript',
    license: 'MIT',
    stars: 59,
    forks: 4,
    watchers: 59,
    open_issues: 2,
    default_branch: 'main',
    is_private: false,
    is_fork: false,
    topics: ['cloudflare', 'workers', 'middleware', 'security', 'crypto'],
    readme_content: `# cf-edge-toolkit 🛠️

开箱即用的 Cloudflare Workers 辅助函数库。
`,
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-10-05T06:00:00Z',
    pushed_at: '2026-10-05T06:00:00Z',
    last_synced_at: '2026-10-05T07:00:00Z',
    sync_status: 'synced',
    auto_generate_card: true,
  }
];

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'CloudPulse',
    description: 'Cloudflare 平台性能与边缘服务监控中枢。',
    status: 'active',
    one_liner: 'Cloudflare 平台一站式多节点监控与探活工具。',
    tech_stack: ['TypeScript', 'Cloudflare Workers', 'D1', 'React 19'],
    features: [
      'Cloudflare 边缘全球节点探活',
      'Worker 内存与执行时长监控',
      'D1 自动化性能追踪看板',
      'Webhook 异常告警推送'
    ],
    latest_version: 'v2.2.0',
    homepage: 'https://pulse.dev-worker.org',
    repository_id: 'repo-1',
    rating: 5,
    my_notes: '已稳定运行 6 个月。下阶段规划在 V3 引入 Cloudflare Analytics Engine 替代部分高频指标日志。',
    created_at: '2025-11-12T08:00:00Z',
    updated_at: '2026-10-07T18:20:00Z',
  },
  {
    id: 'proj-2',
    name: '栖月账本 (Qiyue Ledger)',
    description: '离线优先的独立开发者个人收支与研发成本审计系统。',
    status: 'active',
    one_liner: '端侧加密、离线优先的极简个人研发财务核算。',
    tech_stack: ['React', 'TypeScript', 'IndexedDB', 'Cloudflare D1', 'Tailwind'],
    features: [
      '离线优先本地操作瞬时响应',
      '客户端 AES-GCM 端对端加密',
      '云端 D1 增量冲突合并',
      '多维度按项目研发成本分摊报表'
    ],
    latest_version: 'v1.4.2',
    homepage: 'https://ledger.qiyue.space',
    repository_id: 'repo-2',
    rating: 4,
    my_notes: '重点保障数据私密性，每次同步前在浏览器执行加密，云端 D1 仅存储 Ciphertext。',
    created_at: '2026-02-10T14:30:00Z',
    updated_at: '2026-10-06T10:15:00Z',
  },
  {
    id: 'proj-3',
    name: '个人研发知识中枢 (DevKnowledge OS)',
    description: '以代码资产为核心的单用户边缘知识库。',
    status: 'active',
    one_liner: '以 GitHub 项目为核心数据源的个人研发知识中枢。',
    tech_stack: ['Cloudflare Workers', 'D1', 'Queues', 'SQLite FTS5', 'React 19'],
    features: [
      'GitHub Webhook 实时触发与 Queue 削峰异步消费',
      'README 与项目元数据自动增量同步',
      '项目自动生成结构化研发卡片',
      'SQLite FTS5 毫秒级全文检索',
      '单用户免鉴权/Cloudflare Access 安全边界'
    ],
    latest_version: 'v1.0.0-rc',
    homepage: 'https://knowledge.edge-dev.site',
    repository_id: 'repo-3',
    rating: 5,
    my_notes: '核心哲学：不要把整个仓库代码塞进数据库，只提取关键元信息与文档资产，保持系统极致轻盈。',
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-10-07T21:00:00Z',
  },
  {
    id: 'proj-4',
    name: 'Cloudflare Edge Toolkit',
    description: 'Workers 生产级实用中间件工具链。',
    status: 'maintenance',
    one_liner: '高频 Workers 中间件轻量集合（验签、缓存、限流）。',
    tech_stack: ['TypeScript', 'Web Crypto API', 'Cloudflare KV'],
    features: [
      'GitHub Webhook HMAC-SHA256 零依赖校验',
      '边缘令牌桶 Rate Limiting 中间件',
      'D1 批量 Batch 事务执行器'
    ],
    latest_version: 'v0.8.5',
    repository_id: 'repo-4',
    rating: 4,
    my_notes: '主要作为其他 Workers 项目的共享底层基础代码库。',
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-10-05T06:00:00Z',
  }
];

export const initialKnowledgeItems: KnowledgeItem[] = [
  {
    id: 'kb-1',
    title: 'Cloudflare D1 性能优化与单用户 SQLite 锁模式实践',
    type: 'document',
    summary: '深入剖析 Cloudflare D1 在单用户场景下的写并发控制、批量语句批处理与缓存机制。',
    content: `# Cloudflare D1 性能优化与单用户 SQLite 锁模式实践

## 核心机制
Cloudflare D1 底层基于 SQLite 构建，采用分布式副本 + 单主写机制。在单用户研发知识库体系中，写操作频率相对极低，读操作可以通过边缘就近缓存获得亚毫秒响应。

### 1. 批量写操作优先采用 db.batch()
单条多次执行 \`db.prepare(...).run()\` 会产生多次网络 round-trip。D1 提供了原生的 \`db.batch([...])\`：
\`\`\`typescript
const statements = [
  env.DB.prepare('UPDATE github_repositories SET stars = ? WHERE id = ?').bind(stars, id),
  env.DB.prepare('INSERT INTO sync_logs (repo_id, status) VALUES (?, ?)').bind(id, 'success')
];
await env.DB.batch(statements);
\`\`\`
D1 的 \`batch\` 会将这些语句封装在单次事务中执行，速度提升 5x - 10x。

### 2. SQLite FTS5 全文索引优化
针对长文本内容（如 README 或技术笔记），建表时使用 \`content=""\` 的虚拟外部内容表，避免存储双份文本占用 D1 空间。
`,
    status: 'active',
    is_favorite: true,
    tags: ['Cloudflare', 'D1-SQLite', '架构设计'],
    created_at: '2026-09-15T10:00:00Z',
    updated_at: '2026-10-02T16:30:00Z',
  },
  {
    id: 'kb-2',
    title: 'GitHub Webhook HMAC-SHA256 签名校验在 Workers 上的无依赖实现',
    type: 'document',
    summary: '使用原生 Web Crypto API 校验 X-Hub-Signature-256，无需引入第三方 node crypto 库。',
    content: `# GitHub Webhook HMAC-SHA256 签名校验在 Workers 上的无依赖实现

## 为什么不能信任没有验签的请求？
Webhook 地址是公开的，任何人都可以通过 POST \`/api/github/webhook\` 伪造推送事件。GitHub 在请求头中提供了 \`X-Hub-Signature-256: sha256=...\`。

## 原生 Web Crypto 校验算法
在 Cloudflare Workers 中无需使用 Node.js \`crypto\` 兼容层，直接使用全球标准的 \`crypto.subtle\`：

\`\`\`typescript
export async function verifyGitHubWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expectedHashHex = signatureHeader.substring(7);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const calculatedHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 常量时间比较避免时序攻击
  return timingSafeEqual(expectedHashHex, calculatedHashHex);
}
\`\`\`
`,
    status: 'active',
    is_favorite: true,
    tags: ['Cloudflare', 'GitHub-API', 'Workers', '架构设计'],
    created_at: '2026-09-20T14:10:00Z',
    updated_at: '2026-10-05T08:00:00Z',
  },
  {
    id: 'kb-3',
    title: 'R2 降级策略：在不开启 R2 存储桶时如何使用 D1 存储轻量附件',
    type: 'note',
    summary: 'R2 是可选组件。对于仅存少量结构化笔记与 Markdown 的轻量系统，如何保持系统极简与零额外账单。',
    content: `# R2 降级策略与轻量附件处理

## 核心结论
- **R2 为可选项**：对于以代码元信息、README、技术笔记、书签为核心的纯文本知识中枢，D1 的单库容量完全满足多年个人积累（D1 免费额度 5GB，足够容纳百万级 Markdown 记录）。
- **何时需要 R2？**
  1. 存放系统全量每日定时 SQL 物理备份（.sql 归档压缩包）；
  2. 存放仓库架构设计大图（PNG/WebP/SVG）、项目录屏 GIF；
  3. 存放导入的 PDF 电子书或大文档。

## 零 R2 的极简配置
若无需大附件，在 \`wrangler.toml\` 中无需绑定 \`[[r2_buckets]]\`，系统运行模式切换为“纯 D1 极简形态”。
`,
    status: 'active',
    is_favorite: false,
    tags: ['Cloudflare', 'D1-SQLite', '架构设计'],
    created_at: '2026-09-28T11:20:00Z',
    updated_at: '2026-10-04T09:00:00Z',
  },
  {
    id: 'kb-4',
    title: 'Cloudflare Queues 异步解耦 Webhook 并发请求架构实战',
    type: 'document',
    summary: '利用 Queues 缓冲来自 GitHub 的高频 push/release 事件，保证 D1 数据库写入有序平稳。',
    content: `# Cloudflare Queues 异步解耦 Webhook

## 架构痛点
当仓库发生连续推代码（如 CI 自动化打 tag、多个分支 push）时，GitHub 会在数秒内连续发出 5~10 个 Webhook。如果直接在 Webhook 请求线程中去调用 GitHub API 获取 README 并执行 D1 写操作，容易遇到并发竞态或 Workers 50ms CPU 超时限制。

## 队列解耦流转
1. **Webhook Handler**（生产者）：校验 HMAC -> 将 payload 压入 \`github-sync-queue\` -> 立即返回 HTTP 200 OK。
2. **Queue Consumer**（消费者）：从队列拉取消息 -> 比对本地 \`pushed_at\` -> 调用 GitHub Contents API -> 写入 D1。
`,
    status: 'active',
    is_favorite: true,
    tags: ['Cloudflare', 'Queue', 'Workers', 'GitHub-API'],
    created_at: '2026-10-01T15:00:00Z',
    updated_at: '2026-10-06T12:00:00Z',
  },
  {
    id: 'kb-5',
    title: 'Cloudflare Access Zero Trust 免运维单用户鉴权配置',
    type: 'note',
    summary: '完全免去密码存储、JWT 刷新与二次验证代码，用 Cloudflare Access 保护个人知识库。',
    content: `# Cloudflare Access Zero Trust 配置

对于单用户系统，最优雅的认证方式是 **把认证交给基础设施**。

## 实施方案
1. 在 Cloudflare One 控制台添加 Application，绑定域名 \`knowledge.yourdomain.com\`。
2. 设置策略：仅允许指定邮箱（如 \`owner@gmail.com\`）通过一次性 PIN 码或 GitHub OAuth 登录。
3. Workers 后端仅需读取请求头 \`Cf-Access-Authenticated-User-Email\` 即可确认身份。
4. 业务代码无需任何用户表、加密哈希、Cookie 管理！
`,
    status: 'active',
    is_favorite: false,
    tags: ['Cloudflare', '架构设计'],
    created_at: '2026-10-03T18:40:00Z',
    updated_at: '2026-10-07T09:30:00Z',
  }
];

export const initialSyncLogs: SyncLog[] = [
  {
    id: 'log-1',
    repo_id: 'repo-3',
    repo_name: 'developer/personal-dev-knowledge-os',
    trigger_type: 'webhook',
    status: 'success',
    details: '检测到 push 事件 [commit: f28a9b]，README.md 更新，已同步 D1 知识库。',
    duration_ms: 184,
    created_at: '2026-10-07T21:10:00Z',
    changes_detected: { commits: 1, readme_updated: true }
  },
  {
    id: 'log-2',
    repo_id: 'repo-1',
    repo_name: 'developer/CloudPulse',
    trigger_type: 'cron',
    status: 'skipped',
    details: 'pushed_at 与本地 last_synced_at 一致，增量比对无更新，跳过。',
    duration_ms: 45,
    created_at: '2026-10-07T18:30:00Z',
  },
  {
    id: 'log-3',
    repo_id: 'repo-2',
    repo_name: 'developer/qiyue-ledger',
    trigger_type: 'webhook',
    status: 'success',
    details: '检测到 release 事件 [tag: v1.4.2]，项目卡片版本号与更新时间已刷新。',
    duration_ms: 212,
    created_at: '2026-10-06T11:00:00Z',
    changes_detected: { release_updated: true }
  },
  {
    id: 'log-4',
    repo_id: 'repo-4',
    repo_name: 'developer/cf-edge-toolkit',
    trigger_type: 'manual',
    status: 'success',
    details: '手动强制全量校验，Stars 数量由 57 更新为 59。',
    duration_ms: 130,
    created_at: '2026-10-05T07:00:00Z',
  }
];
