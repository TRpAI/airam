import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Key, AlertCircle, ArrowLeft } from 'lucide-react';
import { GitHubUser } from '../types/auth';

interface AdminLoginProps {
  onLogin: (username: string, token?: string) => Promise<void>;
  loading: boolean;
  onReturnToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLogin,
  loading,
  onReturnToPublic,
}) => {
  const [username, setUsername] = useState('osahermes');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('请输入 GitHub 账号用户名');
      return;
    }
    setError(null);
    try {
      await onLogin(username.trim(), token.trim() || undefined);
    } catch (err: any) {
      setError(err?.message || '登录失败，请检查网络或账号');
    }
  };

  return (
    <div className="min-h-[500px] flex items-center justify-center py-10 px-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Return Button */}
        <div>
          <button
            onClick={onReturnToPublic}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>返回前台展示空间</span>
          </button>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 shadow-sm space-y-5">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
              <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </div>
            <h1 className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
              AIram 后台管理登入
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              单用户所有者安全边界 · GitHub 身份鉴权
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-zinc-500 mb-1.5">GitHub 账号用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如: osahermes"
                className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm sm:text-xs focus:outline-none focus:border-zinc-500 min-h-[42px]"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-zinc-500 mb-1.5">
                <span>Personal Access Token</span>
                <span className="text-[10px] text-zinc-400">(可选 免API限流)</span>
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm sm:text-xs focus:outline-none focus:border-zinc-500 min-h-[42px]"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 text-xs min-h-[44px]"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>{loading ? '正在验证身份...' : '以 GitHub Owner 身份登入'}</span>
            </button>
          </form>

          {/* Info footnote */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed text-center">
            前台空间面向所有访客公开浏览。<br />
            后台中枢仅对拥有者开放知识编辑与同步控制。
          </div>
        </div>

      </div>
    </div>
  );
};
