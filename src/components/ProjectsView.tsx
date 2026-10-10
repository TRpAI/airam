import React, { useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Star, 
  ExternalLink, 
  GitBranch, 
  Save, 
  Trash2, 
  X 
} from 'lucide-react';
import { Project, GitHubRepository } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  repos: GitHubRepository[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  repos,
  onSaveProject,
  onDeleteProject,
}) => {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredProjects = projects.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const handleCreateNew = () => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: '新建研发项目',
      description: '项目初衷与技术目标',
      status: 'active',
      one_liner: '新研发资产的一句话定位',
      tech_stack: ['TypeScript', 'Cloudflare Workers'],
      features: ['功能模块 1', '功能模块 2'],
      latest_version: 'v0.1.0',
      rating: 4,
      my_notes: '研发思考备忘录...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingProject(newProj);
  };

  const handleSaveModal = () => {
    if (!editingProject) return;
    onSaveProject({
      ...editingProject,
      updated_at: new Date().toISOString(),
    });
    setEditingProject(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Top Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
            研发项目知识卡片
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            从 GitHub 仓库自动衍生的结构化项目档案与开发备忘
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 text-xs font-mono bg-white dark:bg-zinc-900">
            {[
              { id: 'all', label: '全部' },
              { id: 'active', label: '活跃' },
              { id: 'maintenance', label: '维护' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-2.5 py-1.5 sm:py-0.5 rounded-md transition-colors min-h-[32px] sm:min-h-0 ${
                  filterStatus === f.id
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90 active:scale-95 transition-all min-h-[34px]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>新建项目</span>
          </button>
        </div>
      </div>

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((project) => {
          const matchedRepo = repos.find((r) => r.id === project.repository_id);
          return (
            <div
              key={project.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-5 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {project.name}
                      </h3>
                      {project.latest_version && (
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                          {project.latest_version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      {project.one_liner}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      {project.rating}.0★
                    </span>
                    <button
                      onClick={() => setEditingProject({ ...project })}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      title="编辑项目"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tech Stacks (Zero-pill clean text) */}
                <div className="mt-3 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">技术栈: </span>
                  {project.tech_stack.join(' · ')}
                </div>

                {/* Features */}
                <div className="mt-3">
                  <ul className="space-y-1">
                    {project.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="text-zinc-400 select-none">-</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Personal Memo */}
                {project.my_notes && (
                  <div className="mt-3 p-2.5 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5 font-mono">备忘录:</span>
                    <p className="whitespace-pre-line leading-relaxed">{project.my_notes}</p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${project.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  <span>{project.status === 'active' ? '活跃' : '维护'}</span>
                </span>

                <div className="flex items-center gap-3">
                  {matchedRepo && (
                    <a
                      href={matchedRepo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                      GitHub ({matchedRepo.stars}★)
                    </a>
                  )}

                  {project.homepage && (
                    <a
                      href={project.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                      主页
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal (Mobile Responsive) */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                编辑项目知识卡片
              </h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">项目名称</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">一句话定位</label>
                <input
                  type="text"
                  value={editingProject.one_liner}
                  onChange={(e) => setEditingProject({ ...editingProject, one_liner: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">状态</label>
                  <select
                    value={editingProject.status}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        status: e.target.value as Project['status'],
                      })
                    }
                    className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="active">活跃</option>
                    <option value="maintenance">维护</option>
                    <option value="concept">预研</option>
                    <option value="archived">归档</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1">评分 (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingProject.rating}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        rating: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">技术栈 (逗号隔开)</label>
                <input
                  type="text"
                  value={editingProject.tech_stack.join(', ')}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      tech_stack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">核心功能点 (换行分隔)</label>
                <textarea
                  rows={3}
                  value={editingProject.features.join('\n')}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">研发备忘录</label>
                <textarea
                  rows={3}
                  value={editingProject.my_notes}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, my_notes: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  if (confirm(`确定删除《${editingProject.name}》吗？`)) {
                    onDeleteProject(editingProject.id);
                    setEditingProject(null);
                  }
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-mono"
              >
                删除项目
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-mono"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveModal}
                  className="px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
