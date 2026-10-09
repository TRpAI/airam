import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Star, 
  Trash2, 
  Edit3, 
  Check, 
  Copy, 
  Search, 
  Save,
  ArrowLeft,
  X
} from 'lucide-react';
import { KnowledgeItem, KnowledgeType, Tag } from '../types';

interface KnowledgeViewProps {
  knowledge: KnowledgeItem[];
  tags: Tag[];
  onSaveKnowledge: (item: KnowledgeItem) => void;
  onDeleteKnowledge: (id: string) => void;
  selectedId?: string;
  onSelectId?: (id: string) => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  knowledge,
  tags,
  onSaveKnowledge,
  onDeleteKnowledge,
  selectedId: propSelectedId,
  onSelectId: propOnSelectId,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    propSelectedId || (knowledge[0] ? knowledge[0].id : '')
  );

  const activeId = propSelectedId || internalSelectedId;
  const setSelectedId = (id: string) => {
    setInternalSelectedId(id);
    if (propOnSelectId) propOnSelectId(id);
  };

  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // 移动端专用：是否处于“查看正文详情”视图
  const [mobileViewingDetail, setMobileViewingDetail] = useState<boolean>(false);

  // 当前激活条目
  const activeItem = useMemo(() => {
    return knowledge.find((k) => k.id === activeId) || knowledge[0] || null;
  }, [knowledge, activeId]);

  const [editTitle, setEditTitle] = useState(activeItem ? activeItem.title : '');
  const [editType, setEditType] = useState<KnowledgeType>(activeItem ? activeItem.type : 'note');
  const [editContent, setEditContent] = useState(activeItem ? activeItem.content : '');
  const [editSummary, setEditSummary] = useState(activeItem ? activeItem.summary : '');
  const [editTags, setEditTags] = useState<string[]>(activeItem ? activeItem.tags : []);

  const handleSelect = (item: KnowledgeItem) => {
    setSelectedId(item.id);
    setIsEditing(false);
    setEditTitle(item.title);
    setEditType(item.type);
    setEditContent(item.content);
    setEditSummary(item.summary);
    setEditTags(item.tags);
    setMobileViewingDetail(true);
  };

  const filteredKnowledge = useMemo(() => {
    return knowledge.filter((item) => {
      const matchType = filterType === 'all' || item.type === filterType;
      const matchSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [knowledge, filterType, searchQuery]);

  const handleCreateNew = () => {
    const newItem: KnowledgeItem = {
      id: `kb-${Date.now()}`,
      title: '新建研发技术笔记',
      type: 'note',
      content: `# 新建技术笔记\n\n在此记录架构决策、代码片段或踩坑日志...\n\n\`\`\`typescript\nexport const ready = true;\n\`\`\`\n`,
      summary: '简要记录关于此技术点的核心结论。',
      status: 'active',
      is_favorite: false,
      tags: ['架构设计'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSaveKnowledge(newItem);
    handleSelect(newItem);
    setIsEditing(true);
    setMobileViewingDetail(true);
  };

  const handleSave = () => {
    if (!activeItem) return;
    const updated: KnowledgeItem = {
      ...activeItem,
      title: editTitle,
      type: editType,
      content: editContent,
      summary: editSummary,
      tags: editTags,
      updated_at: new Date().toISOString(),
    };
    onSaveKnowledge(updated);
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (!activeItem) return;
    navigator.clipboard.writeText(activeItem.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleFavorite = () => {
    if (!activeItem) return;
    onSaveKnowledge({
      ...activeItem,
      is_favorite: !activeItem.is_favorite,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] animate-in fade-in duration-150">
      
      {/* Left List Pane (Hidden on mobile if viewing detail) */}
      <div className={`w-full lg:w-80 shrink-0 space-y-3 ${mobileViewingDetail ? 'hidden lg:block' : 'block'}`}>
        
        {/* Search & New Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索知识..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>
          <button
            onClick={handleCreateNew}
            className="p-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90 transition-opacity"
            title="新建笔记"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Type Filter Tabs (Minimalist text links) */}
        <div className="flex items-center space-x-1 border-b border-zinc-200 dark:border-zinc-800 pb-1 text-xs font-mono">
          {[
            { id: 'all', label: '全部' },
            { id: 'document', label: '文档' },
            { id: 'note', label: '笔记' },
            { id: 'bookmark', label: '书签' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`px-2.5 py-1 text-xs transition-colors rounded ${
                filterType === t.id
                  ? 'text-zinc-900 dark:text-zinc-100 font-semibold bg-zinc-100 dark:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Knowledge List Items */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/30 max-h-[640px] overflow-y-auto">
          {filteredKnowledge.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 font-mono">
              暂无匹配条目
            </div>
          ) : (
            filteredKnowledge.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`p-3 cursor-pointer transition-colors ${
                  activeItem?.id === item.id
                    ? 'bg-zinc-100/80 dark:bg-zinc-800/70 border-l-2 border-zinc-900 dark:border-zinc-100'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`text-xs font-medium truncate ${
                    activeItem?.id === item.id ? 'text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {item.title}
                  </h4>
                  {item.is_favorite && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                  )}
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-1 leading-relaxed">
                  {item.summary || item.content.slice(0, 80)}
                </p>

                <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-2">
                  {new Date(item.updated_at).toLocaleDateString()} · {item.type}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Main Panel: Reader or Editor (On mobile, only shown when mobileViewingDetail is true) */}
      <div className={`flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-6 flex flex-col justify-between ${
        !mobileViewingDetail ? 'hidden lg:flex' : 'flex'
      }`}>
        {activeItem ? (
          <div className="space-y-5">
            
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              
              {/* Mobile Back Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileViewingDetail(false)}
                  className="lg:hidden flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>列表</span>
                </button>

                <span className="text-xs font-mono text-zinc-400 uppercase">
                  {isEditing ? editType : activeItem.type} · {new Date(activeItem.updated_at).toLocaleDateString()}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleFavorite}
                  className={`p-1.5 rounded transition-colors ${
                    activeItem.is_favorite
                      ? 'text-amber-500 hover:text-amber-600'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                  }`}
                  title={activeItem.is_favorite ? '取消收藏' : '加入收藏'}
                >
                  <Star className={`h-4 w-4 ${activeItem.is_favorite ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  title="复制 Markdown"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>

                {isEditing ? (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90 transition-opacity"
                  >
                    <Save className="h-3 w-3" />
                    <span>保存</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditTitle(activeItem.title);
                      setEditType(activeItem.type);
                      setEditContent(activeItem.content);
                      setEditSummary(activeItem.summary);
                      setEditTags(activeItem.tags);
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>编辑</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (confirm(`确定删除《${activeItem.title}》吗？`)) {
                      onDeleteKnowledge(activeItem.id);
                      setMobileViewingDetail(false);
                    }
                  }}
                  className="p-1.5 rounded text-zinc-400 hover:text-rose-500 transition-colors"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Display vs Edit Form */}
            {isEditing ? (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-zinc-500 mb-1">标题</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-500 mb-1">类型</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as KnowledgeType)}
                      className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="note">笔记 (Note)</option>
                      <option value="document">文档 (Document)</option>
                      <option value="article">深度文章 (Article)</option>
                      <option value="bookmark">代码库书签 (Bookmark)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 mb-1">标签 (逗号隔开)</label>
                    <input
                      type="text"
                      value={editTags.join(', ')}
                      onChange={(e) => setEditTags(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                      className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1">摘要</label>
                  <textarea
                    rows={2}
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1">Markdown 正文</label>
                  <textarea
                    rows={14}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-500 leading-relaxed"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {activeItem.title}
                  </h1>

                  {activeItem.summary && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 border-l-2 border-zinc-300 dark:border-zinc-700 pl-3 italic">
                      {activeItem.summary}
                    </p>
                  )}

                  <div className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-2">
                    {activeItem.tags.map((t) => `#${t}`).join(' · ')}
                  </div>
                </div>

                <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed space-y-3 pt-2">
                  {renderCleanMarkdown(activeItem.content)}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="py-20 text-center text-zinc-400 font-mono text-xs">
            选择左侧条目查看详情
          </div>
        )}
      </div>

    </div>
  );
};

function renderCleanMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let lang = '';

  lines.forEach((line, idx) => {
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        lang = line.replace('```', '').trim();
        codeLines = [];
      } else {
        inCode = false;
        elements.push(
          <div key={`code-${idx}`} className="my-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 font-mono text-xs text-zinc-900 dark:text-zinc-200 overflow-x-auto">
            {lang && <div className="text-[10px] text-zinc-400 mb-1 uppercase">{lang}</div>}
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
    } else if (line.startsWith('### ')) {
      elements.push(<h4 key={idx} className="text-xs font-semibold font-mono text-zinc-800 dark:text-zinc-200 mt-2 mb-1">{line.replace('### ', '')}</h4>);
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
