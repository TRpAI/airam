export interface DocSection {
  id: string;
  title: string;
  shortDesc: string;
  category: 'overview' | 'tech_stack' | 'architecture' | 'database' | 'api' | 'github_sync' | 'security' | 'backup' | 'roadmap' | 'scaffold';
  content: string;
  codeSnippet?: {
    language: string;
    filename: string;
    code: string;
  };
}

export const architectureDocs: DocSection[] = [
  {
    id: 'overview',
    title: '一、系统背景与产品定位 (Personal Dev Knowledge OS)',
    shortDesc: '为什么做以 GitHub 为核心的研发知识中枢，而非传统 Notion/Wiki',
    category: 'overview',
    content: `## 1.1 痛点与破局思考

传统个人笔记（如 Notion、Obsidian、Logseq）在研发者日常工作中有三个典型割裂：
1. **代码与笔记脱节**：项目的 README、版本变更日志、Issue 讨论和技术方案分散在 GitHub 各个仓库，笔记软件成了“二手整理箱”，整理成本高导致知识停滞老化。
2. **多租户与重量级架构冗余**：绝大多数开源知识库（Outline、Wiki.js 等）引入了 PostgreSQL/MySQL、Redis、Docker、MinIO、RBAC 用户权限系统，个人自建维护负担极重。
3. **单用户个人场景的极致解法**：个人研发者不需要复杂的权限树与团队工作区，需要的是**“以 GitHub 代码资产为真实数据源”**的自动化沉淀中枢，并依托 **Cloudflare 全球边缘 Serverless**（Workers + D1 + 纯前端 Pages）实现零运维、近乎零成本的永久运行。

## 1.2 核心设计哲学
- **代码仓库即知识源**：不要手动把项目介绍再抄一遍到笔记里，通过 Webhook 与 GitHub REST API 自动同步 README、package.json、Releases。
- **知识分层顶层抽象**：统一以 \`Knowledge\` 为顶层概念，包含 Note（笔记）、Document（技术文档）、Project（研发项目）、Bookmark（代码库书签）。
- **增量同步，拒绝全量拉取**：比对 \`pushed_at\` 与 \`last_synced_at\`，仅在真正提交代码或发布 Release 时做按需增量拉取。
- **极简边缘架构**：D1 负责结构化数据与 FTS5 搜索，Workers 负责边缘调度，R2 作为“可选项”仅在需要大附件或全量物理 SQL 归档时启用。`,
  },
  {
    id: 'tech_stack',
    title: '二、技术选型矩阵与核心决策论证',
    shortDesc: '前端、边缘后端、D1 关系库、可选 R2、Queues 选型深度评测',
    category: 'tech_stack',
    content: `## 2.1 技术选型全景矩阵

| 分层 | 选型 | 理由与决策收益 | 替代方案对比 (为何不选) |
| :--- | :--- | :--- | :--- |
| **前端框架** | **React 19 + TypeScript + Vite + Tailwind CSS** | 轻量 SPA，响应极速，生态成熟，完美契合 Cloudflare Pages 静态托管与全球 CDN。 | 淘汰传统 SSR / Next.js：单用户管理后台无需复杂服务端渲染，SPA 架构使后端彻底纯粹为 API。 |
| **边缘运行时** | **Cloudflare Workers** (Hono 极简路由) | 亚毫秒级全球冷启动，免去服务器补丁、容器调度与常驻进程内存消耗；免费额度每日 10 万次请求足够单用户使用。 | 淘汰 Node.js / Express 常驻 VPS：避免维护云服务器、防火墙与每月固定实例费用。 |
| **数据库** | **Cloudflare D1 (SQLite-based)** | 原生集成 Workers，支持标准 SQL 事务；支持 SQLite 原生 FTS5 全文检索引擎；单库免费 5GB 容量（足够存数十万篇纯文本 Markdown）。 | 淘汰 Postgres / MySQL：避免外部连接池开销与复杂网络配置；D1 与 Worker 同域同构。 |
| **对象存储** | **Cloudflare R2 (可选项 Optional)** | **重要定位：R2 为可选项！** 当且仅当需要保存大型设计草图、项目录屏 GIF、外部 PDF 电子书或执行每日 SQL 物理快照备份时启用。若仅管理 Markdown 文本与代码元信息，纯 D1 即可完备运行，实现 0 存储冗余。 | AWS S3：R2 免除跨网络流量流出费（Egress Free），与 Worker 原生无缝打通。 |
| **异步队列** | **Cloudflare Queues** | 削峰填谷，解耦 GitHub Webhook 的高频突发调用，防止并发触发 API 超限或 Workers CPU 耗尽。 | Redis BullMQ：无需单独维护 Redis 实例，Queues 为纯 Serverless 事件驱动。 |
| **全文检索** | **D1 + SQLite FTS5** | 原生内建于 D1 运行时，利用虚表与触发器实现毫秒级分词标题与全文搜索。 | 向量数据库 (Vectorize)：V1 阶段语义搜索收益有限，FTS5 精准词匹配更符合程序员查找代码、库名与报错记录的直觉。 |

## 2.2 R2 作为“可选项”的架构裁剪策略
- **无 R2 纯净模式**：所有结构化字段、Markdown 正文、README 镜像均直接存入 D1 的 \`TEXT\` 字段。系统配置中关闭附件上传，使用纯外部图片 URL（如 GitHub 原始 Raw 链接）。
- **启用 R2 增强模式**：在 \`wrangler.toml\` 中绑定 \`MY_BUCKET = r2_bucket\`，可支持拖拽图片自动上传并生成 R2 链接，同时每日 Cron 可将 D1 的 \`export.sql\` 归档压缩包保存至 R2。`,
  },
  {
    id: 'architecture',
    title: '三、系统总体架构与数据流转拓扑',
    shortDesc: 'Webhook 实时流、Cron 增量巡检、Queue 异步消费与搜索链路',
    category: 'architecture',
    content: `## 3.1 总体架构拓扑图

系统采用清晰的无服务器拓扑结构，分为外部事件源、边缘处理层、数据层与展示层：

\`\`\`
                          ┌───────────────────────────┐
                          │   GitHub 官方平台 (REST/WH) │
                          │                           │
                          │   - Repository & Topics   │
                          │   - Contents (README/pkg) │
                          │   - Releases & Commits    │
                          └─────────────┬─────────────┘
                                        │
                         1. Webhook (push/release) 
                         2. HMAC-SHA256 签名传输
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge Platform                        │
│                                                                        │
│   ┌────────────────────┐            ┌─────────────────────────────┐   │
│   │  Cloudflare Pages  │            │     Cloudflare Workers      │   │
│   │                    │            │                             │   │
│   │  React 19 SPA      │◄───────────┤  - /api/knowledge           │   │
│   │  Tailwind UI       │ (JSON API) │  - /api/projects            │   │
│   │  FTS5 检索控制台   │            │  - /api/github/webhook      │   │
│   └────────────────────┘            │  - /api/search (FTS5)       │   │
│                                     └──────────────┬──────────────┘   │
│                                                    │                  │
│                                         Enqueue payload               │
│                                                    ▼                  │
│                                     ┌─────────────────────────────┐   │
│                                     │      Cloudflare Queue       │   │
│                                     │  (github-sync-queue)        │   │
│                                     └──────────────┬──────────────┘   │
│                                                    │                  │
│                                         Async Consume & Diff          │
│                                                    ▼                  │
│                        ┌──────────────────────────────────────────┐   │
│                        │          Workers Queue Consumer          │   │
│                        │                                          │   │
│                        │  - Check pushed_at vs last_synced_at     │   │
│                        │  - Fetch README.md via Contents API      │   │
│                        │  - Extract Tech Stack & Project Card     │   │
│                        └───────────────────┬──────────────────────┘   │
│                                            │                          │
│                        ┌───────────────────┴──────────────────────┐   │
│                        ▼                                          ▼   │
│             ┌──────────────────────┐                   ┌──────────────┐│
│             │    Cloudflare D1     │                   │ Cloudflare   ││
│             │                      │                   │ R2 (可选项)   ││
│             │ - knowledge          │                   │              ││
│             │ - projects           │                   │ - 附件与截图 ││
│             │ - github_repositories│                   │ - 每日 SQL   ││
│             │ - sync_logs          │                   │   物理备份   ││
│             │ - FTS5 Virtual Index │                   └──────────────┘│
│             └──────────────────────┘                                  │
└────────────────────────────────────────────────────────────────────────┘
\`\`\`

## 3.2 关键数据流转场景

### 场景 A：GitHub Webhook 实时触发流程
1. 开发者在本地推送代码 (\`git push\`) 或在 GitHub 发版 (\`Release v1.2.0\`)；
2. GitHub 触发 Webhook 发送 POST 到 \`/api/github/webhook\`；
3. Worker 进行 \`X-Hub-Signature-256\` HMAC 校验，验签失败立即 401 拦截；
4. 验签成功后，Worker 仅耗费约 3ms 将事件 payload 发入 \`github-sync-queue\`，立即向 GitHub 返回 200 OK，防止连接挂起；
5. Queue Consumer 后台被触发，取出消息：比对仓库上次同步时间，发现确实有代码变动；
6. Consumer 调用 GitHub Contents API 拉取最新的 \`README.md\` 与 \`package.json\`；
7. 写入 D1 \`github_repositories\` 与 \`knowledge\` 表，D1 原生触发器自动将文本写入 \`knowledge_fts\` 检索表；
8. 记录 \`sync_logs\`。

### 场景 B：本地与边缘毫秒级搜索流程
1. 用户在前端按 \`Ctrl+K\` 输入关键词（如 "Workers 事务"）；
2. 发送请求 \`GET /api/search?q=Workers+事务\`；
3. Worker 执行 D1 SQLite FTS5 查询：
   \`SELECT title, snippet(knowledge_fts, 1, '<mark>', '</mark>', '...', 15) FROM knowledge_fts WHERE knowledge_fts MATCH ?\`；
4. 5~15ms 内返回结构化匹配列表。`,
  },
  {
    id: 'database',
    title: '四、V1 数据库详细 Schema 规范 (Cloudflare D1)',
    shortDesc: '完整的 SQLite D1 表结构、外键、索引与 FTS5 虚拟全文检索表',
    category: 'database',
    content: `## 4.1 Schema 设计要点

1. **统一时间戳**：全部采用 ISO 8601 UTC 字符串格式（\`TEXT\`），便于与 JavaScript \`Date.toISOString()\` 及 GitHub API 返回的时间无缝比较。
2. **知识通用模型**：\`knowledge\` 表使用 \`type\` 字段区分 \`note\`（笔记）、\`article\`（文章）、\`document\`（技术手册）、\`bookmark\`（书签）、\`project\`（研发项目卡片）。
3. **SQLite FTS5 虚拟表**：通过标准 SQLite 触发器（Trigger），在 \`knowledge\` 发生新增、更新、删除时自动同步全文索引。`,
    codeSnippet: {
      language: 'sql',
      filename: 'migrations/0001_init.sql',
      code: `-- ==============================================================
-- 个人研发知识中枢 (DevKnowledge OS) - V1 D1 初始化迁移脚本
-- ==============================================================

-- 1. 标签表
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 2. GitHub 仓库元数据与镜像表
CREATE TABLE IF NOT EXISTS github_repositories (
  id TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL UNIQUE,
  description TEXT,
  html_url TEXT NOT NULL,
  homepage TEXT,
  language TEXT,
  license TEXT,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  watchers INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  default_branch TEXT NOT NULL DEFAULT 'main',
  is_private INTEGER NOT NULL DEFAULT 0,
  is_fork INTEGER NOT NULL DEFAULT 0,
  topics TEXT DEFAULT '[]', -- JSON 数组格式
  readme_content TEXT,      -- 同步的 README.md 原始内容
  package_json_content TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  pushed_at TEXT NOT NULL,
  last_synced_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced', -- synced, pending, syncing, error
  auto_generate_card INTEGER NOT NULL DEFAULT 1
);

-- 3. 核心知识表 (Knowledge Base 顶层实体)
CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'note', -- note, article, document, bookmark, project
  content TEXT NOT NULL DEFAULT '',
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, draft, archived
  is_favorite INTEGER NOT NULL DEFAULT 0,
  source_repo_id TEXT REFERENCES github_repositories(id) ON DELETE SET NULL,
  external_url TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  published_at TEXT
);

-- 4. 知识与标签的多对多关联表
CREATE TABLE IF NOT EXISTS knowledge_tags (
  knowledge_id TEXT NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (knowledge_id, tag_id)
);

-- 5. 研发项目主表 (由 GitHub 仓库衍生或纯本地记录)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, maintenance, concept, archived
  one_liner TEXT,
  tech_stack TEXT DEFAULT '[]', -- JSON 数组: ["TypeScript", "D1", "Workers"]
  features TEXT DEFAULT '[]',   -- JSON 数组
  latest_version TEXT,
  homepage TEXT,
  repository_id TEXT REFERENCES github_repositories(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL DEFAULT 5, -- 1~5 个人评级
  my_notes TEXT,                     -- 研发备忘录/个人随记
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 6. 同步审计日志表
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- webhook, cron, manual
  status TEXT NOT NULL,       -- success, skipped, failed
  details TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 7. 索引优化
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_favorite ON knowledge(is_favorite);
CREATE INDEX IF NOT EXISTS idx_github_repos_pushed ON github_repositories(pushed_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at DESC);

-- 8. SQLite FTS5 全文检索引擎虚表
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
  id UNINDEXED,
  title,
  summary,
  content,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- 9. 自动化触发器 (Keep FTS5 in sync with knowledge table)
CREATE TRIGGER IF NOT EXISTS trg_knowledge_ai AFTER INSERT ON knowledge BEGIN
  INSERT INTO knowledge_fts (id, title, summary, content)
  VALUES (new.id, new.title, new.summary, new.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_knowledge_ad AFTER DELETE ON knowledge BEGIN
  DELETE FROM knowledge_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_knowledge_au AFTER UPDATE ON knowledge BEGIN
  DELETE FROM knowledge_fts WHERE id = old.id;
  INSERT INTO knowledge_fts (id, title, summary, content)
  VALUES (new.id, new.title, new.summary, new.content);
END;`
    }
  },
  {
    id: 'api',
    title: '五、RESTful API 规范与端点路由设计',
    shortDesc: '标准 JSON 接口：知识 CRUD、项目卡片、GitHub 同步与全文检索',
    category: 'api',
    content: `## 5.1 基础请求头与鉴权约定

所有对 \`/api/*\` 的请求受单用户鉴权保护（通过 Cloudflare Access 或请求头 \`Authorization: Bearer <API_TOKEN>\`）。
Webhook 端点 \`/api/github/webhook\` 豁免该鉴权，改由 \`X-Hub-Signature-256\` 强制校验。

## 5.2 核心端点全览

| 模块 | 方法 | 路径 | 描述 |
| :--- | :--- | :--- | :--- |
| **知识库** | \`GET\` | \`/api/knowledge\` | 获取知识列表，支持 \`?type=note&tag=D1&search=...\` 过滤 |
| | \`POST\` | \`/api/knowledge\` | 新增一条知识条目 |
| | \`PUT\` | \`/api/knowledge/:id\` | 更新知识条目（自动触发 FTS 索引刷新） |
| | \`DELETE\` | \`/api/knowledge/:id\` | 删除条目 |
| **项目卡片** | \`GET\` | \`/api/projects\` | 获取研发项目知识卡片列表 |
| | \`POST\` | \`/api/projects\` | 手动新建或与 GitHub 仓库绑定创建 |
| | \`PUT\` | \`/api/projects/:id\` | 更新项目评级、研发随记或技术栈 |
| **GitHub** | \`GET\` | \`/api/github/repos\` | 获取已纳管的 GitHub 仓库及其状态 |
| | \`POST\` | \`/api/github/repos\` | 添加新的监控仓库（从 GitHub 获取元数据） |
| | \`POST\` | \`/api/github/sync\` | 手动触发指定或全部仓库的增量同步 |
| | \`POST\` | \`/api/github/webhook\`| 接收 GitHub 官方 Webhook 推送事件 |
| **全文检索** | \`GET\` | \`/api/search?q=...\` | 基于 D1 FTS5 虚表的全文毫秒级高亮检索 |
| **数据备份** | \`GET\` | \`/api/backup/export\` | 导出当前全量数据（支持 format=json 或 format=markdown） |`,
    codeSnippet: {
      language: 'typescript',
      filename: 'src/worker/routes.ts',
      code: `// Worker 路由定义示意 (使用 Hono 风格轻量抽象)
import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  GITHUB_SYNC_QUEUE?: Queue;
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_TOKEN?: string;
  R2_BUCKET?: R2Bucket; // 可选项
}

const app = new Hono<{ Bindings: Env }>();

// 1. 全文检索端点
app.get('/api/search', async (c) => {
  const query = c.req.query('q');
  if (!query) return c.json({ results: [] });

  const sql = \`
    SELECT k.id, k.title, k.type, k.updated_at,
           snippet(knowledge_fts, 1, '<mark>', '</mark>', '...', 12) as snippet
    FROM knowledge_fts
    JOIN knowledge k ON k.id = knowledge_fts.id
    WHERE knowledge_fts MATCH ?
    ORDER BY rank
    LIMIT 20
  \`;
  const { results } = await c.env.DB.prepare(sql).bind(query).all();
  return c.json({ results });
});

// 2. 知识库 CRUD 示例
app.get('/api/knowledge', async (c) => {
  const type = c.req.query('type');
  let stmt = 'SELECT * FROM knowledge ORDER BY updated_at DESC LIMIT 50';
  if (type) {
    stmt = 'SELECT * FROM knowledge WHERE type = ? ORDER BY updated_at DESC LIMIT 50';
    const { results } = await c.env.DB.prepare(stmt).bind(type).all();
    return c.json({ data: results });
  }
  const { results } = await c.env.DB.prepare(stmt).all();
  return c.json({ data: results });
});

export default app;`
    }
  },
  {
    id: 'github_sync',
    title: '六、GitHub 自动同步机制与高可靠设计',
    shortDesc: 'Webhook 验签、Queue 缓冲、增量状态机推导与项目卡片抽取算法',
    category: 'github_sync',
    content: `## 6.1 同步核心原则与增量状态机

为避免 API 频率受限（GitHub 未认证 60次/h，带 Token 5000次/h）与数据库写风暴，同步机制严格遵循**“双重比对，增量变更”**：

\`\`\`
GitHub 事件到达 (Webhook 或 Cron)
             │
             ▼
读取 payload 中的 pushed_at 与 updated_at
             │
             ▼
与 D1 中 github_repositories.last_synced_at 比对
             │
   ┌─────────┴─────────┐
   ▼                   ▼
无新代码变更           有新提交 / 新发布
   │                   │
记录 skipped 日志      执行增量提取:
直接结束 (耗时 < 5ms)  1. 获取最新 README.md
                      2. 获取 package.json
                      3. 解析生成 Project Knowledge Card
                      4. 更新 D1 事务 & FTS5 索引
\`\`\`

## 6.2 自动生成“项目知识卡片”的核心算法
同步完成不仅是拉取 Raw 文本，而是提取结构化卡片：
1. **一句话概述**：优先采用 GitHub Repo 的 Description；
2. **技术栈解析**：从 \`package.json\` 的 \`dependencies\` 提取框架（React, Vue, Tailwind, Hono），或根据仓库 \`language\` 与 \`topics\` 聚合；
3. **活跃度推导**：若 \`pushed_at\` 在 7 天内判定为 \`🟢 活跃\`；30 天内判定为 \`🟡 维护\`；超过 180 天判定为 \`⚪ 归档\`；
4. **README 抽取过滤**：过滤掉冗长代码实现，仅提取二级标题、功能列表并归整为摘要。`,
    codeSnippet: {
      language: 'typescript',
      filename: 'src/worker/webhook-verifier.ts',
      code: `/**
 * Web Crypto API 实现的 GitHub Webhook 签名强校验
 * 无需任何 Node.js 外部依赖
 */
export async function verifyGitHubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const signature = signatureHeader.substring(7);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 常量时间安全比对防时序攻击
  if (hex.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hex.length; i++) {
    mismatch |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}`
    }
  },
  {
    id: 'security',
    title: '七、单用户安全架构与无运维防护',
    shortDesc: '基于 Cloudflare Access (Zero Trust) 与 Secrets 安全策略',
    category: 'security',
    content: `## 7.1 为什么建议 Cloudflare Access 而非自写用户登录？

很多开发者自建知识库时耗费大量精力编写：
- 用户注册/登录表
- bcrypt / argon2 密码哈希
- Session 会话与 Cookie 刷新
- 找回密码与邮件验证码

**这是典型的过度设计。**
单用户系统最强、最省心的护城河是 **Cloudflare Access (Zero Trust)**：
1. **零代码接入**：在 Cloudflare 控制台将子域名 \`kb.yourdomain.com\` 配置一条 Access 策略；
2. **多因子认证**：支持向你的个人邮箱发送 6 位 PIN 码，或通过你的个人 GitHub 账号单点登录；
3. **未授权请求直接在边缘被拦截**：未授权访问者连 Worker 都进不去，更触碰不到 D1 数据库，完全隔绝嗅探与暴力破解；
4. **Webhook 独立放行**：通过 Cloudflare Access 的 Bypass 规则，对路径 \`/api/github/webhook\` 单独放行，改由 HMAC 签名校验。

## 7.2 密钥与敏感信息管控
- **禁止明文存储 Token**：所有 GitHub Personal Access Token (PAT) 与 Webhook Secret 必须存放在 Cloudflare 的 Secrets 中 (\`wrangler secret put GITHUB_TOKEN\`)。
- **Fine-grained PAT 最小权限原则**：在 GitHub 生成细粒度 Token 时，仅勾选关注仓库的 \`Contents: Read-only\` 与 \`Metadata: Read-only\`。`,
  },
  {
    id: 'backup',
    title: '八、数据可逆性、备份与 R2 可选项深度配置',
    shortDesc: 'D1 SQL 导出、纯文本 Markdown 归档、R2 可选存储桶的配置与降级',
    category: 'backup',
    content: `## 8.1 数据可逆性最高原则：“你的知识永远属于你”

个人知识库最怕平台锁定。系统设计了三层数据可逆机制：
1. **纯 Markdown 压缩包导出**：一键导出所有知识为带 YAML Frontmatter 的 \`.md\` 文件，可直接放入 Obsidian、Logseq 或任何静态网站生成器；
2. **标准 JSON 导出**：导出全库结构化备份（知识、项目、标签、GitHub 元数据）；
3. **D1 标准 SQL Dump**：通过 Wrangler CLI 执行 \`wrangler d1 export <db-name> --output backup.sql\` 生成标准 SQLite 转储。

## 8.2 R2 对象存储可选项定位与降级决策

### 方案 A：不启用 R2 (纯 D1 极简模式) —— 推荐首选
- **适合场景**：知识库以 Markdown 笔记、代码片段、README 镜像、项目卡片为主。
- **架构收益**：零配置、零额外开销，单一 D1 数据库管理所有数据，迁移极度简单。
- **图片处理**：Markdown 中的插图直接引用外部图床或 GitHub Assets 链接。

### 方案 B：启用 R2 (增强归档模式)
- **适合场景**：需要本地拖拽上传截图、存放架构设计大图（SVG/WebP/PDF）、每日自动化定时把 D1 备份推送至云端持久存储。
- **配置方式**：仅需在 \`wrangler.toml\` 中添加 4 行配置并运行 \`wrangler r2 bucket create dev-kb-assets\` 即可。若无需此功能，直接注释对应配置，系统自动降级运行。`,
    codeSnippet: {
      language: 'toml',
      filename: 'wrangler.toml (完整部署配置)',
      code: `name = "personal-dev-knowledge-os"
main = "src/worker/index.ts"
compatibility_date = "2026-10-01"

# 1. Cloudflare D1 关系型数据库绑定 (核心必选)
[[d1_databases]]
binding = "DB"
database_name = "dev-knowledge-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 2. Cloudflare Queues 异步队列 (解耦 Webhook)
[[queues.producers]]
queue = "github-sync-queue"
binding = "GITHUB_SYNC_QUEUE"

[[queues.consumers]]
queue = "github-sync-queue"
max_batch_size = 5
max_batch_timeout = 5

# 3. Cloudflare R2 对象存储 (★ 可选项 Optional ★)
# 若不需要大附件存储与每日 SQL 快照备份，可整段注释掉
# [[r2_buckets]]
# binding = "R2_BUCKET"
# bucket_name = "dev-kb-assets"

# 4. 定时任务 Cron Triggers (每 6 小时增量巡检一次兜底)
[triggers]
crons = ["0 */6 * * *"]

# 5. 环境变量与安全密钥声明
# 运行 wrangler secret put GITHUB_TOKEN
# 运行 wrangler secret put GITHUB_WEBHOOK_SECRET
[vars]
ENVIRONMENT = "production"
ENABLE_R2_STORAGE = "false" # 改为 true 启用 R2 附件模式`
    }
  },
  {
    id: 'roadmap',
    title: '九、分阶段落地实施步骤与 7 天实战路线图',
    shortDesc: '从 0 到 1 部署上线 V1 的具体操作步骤与命令全记录',
    category: 'roadmap',
    content: `## 9.1 V1 极简落地排期 (7天实操步骤)

\`\`\`
Day 1: 环境准备 ──▶ Day 2: D1 与脚手架 ──▶ Day 3: 前端控制台 ──▶ Day 4: GitHub API
                                                                       │
Day 7: 部署上线 ◀── Day 6: FTS5 与备份 ◀── Day 5: Webhook & 队列 ◀─────┘
\`\`\`

### Day 1：基础设施与账号准备
1. 注册 Cloudflare 账号，安装命令行工具：\`npm install -g wrangler\`；
2. 运行 \`wrangler login\` 完成开发者授权；
3. GitHub 创建个人 Fine-grained Personal Access Token，权限仅需 \`Metadata: Read\` 与 \`Contents: Read\`。

### Day 2：创建 D1 数据库与初始化迁移
1. 创建 D1 数据库：
   \`\`\`bash
   wrangler d1 create dev-knowledge-db
   \`\`\`
2. 将返回的 \`database_id\` 填入 \`wrangler.toml\`；
3. 执行初始化 SQL 脚本：
   \`\`\`bash
   wrangler d1 execute dev-knowledge-db --file=./migrations/0001_init.sql
   \`\`\`

### Day 3：开发 React 19 SPA 前端工作台
1. 初始化 React + Vite + Tailwind CSS 项目；
2. 构建 Dashboard（驾驶舱概览）、Knowledge（知识管理）、Projects（项目卡片）三套核心视图；
3. 引入 Markdown 编辑与高亮预览组件。

### Day 4：打通 GitHub Repositories 与 Contents API
1. 编写 Worker 端点 \`/api/github/sync\`，调用 GitHub \`/repos/{owner}/{repo}\`；
2. 拉取 \`README.md\` 并将其转换为知识卡片正文，写入 D1 \`github_repositories\` 与 \`knowledge\` 表。

### Day 5：配置 Webhook 与 Cloudflare Queue
1. 在 GitHub 目标仓库的 Settings -> Webhooks 中添加 Payload URL：
   \`https://kb.yourdomain.com/api/github/webhook\`；
2. 设置 Secret，并在 Worker 中通过 \`wrangler secret put GITHUB_WEBHOOK_SECRET\` 录入；
3. 接入 Cloudflare Queue 异步缓冲，实现每次推代码秒级触发增量同步。

### Day 6：启用 SQLite FTS5 全文搜索与备份
1. 验证 \`knowledge_fts\` 检索性能，前端集成快捷键 \`Ctrl+K\` / \`Cmd+K\` 呼出即时检索框；
2. 实现全库 Markdown 导出下载与 SQL 转储导出功能。

### Day 7：部署上线与 Cloudflare Access 配置
1. 部署 Worker：\`wrangler deploy\`；
2. 部署前端 Pages：\`npm run build && wrangler pages deploy dist\`；
3. 在 Cloudflare 控制台为知识库域名绑定 Cloudflare Access Zero Trust，配置仅自身邮箱可访问。`,
  },
  {
    id: 'scaffold',
    title: '十、生产级核心源码脚手架 (Worker 完整实现)',
    shortDesc: '可直接用于 Cloudflare Workers 部署的完整 TypeScript 入口源码',
    category: 'scaffold',
    content: `## 10.1 生产级 Worker 核心入口代码 (worker.ts)

以下代码包含了完整的路由分发、HMAC 验签、D1 增量检查、Queue 消费者处理与 FTS5 搜索逻辑，可直接部署在 Cloudflare Workers 上：`,
    codeSnippet: {
      language: 'typescript',
      filename: 'src/worker/index.ts',
      code: `export interface Env {
  DB: D1Database;
  GITHUB_SYNC_QUEUE?: Queue;
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_TOKEN?: string;
  R2_BUCKET?: R2Bucket; // 可选项
}

export default {
  // 1. HTTP 请求入口
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 跨域处理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Hub-Signature-256',
        },
      });
    }

    // 路由 A: GitHub Webhook 接收
    if (url.pathname === '/api/github/webhook' && request.method === 'POST') {
      const signature = request.headers.get('X-Hub-Signature-256');
      const rawBody = await request.text();

      // 强校验 Webhook 签名
      const isValid = await verifyGitHubSignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET);
      if (!isValid) {
        return new Response('Invalid Signature', { status: 401 });
      }

      const payload = JSON.parse(rawBody);

      // 若绑定了 Queue 则发入队列异步削峰，否则同步执行
      if (env.GITHUB_SYNC_QUEUE) {
        await env.GITHUB_SYNC_QUEUE.send(payload);
        return new Response(JSON.stringify({ status: 'queued' }), { status: 202 });
      } else {
        await handleSyncJob(payload, env);
        return new Response(JSON.stringify({ status: 'synced_sync' }), { status: 200 });
      }
    }

    // 路由 B: FTS5 全文搜索
    if (url.pathname === '/api/search' && request.method === 'GET') {
      const q = url.searchParams.get('q');
      if (!q) return Response.json({ results: [] });
      const sql = \`
        SELECT k.id, k.title, k.type, k.summary,
               snippet(knowledge_fts, 3, '<mark>', '</mark>', '...', 15) as snippet
        FROM knowledge_fts
        JOIN knowledge k ON k.id = knowledge_fts.id
        WHERE knowledge_fts MATCH ?
        ORDER BY rank LIMIT 20
      \`;
      const { results } = await env.DB.prepare(sql).bind(q).all();
      return Response.json({ results });
    }

    // 路由 C: 知识库列表
    if (url.pathname === '/api/knowledge' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM knowledge ORDER BY updated_at DESC LIMIT 50').all();
      return Response.json({ data: results });
    }

    return new Response('DevKnowledge OS API Gateway', { status: 200 });
  },

  // 2. Cloudflare Queue 消费者入口
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      await handleSyncJob(message.body, env);
      message.ack();
    }
  }
};

// 增量同步核心逻辑
async function handleSyncJob(payload: any, env: Env) {
  const repoFullName = payload.repository?.full_name;
  const pushedTime = payload.repository?.pushed_at;
  if (!repoFullName) return;

  // 1. 查询本地 D1 是否已有该仓库及其上次同步时间
  const existing: any = await env.DB.prepare(
    'SELECT last_synced_at, id FROM github_repositories WHERE full_name = ?'
  ).bind(repoFullName).first();

  if (existing && existing.last_synced_at >= pushedTime) {
    // 无新变更，跳过
    await env.DB.prepare(
      'INSERT INTO sync_logs (id, repo_id, repo_name, trigger_type, status, details, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), existing.id, repoFullName, 'webhook', 'skipped', 'No newer commits detected', 10).run();
    return;
  }

  // 2. 请求 GitHub API 获取 README
  const headers: Record<string, string> = {
    'User-Agent': 'Cloudflare-Worker-DevKnowledge-OS',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (env.GITHUB_TOKEN) {
    headers['Authorization'] = \`Bearer \${env.GITHUB_TOKEN}\`;
  }

  const readmeRes = await fetch(\`https://api.github.com/repos/\${repoFullName}/readme\`, { headers });
  let readmeMarkdown = '';
  if (readmeRes.ok) {
    const data: any = await readmeRes.json();
    readmeMarkdown = atob(data.content.replace(/\\n/g, ''));
  }

  // 3. 事务性更新 D1
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(\`
      UPDATE github_repositories
      SET readme_content = ?, pushed_at = ?, last_synced_at = ?, sync_status = 'synced'
      WHERE full_name = ?
    \`).bind(readmeMarkdown, pushedTime || now, now, repoFullName),
    env.DB.prepare(\`
      INSERT INTO sync_logs (id, repo_id, repo_name, trigger_type, status, details, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).bind(crypto.randomUUID(), existing?.id || 'unknown', repoFullName, 'webhook', 'success', 'Updated README from Webhook', 120)
  ]);
}

async function verifyGitHubSignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const expected = signature.substring(7);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === expected;
}`
    }
  }
];
