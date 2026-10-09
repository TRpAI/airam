import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Download, 
  Info,
  Database,
  FileCode,
  CheckCircle2
} from 'lucide-react';
import { MIGRATION_SQL } from '../data/migrationSql';

export const ScaffoldView: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'wrangler' | 'schema' | 'worker' | 'readme'>('schema');
  const [copied, setCopied] = useState(false);

  const files = {
    wrangler: {
      name: 'wrangler.toml',
      language: 'toml',
      description: 'Cloudflare Workers 配置文件，绑定 D1、Queues 与可选 R2',
      content: `name = "airam"
main = "src/worker/index.ts"
compatibility_date = "2026-10-01"

# 1. Cloudflare D1 关系型数据库 (核心必选)
[[d1_databases]]
binding = "DB"
database_name = "airam-db"
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
# 若不需要大附件存储与每日 SQL 快照备份，可整段注释掉以保持极简
# [[r2_buckets]]
# binding = "R2_BUCKET"
# bucket_name = "dev-kb-assets"

# 4. 定时任务 Cron Triggers (每 6 小时增量巡检一次兜底)
[triggers]
crons = ["0 */6 * * *"]

# 5. 环境变量与安全密钥
# 运行:
#   wrangler secret put GITHUB_TOKEN
#   wrangler secret put GITHUB_WEBHOOK_SECRET
[vars]
ENVIRONMENT = "production"
ENABLE_R2_STORAGE = "false" # 改为 true 启用 R2 增强模式`,
    },
    schema: {
      name: 'migrations/0001_init.sql',
      language: 'sql',
      description: '标准 SQLite D1 表结构迁移，含 FTS5 虚表与触发器 (物理路径: migrations/0001_init.sql)',
      content: MIGRATION_SQL,
    },
    worker: {
      name: 'src/worker/index.ts',
      language: 'typescript',
      description: '生产级 Worker 入口，包含 HMAC 验签、增量 Diff、Queue 消费与 FTS5',
      content: `export interface Env {
  DB: D1Database;
  GITHUB_SYNC_QUEUE?: Queue;
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_TOKEN?: string;
  R2_BUCKET?: R2Bucket; // 可选项
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Hub-Signature-256',
        },
      });
    }

    // 1. Webhook 接收与验签
    if (url.pathname === '/api/github/webhook' && request.method === 'POST') {
      const signature = request.headers.get('X-Hub-Signature-256');
      const rawBody = await request.text();

      const isValid = await verifyGitHubSignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET);
      if (!isValid) {
        return new Response('Invalid Signature', { status: 401 });
      }

      const payload = JSON.parse(rawBody);
      if (env.GITHUB_SYNC_QUEUE) {
        await env.GITHUB_SYNC_QUEUE.send(payload);
        return new Response(JSON.stringify({ status: 'enqueued' }), { status: 202 });
      } else {
        await processSync(payload, env);
        return new Response(JSON.stringify({ status: 'synced' }), { status: 200 });
      }
    }

    // 2. FTS5 全文搜索
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

    return new Response('Personal Dev Knowledge OS Edge API', { status: 200 });
  },

  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      await processSync(msg.body, env);
      msg.ack();
    }
  }
};

async function processSync(payload: any, env: Env) {
  const repoFullName = payload.repository?.full_name;
  const pushedTime = payload.repository?.pushed_at;
  if (!repoFullName) return;

  const existing: any = await env.DB.prepare(
    'SELECT last_synced_at, id FROM github_repositories WHERE full_name = ?'
  ).bind(repoFullName).first();

  if (existing && existing.last_synced_at >= pushedTime) {
    return;
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Cloudflare-Worker-DevKnowledge-OS',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (env.GITHUB_TOKEN) {
    headers['Authorization'] = \`Bearer \${env.GITHUB_TOKEN}\`;
  }

  const res = await fetch(\`https://api.github.com/repos/\${repoFullName}/readme\`, { headers });
  let readme = '';
  if (res.ok) {
    const data: any = await res.json();
    readme = atob(data.content.replace(/\\n/g, ''));
  }

  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(\`
      UPDATE github_repositories
      SET readme_content = ?, pushed_at = ?, last_synced_at = ?
      WHERE full_name = ?
    \`).bind(readme, pushedTime || now, now, repoFullName),
    env.DB.prepare(\`
      INSERT INTO sync_logs (id, repo_id, repo_name, trigger_type, status, details, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).bind(crypto.randomUUID(), existing?.id || 'manual', repoFullName, 'webhook', 'success', 'Updated via Webhook', 110)
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
}`,
    },
    readme: {
      name: 'DEPLOY.md',
      language: 'markdown',
      description: '100% 纯控制台图形界面部署指南（免命令行，浏览器全流程完成）',
      content: `# airam 纯控制台图形界面部署指南 (100% 免命令行)

## 第一步：在 GitHub 网页创建仓库
1. 打开 github.com -> 点击右上角「+」-> New repository。
2. 仓库名填 airam -> 点击 Create repository。
3. 将项目代码推送到该仓库（或通过网页上传）。

## 第二步：在 Cloudflare 图形界面创建 D1 数据库并建表
1. 打开 Cloudflare 控制台 (dash.cloudflare.com) -> 点击左侧「Storage & Databases」->「D1 SQL Database」。
2. 点击右上角蓝色「Create database」按钮 -> 输入名称 airam-db -> 点击 Create 保存。
3. 点击 airam-db -> 切换到「Console」控制台选项卡。
4. 复制本项目 migrations/0001_init.sql 中的全部 SQL 代码，粘贴到网页输入框，点击右下角「Execute」执行。

## 第三步：在 Cloudflare 图形界面连接 Git 部署 Pages 应用
1. 点击左侧「Workers & Pages」-> 点击「Create application」-> 切换到「Pages」-> 点击「Connect to Git」。
2. 授权并选中你在第一步创建的 airam 仓库。
3. 构建配置：
   - Framework preset: 选择 Vite
   - Build command: 保持 npm run build
   - Build output directory: 保持 dist
4. 展开「Environment variables (advanced)」添加两个加密密钥：
   - GITHUB_TOKEN (你的 GitHub PAT，点击右侧锁图标加密)
   - GITHUB_WEBHOOK_SECRET (自定义密钥字符串，点击锁图标加密)
5. 点击「Save and Deploy」保存并部署！几秒后即生成访问网址 (如 https://airam.pages.dev)。

## 第四步：在图形界面绑定 D1 数据库
1. 在 Pages 项目详情页点击「Settings」->「Functions」。
2. 找到「D1 database bindings」点击「Add binding」：
   - Variable name 填: DB (大写)
   - D1 database 选择: airam-db
3. 点击 Save 保存，然后在 Deployments 中点击最新的部署重试一次使绑定生效。

## 第五步：在 GitHub 网页配置 Webhook 自动同步
1. 打开你的 GitHub 项目仓库 -> Settings -> Webhooks -> 点击 Add webhook。
2. Payload URL 填写你的 Pages 网址加 /api/github/webhook。
3. Content type 选 application/json，Secret 填入第三步设置的密钥。
4. 勾选 Pushes 和 Releases 事件 -> 保存即可！

## 第六步：在 Cloudflare 图形界面配置 Zero Trust 单用户保护 (Access)
1. 点击左侧「Zero Trust」->「Access」->「Applications」->「Add an application」。
2. 选择「Self-hosted（自托管应用）」：
   - Application name 填: airam Edge Protection
   - Application domain 填你的 Pages 域名 (如 airam.pages.dev)
3. 策略规则 (Policy)：
   - Action 选 Allow
   - Include -> Emails 填你的管理员邮箱: trpai_bot@outlook.com
4. 路径放行 (Bypass)：
   - 为 /api/github/webhook 添加一条 Bypass 策略，允许 GitHub Webhook 自动化免密推送！`,
    }
  };

  const current = files[activeFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([current.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.name.split('/').pop() || current.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
            Cloudflare 部署脚手架
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            开箱即用的 D1 迁移脚本、Wrangler 配置文件与边缘 Worker 源码
          </p>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 transition-colors self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          <span>下载此文件</span>
        </button>
      </div>

      {/* Migration File Location & Usage Callout */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-xs font-mono text-zinc-700 dark:text-zinc-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Database className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>数据库迁移文件位置：</span>
              <code className="px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-bold">
                migrations/0001_init.sql
              </code>
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              文件已存在于项目根目录的 <span className="text-zinc-700 dark:text-zinc-300">migrations/</span> 文件夹内。在 Cloudflare D1 网页控制台的 Console 中直接粘贴执行即可完成建表。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveFile('schema');
              navigator.clipboard.writeText(files.schema.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white dark:bg-emerald-500 text-[11px] font-mono hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Copy className="h-3 w-3" />
            <span>一键复制建表 SQL</span>
          </button>
        </div>
      </div>

      {/* Editor Box */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 overflow-hidden">
        
        {/* Tabs Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: 'schema', label: 'migrations/0001_init.sql' },
              { id: 'wrangler', label: 'wrangler.toml' },
              { id: 'worker', label: 'worker/index.ts' },
              { id: 'readme', label: 'DEPLOY.md' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setActiveFile(f.id as any);
                  setCopied(false);
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  activeFile === f.id
                    ? 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-xs font-mono transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">已复制</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>复制代码</span>
              </>
            )}
          </button>
        </div>

        {/* File Note */}
        <div className="px-3.5 py-1.5 bg-zinc-100/50 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800/60 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <Info className="h-3 w-3" />
          <span>{current.description}</span>
        </div>

        {/* Code Content */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 overflow-x-auto max-h-[520px] font-mono text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
          <pre className="whitespace-pre">{current.content}</pre>
        </div>

      </div>

    </div>
  );
};
