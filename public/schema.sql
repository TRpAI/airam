-- ==============================================================
-- aidevhub 个人研发知识中枢 - Cloudflare D1 初始化迁移脚本
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
  topics TEXT DEFAULT '[]', -- JSON 字符串
  readme_content TEXT,      -- 同步的 README.md 原始内容
  package_json_content TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  pushed_at TEXT NOT NULL,
  last_synced_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  auto_generate_card INTEGER NOT NULL DEFAULT 1
);

-- 3. 核心知识表 (Knowledge Base 顶层实体)
CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'note', -- note, article, document, bookmark, project
  content TEXT NOT NULL DEFAULT '',
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active',
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
  tech_stack TEXT DEFAULT '[]',          -- JSON 数组
  features TEXT DEFAULT '[]',            -- JSON 数组
  latest_version TEXT,
  homepage TEXT,
  repository_id TEXT REFERENCES github_repositories(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL DEFAULT 5,     -- 1~5 个人评级
  my_notes TEXT,                         -- 研发备忘录/个人随记
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

-- 9. 自动触发器：知识表与全文索引自动保持同步
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
END;
