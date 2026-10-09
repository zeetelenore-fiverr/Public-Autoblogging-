import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Link2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  Globe
} from 'lucide-react';
import { KeywordItem, CampaignConfig } from '../types';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: KeywordItem[];
  onStartCampaign: (config: CampaignConfig) => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  keywords,
  onStartCampaign,
}) => {

  // 1. Article Word Count Setting (Prominently required by user prompt)
  const [wordCount, setWordCount] = useState<number>(1200);
  const [customWordCount, setCustomWordCount] = useState<string>('1200');
  const [isCustomWords, setIsCustomWords] = useState(false);

  // 2. Schedule settings
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  // Format for datetime-local: YYYY-MM-DDTHH:mm
  const defaultDateStr = tomorrow.toISOString().slice(0, 16);

  const [startDateTime, setStartDateTime] = useState<string>(defaultDateStr);
  const [frequencyDays, setFrequencyDays] = useState<number>(1); // e.g. 1 post every day
  const [publishAction, setPublishAction] = useState<'schedule' | 'draft' | 'publish'>('schedule');

  // 3. SEO & Content options
  const [tone, setTone] = useState<string>('informative and engaging');
  const [generateImages, setGenerateImages] = useState<boolean>(true);
  const [includeFaq, setIncludeFaq] = useState<boolean>(true);
  const [includeKeyTakeaways, setIncludeKeyTakeaways] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleWordCountPreset = (count: number) => {
    setWordCount(count);
    setCustomWordCount(count.toString());
    setIsCustomWords(false);
  };

  const handleCustomWordsChange = (val: string) => {
    setCustomWordCount(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 200) {
      setWordCount(parsed);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalWords = isCustomWords ? parseInt(customWordCount, 10) || 1200 : wordCount;
    const config: CampaignConfig = {
      name: `Campaign: ${keywords.length} Posts`,
      targetWordCount: Math.max(300, finalWords),
      tone,
      generateImages,
      includeFaq,
      includeKeyTakeaways,
      frequencyDays,
      startDateTime,
      publishAction,
      keywords,
    };
    onStartCampaign(config);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-850 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Automated Campaign &amp; Schedule</h2>
              <p className="text-xs text-slate-400">
                Generate and schedule {keywords.length} SEO-optimized articles with images &amp; internal links
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          {/* Target Blog Alert */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-slate-300">
                Target Destination: <strong className="text-white">Current Website Blog</strong>
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              Live Ready
            </span>
          </div>


          {/* 1. Article Word Count Configuration (CRITICAL REQUIREMENT) */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold flex items-center space-x-1.5 text-xs">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Target Word Count per Article</span>
              </label>
              <span className="text-blue-400 font-bold">{isCustomWords ? customWordCount : wordCount} words</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Set the exact length for every generated post in this campaign. Longer articles provide more in-depth coverage for search ranking.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[800, 1200, 1500, 2000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleWordCountPreset(preset)}
                  className={`py-2 px-3 rounded-lg border font-semibold text-xs transition-all ${
                    !isCustomWords && wordCount === preset
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {preset} words
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomWords(true)}
                className={`py-2 px-3 rounded-lg border font-semibold text-xs transition-all ${
                  isCustomWords
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                Custom...
              </button>
            </div>

            {isCustomWords && (
              <div className="pt-2 flex items-center space-x-2">
                <span className="text-slate-400">Custom words:</span>
                <input
                  type="number"
                  min="400"
                  max="4000"
                  step="50"
                  value={customWordCount}
                  onChange={(e) => handleCustomWordsChange(e.target.value)}
                  className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-500 text-[11px]">(recommended: 800 - 2,500)</span>
              </div>
            )}
          </div>

          {/* 2. Scheduling & Cadence */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <label className="text-slate-200 font-bold flex items-center space-x-1.5 text-xs">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Publishing Schedule &amp; Interval</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">First Post Publish Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Post Frequency</label>
                <select
                  value={frequencyDays}
                  onChange={(e) => setFrequencyDays(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value={0.5}>Every 12 hours (2 posts per day)</option>
                  <option value={1}>1 post every day (Daily)</option>
                  <option value={2}>1 post every 2 days</option>
                  <option value={3}>1 post every 3 days</option>
                  <option value={7}>1 post every week</option>
                </select>
              </div>
            </div>

            {/* Website Action Type */}
            <div className="pt-2">
              <label className="block text-[11px] text-slate-400 mb-1">Website Publishing Action</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPublishAction('schedule')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    publishAction === 'schedule'
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Auto-Schedule</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Queued on website with future dates</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishAction('draft')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    publishAction === 'draft'
                      ? 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Save Drafts</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Stored as website drafts for manual review</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishAction('publish')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    publishAction === 'publish'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Publish Live</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Publish immediately to live blog</div>
                </button>
              </div>
            </div>
          </div>

          {/* 3. SEO & Automation Toggles */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <label className="text-slate-200 font-bold flex items-center space-x-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Automated SEO Enhancements</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start space-x-2.5 p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={generateImages}
                  onChange={(e) => setGenerateImages(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-white flex items-center space-x-1">
                    <ImageIcon className="w-3 h-3 text-amber-400" />
                    <span>Automated Image Generation</span>
                  </span>
                  <p className="text-[10px] text-slate-400">Header cover banner + contextual diagram with alt tags</p>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={true}
                  readOnly
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-white flex items-center space-x-1">
                    <Link2 className="w-3 h-3 text-emerald-400" />
                    <span>Internal Links Weaving</span>
                  </span>
                  <p className="text-[10px] text-slate-400">Contextually links to existing posts on your connected Blogger</p>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={includeFaq}
                  onChange={(e) => setIncludeFaq(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-white flex items-center space-x-1">
                    <HelpCircle className="w-3 h-3 text-blue-400" />
                    <span>FAQ Section &amp; Schema</span>
                  </span>
                  <p className="text-[10px] text-slate-400">People Also Ask (PAA) questions for SERP rich snippets</p>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={includeKeyTakeaways}
                  onChange={(e) => setIncludeKeyTakeaways(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-white flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-teal-400" />
                    <span>Key Takeaways Box</span>
                  </span>
                  <p className="text-[10px] text-slate-400">Bulleted summary callout for high reader retention</p>
                </div>
              </label>
            </div>
          </div>

          {/* 4. Selected Keywords List Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold">Selected Campaign Keywords ({keywords.length}):</span>
              <span className="text-[11px] text-emerald-400">
                {keywords.filter((k) => k.kd < 30).length} Low KD targets
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto bg-slate-950 p-2 rounded-xl border border-slate-800 divide-y divide-slate-850">
              {keywords.map((k, index) => (
                <div key={k.keyword} className="py-1.5 px-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-[10px] font-mono text-slate-500">{index + 1}.</span>
                    <span className="font-medium text-slate-200 truncate">{k.keyword}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      k.kd < 30
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : k.kd < 50
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    KD {k.kd}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Automated Campaign ({keywords.length} Posts)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
