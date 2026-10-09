export type KnowledgeType = 'note' | 'article' | 'document' | 'bookmark' | 'project';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  type: KnowledgeType;
  content: string;
  summary: string;
  status: 'active' | 'archived' | 'draft';
  is_favorite: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  source_repo_id?: string;
  external_url?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'maintenance' | 'concept' | 'archived';
  one_liner: string;
  tech_stack: string[];
  features: string[];
  latest_version?: string;
  homepage?: string;
  repository_id?: string;
  rating: number; // 1-5
  my_notes: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: string;
  github_id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  homepage?: string;
  language: string;
  license?: string;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  default_branch: string;
  is_private: boolean;
  is_fork: boolean;
  topics: string[];
  readme_content?: string;
  package_json_content?: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  last_synced_at: string;
  sync_status: 'synced' | 'pending' | 'syncing' | 'error';
  auto_generate_card: boolean;
}

export interface SyncLog {
  id: string;
  repo_id: string;
  repo_name: string;
  trigger_type: 'webhook' | 'cron' | 'manual';
  status: 'success' | 'skipped' | 'failed';
  details: string;
  duration_ms: number;
  created_at: string;
  changes_detected?: {
    commits?: number;
    readme_updated?: boolean;
    release_updated?: boolean;
  };
}

export interface WebhookEventPayload {
  event: 'push' | 'release' | 'issues' | 'pull_request';
  ref?: string;
  repository: {
    full_name: string;
    pushed_at: string;
    updated_at: string;
  };
  head_commit?: {
    message: string;
    timestamp: string;
    author: { name: string };
  };
  release?: {
    tag_name: string;
    name: string;
    published_at: string;
  };
}
