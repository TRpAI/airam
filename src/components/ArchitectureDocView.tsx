import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ChevronRight, 
  FileCode,
  ArrowRight,
  Code2,
  List
} from 'lucide-react';
import { architectureDocs } from '../data/architectureDocs';

interface ArchitectureDocViewProps {}

export const ArchitectureDocView: React.FC<ArchitectureDocViewProps> = () => {
  const [activeSectionId, setActiveSectionId] = useState<string>(architectureDocs[0].id);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({
    'step-1': true,
    'step-2': true,
    'step-3': false,
    'step-4': false,
    'step-5': false,
    'step-6': false,
    'step-7': false,
  });

  const activeSection = architectureDocs.find((d) => d.id === activeSectionId) || architectureDocs[0];

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const toggleStep = (id: string) => {
    setCheckedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-150">
      
      {/* Mobile Chapter Picker (< lg) */}
      <div className="lg:hidden border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 bg-white dark:bg-zinc-900/40">
        <label className="flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-500 mb-2">
          <List className="h-4 w-4" />
          <span>选择设计规范章节:</span>
        </label>
        <select
          value={activeSectionId}
          onChange={(e) => setActiveSectionId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none min-h-[40px]"
        >
          {architectureDocs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Left Sidebar (>= lg) */}
      <div className="hidden lg:block w-72 shrink-0 space-y-4">
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">
          <div className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-2">
            设计稿与实施目录
          </div>

          <nav className="space-y-0.5">
            {architectureDocs.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={`w-full text-left p-2 rounded text-xs font-mono transition-colors flex items-start gap-1.5 ${
                  activeSectionId === section.id
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <ChevronRight className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${activeSectionId === section.id ? 'text-zinc-900 dark:text-zinc-100' : 'text-transparent'}`} />
                <span className="truncate">{section.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 7-Day Checklist Interactive Widget */}
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 font-mono text-xs space-y-2.5">
          <div className="flex items-center justify-between text-zinc-900 dark:text-zinc-100 font-semibold">
            <span>7天实施排期</span>
            <span className="text-[11px] text-zinc-500">
              {Object.values(checkedSteps).filter(Boolean).length}/7 就绪
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {[
              { id: 'step-1', label: 'Day 1: Wrangler 与 GitHub Token' },
              { id: 'step-2', label: 'Day 2: D1 数据库与 Schema' },
              { id: 'step-3', label: 'Day 3: React 前端与编辑器' },
              { id: 'step-4', label: 'Day 4: GitHub API 抓取与卡片' },
              { id: 'step-5', label: 'Day 5: Webhook 验签与队列' },
              { id: 'step-6', label: 'Day 6: FTS5 搜索与备份导出' },
              { id: 'step-7', label: 'Day 7: Cloudflare Access 保护' },
            ].map((step) => (
              <label
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!checkedSteps[step.id]}
                  onChange={() => {}}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
                />
                <span className={checkedSteps[step.id] ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}>
                  {step.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Main Document Content */}
      <div className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-5 sm:p-7 space-y-5">
        
        {/* Title Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wide mb-1">
            CLOUDFLARE D1 · WORKERS · GITHUB SYNC SPEC
          </div>
          <h1 className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {activeSection.title}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
            {activeSection.shortDesc}
          </p>
        </div>

        {/* Content Render */}
        <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed space-y-3">
          {renderDocContent(activeSection.content)}
        </div>

        {/* Code Snippet Box */}
        {activeSection.codeSnippet && (
          <div className="mt-5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-mono text-xs">
            <div className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Code2 className="h-3.5 w-3.5" />
                <span className="font-semibold text-[11px]">{activeSection.codeSnippet.filename}</span>
              </div>
              <button
                onClick={() =>
                  handleCopyCode(
                    activeSection.codeSnippet!.code,
                    activeSection.codeSnippet!.filename
                  )
                }
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
              >
                {copiedCodeId === activeSection.codeSnippet.filename ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-500">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>复制</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 overflow-x-auto max-h-[480px]">
              <pre className="text-zinc-800 dark:text-zinc-200 text-xs whitespace-pre">
                {activeSection.codeSnippet.code}
              </pre>
            </div>
          </div>
        )}

        {/* Prev / Next */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
          <div>
            {(() => {
              const idx = architectureDocs.findIndex((d) => d.id === activeSection.id);
              if (idx > 0) {
                const prev = architectureDocs[idx - 1];
                return (
                  <button
                    onClick={() => setActiveSectionId(prev.id)}
                    className="hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    ← 上一章
                  </button>
                );
              }
              return null;
            })()}
          </div>

          <div>
            {(() => {
              const idx = architectureDocs.findIndex((d) => d.id === activeSection.id);
              if (idx < architectureDocs.length - 1) {
                const next = architectureDocs[idx + 1];
                return (
                  <button
                    onClick={() => setActiveSectionId(next.id)}
                    className="hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    下一章 →
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </div>

      </div>

    </div>
  );
};

function renderDocContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, idx) => {
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeBuffer = [];
      } else {
        inCode = false;
        elements.push(
          <div key={`code-${idx}`} className="my-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2.5 overflow-x-auto font-mono text-xs text-zinc-800 dark:text-zinc-200">
            <pre className="whitespace-pre">{codeBuffer.join('\n')}</pre>
          </div>
        );
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (line.startsWith('## ')) {
      elements.push(<h2 key={idx} className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-4 mb-1">{line.replace('## ', '')}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={idx} className="text-xs sm:text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-200 mt-3 mb-1">{line.replace('### ', '')}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">{line.replace(/^[-*]\s*/, '')}</li>);
    } else if (line.startsWith('|')) {
      elements.push(<div key={idx} className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-pre overflow-x-auto py-0.5">{line}</div>);
    } else if (line.trim() === '') {
      elements.push(<div key={idx} className="h-1" />);
    } else {
      elements.push(<p key={idx} className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{line}</p>);
    }
  });

  return elements;
}
