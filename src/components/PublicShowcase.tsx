import React, { useState, useMemo } from 'react';
import { 
  FolderGit2, 
  FileText, 
  ExternalLink, 
  GitBranch, 
  Star, 
  Search, 
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Clock,
  Database,
  Download,
  Terminal,
  Info
} from 'lucide-react';
import { KnowledgeItem, Project, GitHubRepository } from '../types';
import { GitHubUser } from '../types/auth';
import { PWAInstallButton } from './PWAInstallButton';
import { MIGRATION_SQL } from '../data/migrationSql';

interface PublicShowcaseProps {
  knowledge: KnowledgeItem[];
  projects: Project[];
  repos: GitHubRepository[];
  onGoToAdmin: () => void;
  onOpenSearch: () => void;
  user: GitHubUser | null;
}

export const PublicShowcase: React.FC<PublicShowcaseProps> = ({
  knowledge,
  projects,
  repos,
  onGoToAdmin,
  onOpenSearch,
  user,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'projects' | 'knowledge' | 'migrations' | 'deploy'>('all');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleDownloadSql = () => {
    const blob = new Blob([MIGRATION_SQL], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '0001_init.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Selected note for reader modal/view
  const activeDoc = useMemo(() => {
    if (!selectedDocId) return null;
    return knowledge.find((k) => k.id === selectedDocId) || null;
  }, [knowledge, selectedDocId]);

  const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      
      {/* 1. Developer Hero Card (Minimalist & Punchy) */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full border border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {user ? (
                <img src={user.avatar_url} alt={user.login} className="h-full w-full object-cover" />
              ) : (
                <span className="text-emerald-500">DH</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {user ? user.name : 'Osa Hermes'}
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  @{user ? user.login : 'osahermes'}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                全栈独立开发者 · 聚焦于 Cloudflare Workers、边缘 Serverless 架构与高质量研发资产沉淀。
              </p>
            </div>
          </div>

          {/* Right Action: PWA Install, D1 SQL & Go to Admin */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSection('migrations')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono transition-colors"
              title="查看 Cloudflare D1 数据库迁移文件 (migrations/0001_init.sql)"
            >
              <Database className="h-3.5 w-3.5" />
              <span>D1 迁移脚本</span>
            </button>
            <PWAInstallButton variant="minimal" />
            <button
              onClick={onGoToAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90 transition-opacity"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>管理后台</span>
            </button>
          </div>
        </div>

        {/* Public Stack & Stats Inline Bar */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>TypeScript</span>
            <span>·</span>
            <span>Cloudflare D1</span>
            <span>·</span>
            <span>Edge Workers</span>
            <span>·</span>
            <span>React</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
            <span>⭐ {totalStars} GitHub Stars</span>
            <span>·</span>
            <span>{projects.length} 个公开项目</span>
            <span>·</span>
            <span>{knowledge.length} 篇知识手记</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Pills: All / Projects / Knowledge / Migrations / Deploy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 gap-2">
        <div className="flex items-center space-x-1 text-xs font-mono overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: 'all', label: '全部精选' },
            { id: 'projects', label: `开源项目 (${projects.length})` },
            { id: 'knowledge', label: `知识手记 (${knowledge.length})` },
            { id: 'migrations', label: 'D1 数据库迁移 (0001_init.sql)' },
            { id: 'deploy', label: '控制台部署教程' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenSearch}
          className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
        >
          <Search className="h-3.5 w-3.5" />
          <span>全局检索</span>
        </button>
      </div>

      {/* 3. Featured Projects Showcase */}
      {(activeSection === 'all' || activeSection === 'projects') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              精选研发项目
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">真实代码资产</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const matchedRepo = repos.find((r) => r.id === proj.repository_id);
              return (
                <div
                  key={proj.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-5 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                            {proj.name}
                          </h3>
                          {proj.latest_version && (
                            <span className="text-[10px] font-mono text-zinc-400">
                              {proj.latest_version}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                          {proj.one_liner}
                        </p>
                      </div>

                      <span className="text-xs font-mono text-zinc-500 shrink-0">
                        {proj.rating}.0★
                      </span>
                    </div>

                    {/* Tech Stacks */}
                    <div className="mt-3 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      {proj.tech_stack.join(' · ')}
                    </div>

                    {/* Features */}
                    <ul className="mt-3 space-y-1">
                      {proj.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                          <span className="text-zinc-400">-</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Bottom Links */}
                  <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${proj.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      <span>{proj.status === 'active' ? '活跃' : '维护'}</span>
                    </span>

                    <div className="flex items-center gap-3">
                      {matchedRepo && (
                        <a
                          href={matchedRepo.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1"
                        >
                          <GitBranch className="h-3 w-3" />
                          <span>GitHub ({matchedRepo.stars}★)</span>
                        </a>
                      )}
                      {proj.homepage && (
                        <a
                          href={proj.homepage}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1"
                        >
                          <span>主页</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Public Knowledge Base Reader */}
      {(activeSection === 'all' || activeSection === 'knowledge') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              公开技术手记与架构文档
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">点击查阅全文</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/30 overflow-hidden">
            {knowledge.map((k) => (
              <div
                key={k.id}
                onClick={() => setSelectedDocId(k.id)}
                className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100 hover:underline">
                      {k.title}
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      {k.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {k.summary || k.content.slice(0, 80)}
                  </p>
                  <div className="text-[11px] font-mono text-zinc-400 space-x-2">
                    <span>{k.tags.map((t) => `#${t}`).join(' ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-xs font-mono text-zinc-400">
                  <span>{new Date(k.updated_at).toLocaleDateString()}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Cloudflare D1 Database Migration (migrations/0001_init.sql) */}
      {activeSection === 'migrations' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-500" />
                <span>Cloudflare D1 数据库初始化迁移脚本</span>
              </h2>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                物理文件路径：<span className="text-emerald-600 dark:text-emerald-400 font-semibold">migrations/0001_init.sql</span>（项目根目录）
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90 transition-opacity"
              >
                {copiedSql ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>已复制全部 SQL</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>一键复制 SQL</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadSql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>下载 .sql 文件</span>
              </button>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-2 text-xs font-mono text-zinc-600 dark:text-zinc-300">
            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-emerald-500" />
              <span>Cloudflare 网页控制台 3 步执行说明 (100% 免命令行)：</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li>打开 <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-emerald-500 underline">Cloudflare 控制台</a>，进入 <strong>Storage & Databases</strong> → <strong>D1 SQL Database</strong>。</li>
              <li>点击创建好的 <strong>airam-db</strong>，切换到 <strong>Console</strong>（控制台）选项卡。</li>
              <li>点击上方 <strong>「一键复制 SQL」</strong> 按钮，粘贴到网页控制台输入框，点击右下角 <strong>Execute</strong> 执行建表！</li>
            </ol>
          </div>

          {/* SQL Code Box */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
            <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
              <span>migrations/0001_init.sql (标准 SQLite D1 表结构 + FTS5 全文索引)</span>
              <span>126 行 SQL</span>
            </div>
            <div className="p-4 overflow-x-auto max-h-[500px] font-mono text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed bg-zinc-50 dark:bg-zinc-950">
              <pre className="whitespace-pre">{MIGRATION_SQL}</pre>
            </div>
          </div>
        </div>
      )}

      {/* 6. Cloudflare GUI Console Deployment Guide */}
      {activeSection === 'deploy' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h2 className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-500" />
              <span>airam 纯控制台图形界面部署指南 (100% 免命令行)</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              只需在 Cloudflare 控制台与 GitHub 网页操作，全程鼠标点击即可上线，无需本地终端。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 font-mono text-xs">
            {/* Step 1 */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
                <span className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[11px]">1</span>
                <span>托管代码至 GitHub</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed pl-7">
                登录 GitHub，新建仓库名为 <code>airam</code>（公开或私有均可），将本项目代码上传至该仓库。
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
                <span className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[11px]">2</span>
                <span>在 Cloudflare 控制台创建 D1 数据库并执行迁移</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed pl-7">
                在控制台左侧点击 <strong>Storage & Databases → D1 SQL Database</strong> → <strong>Create database</strong>，输入 <code>airam-db</code>。<br/>
                进入该数据库的 <strong>Console</strong>，复制项目根目录下的 <code>migrations/0001_init.sql</code> 粘贴并点击 <strong>Execute</strong> 运行建表。
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
                <span className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[11px]">3</span>
                <span>创建 Pages 网页应用并连接 Git</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed pl-7">
                进入 <strong>Workers & Pages → Create application → Pages → Connect to Git</strong>，选择 <code>airam</code> 仓库。<br/>
                - <strong>Framework preset</strong>: 选择 <code>Vite</code><br/>
                - <strong>Build command</strong>: <code>npm run build</code><br/>
                - <strong>Build output directory</strong>: <code>dist</code><br/>
                在 Environment variables 中添加 <code>GITHUB_TOKEN</code> 和 <code>GITHUB_WEBHOOK_SECRET</code>，点击 <strong>Save and Deploy</strong>！
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
                <span className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[11px]">4</span>
                <span>在 Pages 设置中绑定 D1 数据库</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed pl-7">
                进入 Pages 项目详情 → <strong>Settings → Functions → D1 database bindings</strong> → 点击 <strong>Add binding</strong>：<br/>
                - Variable name: <code>DB</code> (大写)<br/>
                - D1 database: 选择 <code>airam-db</code><br/>
                保存后在 Deployments 选项卡重新触发部署一次即可生效。
              </p>
            </div>

            {/* Step 5 */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
                <span className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[11px]">5</span>
                <span>在 GitHub 配置 Webhook 实现推送自动同步</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed pl-7">
                打开你的 GitHub 仓库 → <strong>Settings → Webhooks → Add webhook</strong>：<br/>
                - Payload URL: 填入你的 Pages 网址加上 <code>/api/github/webhook</code><br/>
                - Content type: <code>application/json</code><br/>
                - 勾选 <strong>Pushes</strong> 与 <strong>Releases</strong> 事件，保存即可享受全自动资产归档！
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Article Reader Modal (Clean Minimalist Reader) */}
      {activeDoc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedDocId(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-5 sm:p-7 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <span className="text-xs font-mono text-zinc-400 uppercase">
                {activeDoc.type} · {new Date(activeDoc.updated_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(activeDoc.content)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  title="复制 Markdown"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setSelectedDocId(null)}
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  关闭 (ESC)
                </button>
              </div>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {activeDoc.title}
              </h1>
              {activeDoc.summary && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 border-l-2 border-zinc-300 dark:border-zinc-700 pl-3 italic">
                  {activeDoc.summary}
                </p>
              )}
            </div>

            <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed space-y-3 pt-2">
              {renderReaderMarkdown(activeDoc.content)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function renderReaderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  lines.forEach((line, idx) => {
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLines = [];
      } else {
        inCode = false;
        elements.push(
          <div key={`code-${idx}`} className="my-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2.5 font-mono text-xs text-zinc-800 dark:text-zinc-200 overflow-x-auto">
            <pre className="whitespace-pre">{codeLines.join('\n')}</pre>
          </div>
        );
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith('# ')) {
      elements.push(<h2 key={idx} className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-4 mb-1">{line.replace('# ', '')}</h2>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={idx} className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-3 mb-1">{line.replace('## ', '')}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">{line.replace(/^[-*]\s*/, '')}</li>);
    } else if (line.trim() === '') {
      elements.push(<div key={idx} className="h-1" />);
    } else {
      elements.push(<p key={idx} className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{line}</p>);
    }
  });

  return elements;
}
