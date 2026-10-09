import React, { useState } from 'react';
import { 
  Cpu, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  X, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Check, 
  Zap, 
  RefreshCw,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { AiProviderType, AiProviderConfig } from '../types';
import { siteService, DEFAULT_PROVIDERS } from '../services/siteService';

interface AiProvidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: AiProviderType;
  onSelectActiveProvider: (provider: AiProviderType) => void;
  hasServerGeminiKey?: boolean;
}

export const AiProvidersModal: React.FC<AiProvidersModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  onSelectActiveProvider,
  hasServerGeminiKey = true,
}) => {
  const [selectedTab, setSelectedTab] = useState<AiProviderType>(activeProvider);
  const [providers, setProviders] = useState<Record<AiProviderType, AiProviderConfig>>(() => siteService.getAiProviders());
  const [showKeys, setShowKeys] = useState<Record<AiProviderType, boolean>>({
    gemini: false,
    chatgpt: false,
    claude: false,
    grok: false,
  });

  const [testingProvider, setTestingProvider] = useState<AiProviderType | null>(null);
  const [testResult, setTestResult] = useState<{
    provider: AiProviderType;
    success: boolean;
    message: string;
  } | null>(null);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentConfig = providers[selectedTab];

  const handleKeyChange = (provider: AiProviderType, val: string) => {
    setProviders((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiKey: val,
        isConfigured: Boolean(val.trim()),
      },
    }));
  };

  const handleModelChange = (provider: AiProviderType, modelId: string) => {
    setProviders((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        selectedModel: modelId,
      },
    }));
  };

  const handleSaveAll = () => {
    siteService.saveAiProviders(providers);
    siteService.setActiveProvider(selectedTab);
    onSelectActiveProvider(selectedTab);
    setSavedNotice('AI settings and API keys saved successfully!');
    setTimeout(() => {
      setSavedNotice(null);
      onClose();
    }, 900);
  };

  const handleTestKey = async (provider: AiProviderType) => {
    const config = providers[provider];
    setTestingProvider(provider);
    setTestResult(null);

    try {
      const res = await siteService.testAiProviderKey(provider, config.apiKey, config.selectedModel);
      setTestResult({
        provider,
        success: true,
        message: res.message || 'Connection successful! Model responded.',
      });
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        message: err.message || `Failed to connect with ${provider}`,
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const providerTabs: Array<{ id: AiProviderType; name: string; iconBg: string; badge: string }> = [
    { id: 'gemini', name: 'Google Gemini', iconBg: 'from-blue-500 to-indigo-600', badge: 'Free Tier Available' },
    { id: 'chatgpt', name: 'ChatGPT / OpenAI', iconBg: 'from-emerald-500 to-teal-600', badge: 'GPT-4o & Mini' },
    { id: 'claude', name: 'Claude / Anthropic', iconBg: 'from-amber-500 to-orange-600', badge: 'Sonnet & Haiku' },
    { id: 'grok', name: 'Grok / xAI', iconBg: 'from-purple-500 to-pink-600', badge: 'xAI Grok 2' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>AI Providers &amp; Free API Keys</span>
              </h2>
              <p className="text-xs text-slate-400">
                Plug in your free or custom keys for Claude, ChatGPT, Grok, or Gemini.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-2 bg-slate-950/60 border-b border-slate-800">
          {providerTabs.map((tab) => {
            const isTabActive = selectedTab === tab.id;
            const isGlobalActive = activeProvider === tab.id;
            const isConfigured = Boolean(providers[tab.id]?.apiKey) || (tab.id === 'gemini' && hasServerGeminiKey);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`py-2 px-2.5 rounded-xl text-left transition-all relative flex flex-col items-start cursor-pointer ${
                  isTabActive
                    ? 'bg-slate-800 text-white shadow'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-1.5 w-full justify-between">
                  <span className="font-bold text-xs truncate">{tab.name}</span>
                  {isGlobalActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" title="Active Provider" />
                  )}
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  {isConfigured ? (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-0.5">
                      <Check className="w-2.5 h-2.5" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Not configured</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Panel Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {savedNotice && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{savedNotice}</span>
            </div>
          )}

          {/* Provider Overview Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">{currentConfig.name}</h3>
                {selectedTab === 'gemini' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Free Tier Available
                  </span>
                )}
                {activeProvider === selectedTab && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active Engine
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{currentConfig.description}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                siteService.setActiveProvider(selectedTab);
                onSelectActiveProvider(selectedTab);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeProvider === selectedTab
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-600/20'
              }`}
            >
              {activeProvider === selectedTab ? '✓ Current Default' : 'Set as Default AI'}
            </button>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>{currentConfig.name} API Key</span>
              </label>

              <a
                href={currentConfig.keyHelpUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-semibold"
              >
                <span>{currentConfig.keyHelpText}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKeys[selectedTab] ? 'text' : 'password'}
                value={currentConfig.apiKey}
                onChange={(e) => handleKeyChange(selectedTab, e.target.value)}
                placeholder={selectedTab === 'gemini' && hasServerGeminiKey ? 'Using server Gemini API key (or enter custom key)' : `Enter ${currentConfig.keyPrefix}`}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKeys((prev) => ({ ...prev, [selectedTab]: !prev[selectedTab] }))}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showKeys[selectedTab] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {selectedTab === 'gemini' && hasServerGeminiKey && !currentConfig.apiKey && (
              <p className="text-[11px] text-emerald-400/90 flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Pre-configured with server Gemini API key. You can also paste your own Google AI Studio key above.</span>
              </p>
            )}
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Select Model</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentConfig.availableModels.map((m) => {
                const isSelected = currentConfig.selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModelChange(selectedTab, m.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-inner'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-indigo-200' : 'text-slate-300'}`}>
                        {m.name}
                      </span>
                      {m.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{m.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Key Button & Result */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Verify connection before saving</span>
              <button
                type="button"
                disabled={testingProvider === selectedTab || (!currentConfig.apiKey && selectedTab !== 'gemini')}
                onClick={() => handleTestKey(selectedTab)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                {testingProvider === selectedTab ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>
            </div>

            {testResult && testResult.provider === selectedTab && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  testResult.success
                    ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-200'
                    : 'bg-rose-950/60 border border-rose-800/60 text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active: <strong className="text-white">{providers[activeProvider]?.name}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              Save &amp; Apply Keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
