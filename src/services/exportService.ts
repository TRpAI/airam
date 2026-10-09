import { KnowledgeItem, Project, GitHubRepository, SyncLog } from '../types';

export function exportToJSON(
  knowledge: KnowledgeItem[],
  projects: Project[],
  repos: GitHubRepository[],
  logs: SyncLog[]
): void {
  const exportData = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    system: 'DevKnowledge-OS-Cloudflare',
    stats: {
      knowledge_count: knowledge.length,
      projects_count: projects.length,
      repositories_count: repos.length,
      logs_count: logs.length,
    },
    data: {
      knowledge,
      projects,
      github_repositories: repos,
      sync_logs: logs,
    },
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `devknowledge-backup-${formatDate(new Date())}.json`);
}

export function exportToD1Sql(
  knowledge: KnowledgeItem[],
  projects: Project[],
  repos: GitHubRepository[]
): void {
  let sql = `-- ==============================================================
-- DevKnowledge OS - Cloudflare D1 数据库备份导脚本
-- 生成时间: ${new Date().toISOString()}
-- ==============================================================\n\n`;

  sql += `-- 1. GitHub 仓库数据\n`;
  for (const r of repos) {
    const escDesc = escapeSql(r.description);
    const escReadme = escapeSql(r.readme_content || '');
    sql += `INSERT OR REPLACE INTO github_repositories (id, github_id, owner, name, full_name, description, html_url, language, stars, forks, default_branch, topics, readme_content, created_at, updated_at, pushed_at, last_synced_at, sync_status) VALUES ('${r.id}', ${r.github_id}, '${r.owner}', '${r.name}', '${r.full_name}', '${escDesc}', '${r.html_url}', '${r.language}', ${r.stars}, ${r.forks}, '${r.default_branch}', '${escapeSql(JSON.stringify(r.topics))}', '${escReadme}', '${r.created_at}', '${r.updated_at}', '${r.pushed_at}', '${r.last_synced_at}', '${r.sync_status}');\n`;
  }

  sql += `\n-- 2. 知识库数据\n`;
  for (const k of knowledge) {
    sql += `INSERT OR REPLACE INTO knowledge (id, title, type, content, summary, status, is_favorite, created_at, updated_at) VALUES ('${k.id}', '${escapeSql(k.title)}', '${k.type}', '${escapeSql(k.content)}', '${escapeSql(k.summary)}', '${k.status}', ${k.is_favorite ? 1 : 0}, '${k.created_at}', '${k.updated_at}');\n`;
  }

  sql += `\n-- 3. 项目数据\n`;
  for (const p of projects) {
    sql += `INSERT OR REPLACE INTO projects (id, name, description, status, one_liner, tech_stack, features, rating, my_notes, created_at, updated_at) VALUES ('${p.id}', '${escapeSql(p.name)}', '${escapeSql(p.description)}', '${p.status}', '${escapeSql(p.one_liner)}', '${escapeSql(JSON.stringify(p.tech_stack))}', '${escapeSql(JSON.stringify(p.features))}', ${p.rating}, '${escapeSql(p.my_notes)}', '${p.created_at}', '${p.updated_at}');\n`;
  }

  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `devknowledge-d1-dump-${formatDate(new Date())}.sql`);
}

export function exportToMarkdownBundle(
  knowledge: KnowledgeItem[],
  projects: Project[]
): void {
  // 构建综合 Markdown 归档文件
  let bundle = `# DevKnowledge OS - 个人研发知识离线全量归档\n\n`;
  bundle += `> 导出时间: ${new Date().toLocaleString()} | 共计 ${knowledge.length} 篇知识条目，${projects.length} 个研发项目卡片\n\n`;
  bundle += `---\n\n`;

  bundle += `## 目录索引\n\n`;
  bundle += `### 研发项目卡片\n`;
  projects.forEach((p, idx) => {
    bundle += `${idx + 1}. [${p.name}](#project-${p.id}) - ${p.one_liner}\n`;
  });
  bundle += `\n### 知识条目与手册\n`;
  knowledge.forEach((k, idx) => {
    bundle += `${idx + 1}. [${k.title}](#kb-${k.id}) (${k.type})\n`;
  });

  bundle += `\n\n---\n\n# 第一部分：研发项目资产卡片\n\n`;
  for (const p of projects) {
    bundle += `## <a id="project-${p.id}"></a>${p.name}\n\n`;
    bundle += `- **定位**: ${p.one_liner}\n`;
    bundle += `- **状态**: ${p.status} | 评分: ${'★'.repeat(p.rating)}${'☆'.repeat(5 - p.rating)}\n`;
    bundle += `- **技术栈**: ${p.tech_stack.join(', ')}\n`;
    if (p.homepage) bundle += `- **主页/链接**: ${p.homepage}\n`;
    bundle += `\n### 核心功能\n`;
    p.features.forEach((f) => {
      bundle += `- ${f}\n`;
    });
    if (p.my_notes) {
      bundle += `\n### 研发备忘录\n${p.my_notes}\n`;
    }
    bundle += `\n---\n\n`;
  }

  bundle += `\n# 第二部分：个人知识库与技术文档\n\n`;
  for (const k of knowledge) {
    bundle += `## <a id="kb-${k.id}"></a>${k.title}\n\n`;
    bundle += `\`\`\`yaml\ntype: ${k.type}\ntags: [${k.tags.join(', ')}]\nupdated_at: ${k.updated_at}\n\`\`\`\n\n`;
    if (k.summary) {
      bundle += `> **摘要**: ${k.summary}\n\n`;
    }
    bundle += `${k.content}\n\n`;
    bundle += `---\n\n`;
  }

  const blob = new Blob([bundle], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `devknowledge-markdown-archive-${formatDate(new Date())}.md`);
}

function escapeSql(str: string): string {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
