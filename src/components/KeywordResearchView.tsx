import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  Filter, 
  CheckSquare, 
  Square, 
  Zap, 
  ArrowRight, 
  Layers, 
  BarChart3, 
  Check, 
  Info,
  Calendar,
  PenLine
} from 'lucide-react';
import { KeywordItem, KeywordResearchResult, KdLevel } from '../types';
import { researchKeywords } from '../services/aiApi';

interface KeywordResearchViewProps {
  onSelectKeywordForEditor: (keyword: KeywordItem) => void;
  onLaunchCampaignForKeywords: (keywords: KeywordItem[]) => void;
  connectedBlogName?: string;
  hasGeminiKey?: boolean;
}

export const KeywordResearchView: React.FC<KeywordResearchViewProps> = ({
  onSelectKeywordForEditor,
  onLaunchCampaignForKeywords,
  connectedBlogName,
  hasGeminiKey = true,
}) => {
  const [seedKeyword, setSeedKeyword] = useState('AI blogging tools');
  const [niche, setNiche] = useState('Content Marketing & SEO');
  const [targetAudience, setTargetAudience] = useState('Bloggers & site owners');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<KeywordResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'low_kd' | 'medium_kd' | 'high_kd'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Selected keywords for campaign
  const [selectedKeywords, setSelectedKeywords] = useState<KeywordItem[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!seedKeyword.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await researchKeywords(seedKeyword.trim(), niche.trim(), targetAudience.trim());
      setResult(data);
      // Auto select low KD keywords by default for fast convenience
      const lowKdItems = data.keywords.filter((k) => k.kd < 30);
      setSelectedKeywords(lowKdItems);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze keywords');
    } finally {
      setIsLoading(false);
    }
  };

  const sampleNiches = [
    { title: 'AI Automation', niche: 'Tech & Productivity' },
    { title: 'Affiliate Marketing', niche: 'Passive Income' },
    { title: 'Healthy Meal Prep', niche: 'Nutrition & Health' },
    { title: 'Remote Work Tips', niche: 'Career & Lifestyle' },
    { title: 'Solar Energy Savings', niche: 'Clean Energy & Home' },
  ];

  // Filtering
  const displayedKeywords = (result?.keywords || []).filter((item) => {
    if (searchFilter && !item.keyword.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }
    if (filterType === 'low_kd') {
      return item.kd < 30; // Very easy & easy
    }
    if (filterType === 'medium_kd') {
      return item.kd >= 30 && item.kd < 50;
    }
    if (filterType === 'high_kd') {
      return item.kd >= 50;
    }
    return true;
  });

  const lowKdCount = (result?.keywords || []).filter((k) => k.kd < 30).length;
  const isSelected = (keyword: string) => selectedKeywords.some((k) => k.keyword === keyword);

  const toggleSelectKeyword = (item: KeywordItem) => {
    if (isSelected(item.keyword)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k.keyword !== item.keyword));
    } else {
      setSelectedKeywords([...selectedKeywords, item]);
    }
  };

  const selectAllLowKd = () => {
    if (!result) return;
    const low = result.keywords.filter((k) => k.kd < 30);
    setSelectedKeywords(low);
  };

  const selectAll = () => {
    if (!result) return;
    setSelectedKeywords(result.keywords);
  };

  const clearSelection = () => {
    setSelectedKeywords([]);
  };

  const getKdBadgeClass = (kd: number, level: KdLevel) => {
    if (kd < 15) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (kd < 30) {
      return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
    }
    if (kd < 50) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
    if (kd < 70) {
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    }
    return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  };

  const getKdLabel = (kd: number) => {
    if (kd < 15) return 'Very Easy';
    if (kd < 30) return 'Easy';
    if (kd < 50) return 'Possible';
    if (kd < 70) return 'Hard';
    return 'Very Hard';
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Hero / Header info banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Keyword Difficulty (KD) &amp; Automated Ranking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Target Low KD Keywords &amp; Publish Directly to Your Website
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Find high-intent, low-competition keywords you can quickly rank on Google. Select the best low KD keywords,
            set your target article word count, and let the AI generate full SEO-optimized posts with automated images,
            internal links, and automated publishing.
          </p>
        </div>

        {/* Optional Gemini Key Configuration Banner */}
        {!hasGeminiKey && (
          <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 text-xs flex items-start space-x-2.5 relative z-10">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Gemini API key is not configured yet. </span>
              <span>Please configure <code>GEMINI_API_KEY</code> in the AI Studio Settings menu (under Secrets) to enable AI keyword analysis and article generation.</span>
            </div>
          </div>
        )}

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="mt-6 space-y-3 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Seed Topic or Keyword
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={seedKeyword}
                  onChange={(e) => setSeedKeyword(e.target.value)}
                  placeholder="e.g. best coffee machines for small apartments"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Niche / Category
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Home Appliances"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing KD...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Analyze Keywords</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="flex items-center space-x-2 pt-2 text-xs text-slate-400 overflow-x-auto">
            <span className="shrink-0 text-slate-500 font-medium">Try seed:</span>
            {sampleNiches.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSeedKeyword(s.title);
                  setNiche(s.niche);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750 whitespace-nowrap transition-colors"
              >
                {s.title}
              </button>
            ))}
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start space-x-3">
          <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-200">Unable to complete keyword analysis</div>
            <div className="text-rose-300/90 leading-relaxed">{error}</div>
            {error.includes('GEMINI_API_KEY') && (
              <div className="text-[11px] text-rose-200/80 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40 mt-1.5">
                💡 <strong>How to resolve:</strong> Open the <strong>Settings</strong> panel (or gear icon in Google AI Studio), navigate to <strong>Secrets / Environment Variables</strong>, add <code>GEMINI_API_KEY</code> with your Gemini API key, and restart or refresh.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          {/* Overview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Strategic Landscape</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {result.keywords.length} Opportunities
                </span>
                {lowKdCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>{lowKdCount} Low KD Easy Wins</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 italic max-w-2xl">{result.summary}</p>
            </div>

            {/* Quick bulk action */}
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAllLowKd}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Select All Low KD (&lt; 30)</span>
              </button>
            </div>
          </div>

          {/* Filtering and Selection Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1 hidden sm:inline">
                Filter KD:
              </span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({result.keywords.length})
              </button>
              <button
                onClick={() => setFilterType('low_kd')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                  filterType === 'low_kd'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/40'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Low KD (&lt; 30)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-800/80 text-emerald-200">
                  {lowKdCount}
                </span>
              </button>
              <button
                onClick={() => setFilterType('medium_kd')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === 'medium_kd'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Medium KD (30-49)
              </button>
              <button
                onClick={() => setFilterType('high_kd')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === 'high_kd'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Hard KD (50+)
              </button>
            </div>

            {/* Quick in-table search */}
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search keywords..."
                className="w-full sm:w-48 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Keywords List / Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                      <button
                        onClick={selectedKeywords.length === result.keywords.length ? clearSelection : selectAll}
                        title="Select/Deselect All"
                        className="hover:text-slate-200"
                      >
                        {selectedKeywords.length === result.keywords.length && result.keywords.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">Target Keyword &amp; Title</th>
                    <th className="py-3.5 px-3 w-32">KD (Difficulty)</th>
                    <th className="py-3.5 px-3 w-28">Monthly Vol</th>
                    <th className="py-3.5 px-3 w-24">Est. CPC</th>
                    <th className="py-3.5 px-3 w-28">Search Intent</th>
                    <th className="py-3.5 px-3 w-24">Word Count</th>
                    <th className="py-3.5 pr-4 pl-2 w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedKeywords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        No keywords match current filter.
                      </td>
                    </tr>
                  ) : (
                    displayedKeywords.map((item) => {
                      const selected = isSelected(item.keyword);
                      return (
                        <tr
                          key={item.keyword}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            selected ? 'bg-blue-950/20' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 pl-4 pr-2 text-center">
                            <button
                              onClick={() => toggleSelectKeyword(item)}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              {selected ? (
                                <CheckSquare className="w-4 h-4 text-blue-500" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600" />
                              )}
                            </button>
                          </td>

                          {/* Keyword & Title */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-100 flex items-center space-x-2">
                              <span>{item.keyword}</span>
                              {item.kd < 30 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Low KD Win
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                              💡 Suggested: {item.suggestedTitle}
                            </div>
                            {item.serpAnalysis && (
                              <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                                {item.serpAnalysis}
                              </div>
                            )}
                          </td>

                          {/* KD Score & Level */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${getKdBadgeClass(
                                    item.kd,
                                    item.kdLevel
                                  )}`}
                                >
                                  KD {item.kd}%
                                </span>
                                <span className="text-[10px] text-slate-400">{getKdLabel(item.kd)}</span>
                              </div>
                              {/* Visual mini bar */}
                              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    item.kd < 15
                                      ? 'bg-emerald-400'
                                      : item.kd < 30
                                      ? 'bg-teal-400'
                                      : item.kd < 50
                                      ? 'bg-amber-400'
                                      : item.kd < 70
                                      ? 'bg-orange-400'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.max(8, item.kd)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Search Volume */}
                          <td className="py-3 px-3 font-medium text-slate-300">
                            {item.searchVolume.toLocaleString()} / mo
                          </td>

                          {/* CPC */}
                          <td className="py-3 px-3 font-mono text-slate-400">
                            ${item.cpc ? item.cpc.toFixed(2) : '0.00'}
                          </td>

                          {/* Search Intent */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-750">
                              {item.intent}
                            </span>
                          </td>

                          {/* Target Word Count */}
                          <td className="py-3 px-3 text-slate-400 font-medium">
                            ~{item.recommendedWordCount || 1200}w
                          </td>

                          {/* Actions */}
                          <td className="py-3 pr-4 pl-2 text-right">
                            <button
                              onClick={() => onSelectKeywordForEditor(item)}
                              title="Generate & Edit Post"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1 transition-colors"
                            >
                              <PenLine className="w-3 h-3" />
                              <span>Write Post</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar when keywords are selected */}
      {selectedKeywords.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl bg-slate-900/95 backdrop-blur-md border border-slate-750 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
              {selectedKeywords.length}
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {selectedKeywords.length} Keywords Selected
              </div>
              <div className="text-[11px] text-slate-400">
                {selectedKeywords.filter((k) => k.kd < 30).length} with Low KD (&lt; 30) for fast Google ranking
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={clearSelection}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
            >
              Clear
            </button>
            <button
              id="launch-campaign-btn"
              onClick={() => onLaunchCampaignForKeywords(selectedKeywords)}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Configure Campaign &amp; Schedule ({selectedKeywords.length})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
