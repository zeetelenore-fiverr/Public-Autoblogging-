import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  PenTool, 
  Calendar, 
  ListFilter, 
  Cpu, 
  ShieldCheck, 
  Lock, 
  User, 
  Sparkles, 
  ChevronDown, 
  Plus, 
  ExternalLink,
  BookOpen,
  Zap,
  Rocket
} from 'lucide-react';
import { AdminUser, SiteConfig, AiProviderType } from '../types';

interface HeaderProps {
  activeTab: 'reader' | 'editor' | 'posts' | 'keywords' | 'campaign';
  setActiveTab: (tab: 'reader' | 'editor' | 'posts' | 'keywords' | 'campaign') => void;
  isAdmin: boolean;
  hasAdminAccount: boolean;
  adminUser: AdminUser | null;
  siteConfig: SiteConfig;
  activeAiProvider: AiProviderType;
  activeAiModel: string;
  onOpenAiKeysModal: () => void;
  onOpenAdminAuthModal: () => void;
  livePostsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  hasAdminAccount,
  adminUser,
  siteConfig,
  activeAiProvider,
  activeAiModel,
  onOpenAiKeysModal,
  onOpenAdminAuthModal,
  livePostsCount,
}) => {
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const providerNames: Record<AiProviderType, { label: string; dotColor: string }> = {
    gemini: { label: 'Gemini', dotColor: 'bg-blue-400' },
    chatgpt: { label: 'ChatGPT', dotColor: 'bg-emerald-400' },
    claude: { label: 'Claude', dotColor: 'bg-amber-400' },
    grok: { label: 'Grok', dotColor: 'bg-purple-400' },
  };

  const navItems: Array<{ id: 'reader' | 'editor' | 'posts' | 'keywords' | 'campaign'; label: string; icon: any; count?: number }> = [
    { id: 'reader', label: 'Live Blog', icon: BookOpen, count: livePostsCount },
    { id: 'editor', label: 'AI Writer', icon: PenTool },
    { id: 'posts', label: 'Posts CMS', icon: ListFilter },
    { id: 'keywords', label: 'Keyword Research', icon: Search },
    { id: 'campaign', label: 'Auto Campaign', icon: Calendar },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Site Name */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setActiveTab('reader')}
              className="flex items-center space-x-2.5 text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-extrabold text-white tracking-tight leading-none block">
                  {siteConfig.siteTitle || 'ApexBlog AI'}
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block mt-0.5">
                  AI Publishing Platform
                </span>
              </div>
            </button>
          </div>

          {/* Navigation tabs */}
          <nav className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* AI Providers & Free Keys Button */}
            <button
              type="button"
              onClick={onOpenAiKeysModal}
              title="Configure free/custom API keys for Gemini, Claude, ChatGPT, or Grok"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-200 transition-all cursor-pointer group shadow-sm"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
              <div className="flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${providerNames[activeAiProvider]?.dotColor || 'bg-blue-400'}`} />
                <span className="font-bold text-[11px] text-white">
                  {providerNames[activeAiProvider]?.label}
                </span>
              </div>
            </button>

            {/* Admin Profile / Login / Setup Button */}
            {isAdmin && adminUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="flex items-center space-x-2 p-1.5 pl-2.5 bg-slate-950 hover:bg-slate-800 border border-indigo-500/30 rounded-xl text-xs text-white transition-all cursor-pointer shadow-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {adminUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-xs max-w-[80px] sm:max-w-[110px] truncate hidden sm:inline">
                    {adminUser.displayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showAdminMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white truncate">{adminUser.displayName}</p>
                      <p className="text-[10px] text-slate-400 truncate">@{adminUser.username}</p>
                    </div>

                    <div className="py-1 space-y-0.5 text-xs">
                      <button
                        onClick={() => {
                          setShowAdminMenu(false);
                          setActiveTab('editor');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center space-x-2"
                      >
                        <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Write New Article</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAdminMenu(false);
                          onOpenAiKeysModal();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center space-x-2"
                      >
                        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                        <span>AI API Keys</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAdminMenu(false);
                          onOpenAdminAuthModal();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center space-x-2"
                      >
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span>Admin Profile &amp; Bio</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setShowAdminMenu(false);
                          onOpenAdminAuthModal();
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/50 text-rose-300 text-xs font-semibold"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : !hasAdminAccount ? (
              <button
                type="button"
                onClick={onOpenAdminAuthModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer animate-pulse"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Create Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminAuthModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
