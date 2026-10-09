import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  PenLine, 
  Play, 
  RotateCcw,
  Layers,
  FileText,
  Zap,
  Send,
  Download,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Copy,
  Edit3,
  Flame,
  Globe,
  Tag
} from 'lucide-react';
import { CampaignQueueItem } from '../types';

interface CampaignQueueViewProps {
  queueItems: CampaignQueueItem[];
  activeBlog?: any;
  onEditItemInEditor: (item: CampaignQueueItem) => void;
  onRetryItem: (item: CampaignQueueItem) => void;
  onPublishNow: (item: CampaignQueueItem) => Promise<void>;
  onSaveAsDraft?: (item: CampaignQueueItem) => Promise<void>;
  onUpdateScheduleTime: (itemId: string, newTime: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onPublishAllNow?: () => Promise<void>;
  onImportQueue?: (items: CampaignQueueItem[]) => void;
  onClearCompleted?: () => void;
  isProcessing: boolean;
  onProcessNextBatch?: () => void;
  targetWordCount?: number;
}


// Helper to format friendly relative countdown
function getRelativeScheduleInfo(dateStr: string): { label: string; isPast: boolean } {
  try {
    const target = new Date(dateStr).getTime();
    if (isNaN(target)) return { label: 'Invalid date', isPast: false };

    const now = Date.now();
    const diffMs = target - now;

    if (diffMs <= 0) {
      const elapsedMinutes = Math.floor(Math.abs(diffMs) / 60000);
      if (elapsedMinutes < 60) {
        return { label: `${elapsedMinutes}m ago (Ready)`, isPast: true };
      }
      const elapsedHours = Math.floor(elapsedMinutes / 60);
      if (elapsedHours < 24) {
        return { label: `${elapsedHours}h ago (Ready)`, isPast: true };
      }
      const elapsedDays = Math.floor(elapsedHours / 24);
      return { label: `${elapsedDays}d ago (Ready)`, isPast: true };
    }

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return { label: `In ${minutes}m`, isPast: false };
    
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    if (hours < 24) {
      return { 
        label: remMinutes > 0 ? `In ${hours}h ${remMinutes}m` : `In ${hours}h`, 
        isPast: false 
      };
    }

    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return { 
      label: remHours > 0 ? `In ${days}d ${remHours}h` : `In ${days}d`, 
      isPast: false 
    };
  } catch {
    return { label: dateStr, isPast: false };
  }
}

function formatScheduleDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export const CampaignQueueView: React.FC<CampaignQueueViewProps> = ({
  queueItems,
  activeBlog,
  onEditItemInEditor,
  onRetryItem,
  onPublishNow,
  onSaveAsDraft,
  onUpdateScheduleTime,
  onDeleteItem,
  onPublishAllNow,
  onImportQueue,
  onClearCompleted,
  isProcessing,
  targetWordCount,
}) => {
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [newScheduleInput, setNewScheduleInput] = useState<string>('');
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'scheduled' | 'published' | 'draft'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Metrics
  const totalCount = queueItems.length;
  const publishedCount = queueItems.filter((i) => i.status === 'published' || i.status === 'published_blogger').length;
  const scheduledCount = queueItems.filter((i) => i.status === 'scheduled' || i.status === 'scheduled_blogger').length;
  const draftCount = queueItems.filter((i) => i.status === 'draft' || i.status === 'draft_blogger').length;
  const readyCount = queueItems.filter((i) => i.status === 'ready').length;

  const completedCount = publishedCount + scheduledCount + readyCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Next post up
  const nextUnpublished = queueItems.find(
    (item) => item.status !== 'published' && item.status !== 'published_blogger' && item.generatedArticle
  );

  // Filtered items
  const filteredItems = queueItems.filter((item) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.generatedArticle?.title?.toLowerCase().includes(q);
      const matchKeyword = item.keyword.keyword.toLowerCase().includes(q);
      if (!matchTitle && !matchKeyword) return false;
    }

    if (activeFilter === 'ready') return item.status === 'ready';
    if (activeFilter === 'scheduled') return item.status === 'scheduled' || item.status === 'scheduled_blogger';
    if (activeFilter === 'published') return item.status === 'published' || item.status === 'published_blogger';
    if (activeFilter === 'draft') return item.status === 'draft' || item.status === 'draft_blogger';
    return true;
  });

  const handleInstantPublish = async (item: CampaignQueueItem) => {
    setPublishingId(item.id);
    try {
      await onPublishNow(item);
      showToast(`⚡ "${item.generatedArticle?.title || item.keyword.keyword}" published live to website!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to publish post immediately.', 'error');
    } finally {
      setPublishingId(null);
    }
  };

  const handleInstantDraft = async (item: CampaignQueueItem) => {
    if (!onSaveAsDraft) return;
    setSavingDraftId(item.id);
    try {
      await onSaveAsDraft(item);
      showToast(`Saved "${item.generatedArticle?.title || item.keyword.keyword}" as draft!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save draft.', 'error');
    } finally {
      setSavingDraftId(null);
    }
  };


  const handleStartEditSchedule = (item: CampaignQueueItem) => {
    try {
      const date = new Date(item.scheduledTime);
      const isoStr = !isNaN(date.getTime()) 
        ? date.toISOString().slice(0, 16) 
        : new Date().toISOString().slice(0, 16);
      setNewScheduleInput(isoStr);
      setEditingScheduleId(item.id);
    } catch {
      setNewScheduleInput(new Date().toISOString().slice(0, 16));
      setEditingScheduleId(item.id);
    }
  };

  const handleSaveSchedule = (itemId: string) => {
    if (!newScheduleInput) {
      setEditingScheduleId(null);
      return;
    }
    try {
      const parsed = new Date(newScheduleInput);
      if (!isNaN(parsed.getTime())) {
        onUpdateScheduleTime(itemId, parsed.toISOString());
        showToast('Schedule time updated successfully!', 'info');
      }
    } catch (e) {
      console.warn(e);
    }
    setEditingScheduleId(null);
  };

  const handleCopyContent = (item: CampaignQueueItem) => {
    if (!item.generatedArticle?.htmlContent) return;
    navigator.clipboard.writeText(item.generatedArticle.htmlContent);
    setCopiedId(item.id);
    showToast('Article HTML content copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleExportBackup = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(queueItems, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `blogger_campaign_queue_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Exported ${queueItems.length} campaign articles backup safely!`, 'success');
    } catch (err: any) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && onImportQueue) {
          onImportQueue(parsed);
          showToast(`Successfully restored ${parsed.length} articles into queue!`, 'success');
        } else {
          showToast('Invalid backup file format.', 'error');
        }
      } catch (err: any) {
        showToast('Failed to parse backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunBulkPublish = async () => {
    if (!onPublishAllNow) return;
    const readyToPostCount = queueItems.filter(
      (i) => i.status !== 'published' && i.status !== 'published_blogger' && i.generatedArticle
    ).length;

    if (readyToPostCount === 0) {
      showToast('No articles ready to post.', 'info');
      return;
    }

    if (!confirm(`Are you sure you want to publish all ${readyToPostCount} ready articles to your website right now?`)) {
      return;
    }

    setBulkPublishing(true);
    try {
      await onPublishAllNow();
      showToast('Successfully published all ready articles to your website!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error during bulk publish.', 'error');
    } finally {
      setBulkPublishing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center space-x-2.5 transition-all duration-300 animate-in slide-in-from-bottom-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/95 border-blue-500/50 text-blue-200'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Overview & Metrics Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Automated Campaign Queue</h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {totalCount} Articles Scheduled
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Automated SEO pipeline with instant publishing controls. Track exactly when each post goes live, adjust scheduled dates, or post instantly with a single click.
            </p>
          </div>

          {/* Quick Actions & Destination Blog */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Target Destination</div>
              <div className="text-xs font-bold text-indigo-400 flex items-center justify-end space-x-1">
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>Current Website Blog</span>
              </div>
            </div>


            {/* Post Next in Queue button */}
            {nextUnpublished && (
              <button
                onClick={() => handleInstantPublish(nextUnpublished)}
                disabled={publishingId === nextUnpublished.id}
                title="Immediately post the next ready article to Blogger"
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {publishingId === nextUnpublished.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Posting Live...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>Post Next Now</span>
                  </>
                )}
              </button>
            )}

            {/* Publish All button */}
            {onPublishAllNow && readyCount + scheduledCount > 0 && (
              <button
                onClick={handleRunBulkPublish}
                disabled={bulkPublishing}
                title="Publish all ready articles to website immediately"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {bulkPublishing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-200 rounded-full animate-spin" />
                    <span>Publishing All...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-purple-400" />
                    <span>Publish All Now</span>
                  </>
                )}
              </button>
            )}

            {/* Backup / Export Menu */}
            <button
              onClick={handleExportBackup}
              title="Backup current queue to a JSON file (data safe)"
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-750 text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Restore from JSON backup"
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-750 text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restore</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="space-y-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center space-x-2">
              <span>Campaign Progress</span>
              {isProcessing && (
                <span className="inline-flex items-center space-x-1 text-blue-400 text-[11px]">
                  <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  <span>Generating articles...</span>
                </span>
              )}
            </span>
            <span className="font-bold text-white">
              {completedCount} of {totalCount} Posts Ready ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Target length: ~{targetWordCount || 1200} words per post</span>
            <span>Cover &amp; inline images, FAQ schema, contextual internal links</span>
          </div>
        </div>

        {/* Scheduler Status Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-white">{publishedCount}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Published Live</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-white">{scheduledCount}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Scheduled on Website</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-white">{readyCount}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Ready to Post</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-white">{draftCount}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Website Drafts</div>
            </div>
          </div>
        </div>

        {/* Next Post Notification Banner */}
        {nextUnpublished && (
          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                Next in Queue: <strong className="text-white">{nextUnpublished.generatedArticle?.title || nextUnpublished.keyword.suggestedTitle}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <span className="text-blue-300 font-medium">
                {formatScheduleDateTime(nextUnpublished.scheduledTime)} ({getRelativeScheduleInfo(nextUnpublished.scheduledTime).label})
              </span>
              <button
                onClick={() => handleInstantPublish(nextUnpublished)}
                disabled={publishingId === nextUnpublished.id}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] flex items-center space-x-1"
              >
                <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                <span>Post Now</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setActiveFilter('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'ready'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ready to Post ({readyCount})
          </button>
          <button
            onClick={() => setActiveFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'scheduled'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scheduled ({scheduledCount})
          </button>
          <button
            onClick={() => setActiveFilter('published')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'published'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setActiveFilter('draft')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'draft'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Drafts ({draftCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queue by keyword or title..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Queue Items List */}
      <div className="space-y-3.5">
        {filteredItems.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-400">
              {queueItems.length === 0 ? 'No campaigns queued yet' : 'No articles match this filter'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {queueItems.length === 0
                ? 'Go to the Keyword Research tab, select target keywords, and click "Launch Automated Campaign".'
                : 'Try clearing your search or switching to "All".'}
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isPublished = item.status === 'published' || item.status === 'published_blogger';
            const isScheduledOnWebsite = item.status === 'scheduled' || item.status === 'scheduled_blogger';
            const isReady = item.status === 'ready';
            const isDraft = item.status === 'draft' || item.status === 'draft_blogger';
            const isGenerating = item.status === 'generating';
            const isFailed = item.status === 'failed';
            const isNextUp = nextUnpublished?.id === item.id;

            const relativeTime = getRelativeScheduleInfo(item.scheduledTime);
            const isExpanded = expandedPreviewId === item.id;
            const isEditingSchedule = editingScheduleId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-md ${
                  isNextUp
                    ? 'border-blue-500/50 shadow-blue-950/20 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/20'
                    : isPublished
                    ? 'border-emerald-500/30'
                    : 'border-slate-800 hover:border-slate-750'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2.5 max-w-3xl">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sequence Badge */}
                      <span className="text-[11px] font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded-md bg-slate-800">
                        #{index + 1}
                      </span>

                      {/* Next Up Tag */}
                      {isNextUp && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
                          <Flame className="w-3 h-3 text-amber-300 fill-amber-300" />
                          <span>Next Up</span>
                        </span>
                      )}

                      {/* KD Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.keyword.kd < 30
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        KD {item.keyword.kd}%
                      </span>

                      {/* Status Badges */}
                      {isPublished && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Published Live on Website</span>
                        </span>
                      )}

                      {isScheduledOnWebsite && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-purple-400" />
                          <span>Scheduled on Website</span>
                        </span>
                      )}

                      {isReady && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-blue-400" />
                          <span>Ready to Post</span>
                        </span>
                      )}

                      {isDraft && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <FileText className="w-3 h-3 text-amber-400" />
                          <span>Website Draft</span>
                        </span>
                      )}

                      {isGenerating && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
                          <div className="w-2.5 h-2.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                          <span>Generating Article &amp; Images...</span>
                        </span>
                      )}

                      {item.status === 'pending' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          Queued for Generation
                        </span>
                      )}

                      {isFailed && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>Failed</span>
                        </span>
                      )}

                      {/* Scheduled Date & Countdown Info */}
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-300 bg-slate-950/80 px-2.5 py-0.5 rounded-lg border border-slate-800">
                        <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>{formatScheduleDateTime(item.scheduledTime)}</span>
                        <span className="text-slate-600">•</span>
                        <span className={relativeTime.isPast ? 'text-amber-400 font-semibold' : 'text-purple-300 font-semibold'}>
                          {relativeTime.label}
                        </span>
                        
                        {/* Inline Reschedule Button */}
                        <button
                          onClick={() => handleStartEditSchedule(item)}
                          title="Change schedule date & time"
                          className="ml-1 text-slate-400 hover:text-white p-0.5 hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Reschedule Form */}
                    {isEditingSchedule && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/40 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-300 font-semibold">New Schedule Time:</span>
                        <input
                          type="datetime-local"
                          value={newScheduleInput}
                          onChange={(e) => setNewScheduleInput(e.target.value)}
                          className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleSaveSchedule(item.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs"
                        >
                          Save Schedule
                        </button>
                        <button
                          onClick={() => setEditingScheduleId(null)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Title & SEO Details */}
                    <div>
                      <h3 className="font-bold text-base text-slate-100 group-hover:text-white">
                        {item.generatedArticle?.title || item.keyword.suggestedTitle || item.keyword.keyword}
                      </h3>
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>Target Keyword: <strong className="text-slate-200">{item.keyword.keyword}</strong></span>
                        <span>•</span>
                        <span>Target: ~{item.targetWordCount} words</span>
                        {item.generatedArticle && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">
                              Actual: {item.generatedArticle.actualWordCount} words
                            </span>
                            <span>•</span>
                            <span className="text-blue-400">
                              ~{item.generatedArticle.estimatedReadingTimeMinutes} min read
                            </span>
                          </>
                        )}
                        {item.publishedAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-300">
                              Live since: {new Date(item.publishedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Error Notice */}
                    {item.errorMessage && (
                      <div className="text-[11px] text-rose-300 bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/40 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{item.errorMessage}</span>
                      </div>
                    )}

                    {/* Expandable Preview Section */}
                    {item.generatedArticle && (
                      <button
                        onClick={() => setExpandedPreviewId(isExpanded ? null : item.id)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 font-semibold transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{isExpanded ? 'Hide article preview & SEO audit' : 'Show article preview & SEO audit'}</span>
                      </button>
                    )}

                    {isExpanded && item.generatedArticle && (
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
                        {item.generatedArticle.metaDescription && (
                          <div>
                            <span className="text-slate-500 font-semibold">Meta Description:</span>
                            <p className="text-slate-300 italic mt-0.5">{item.generatedArticle.metaDescription}</p>
                          </div>
                        )}

                        {item.generatedArticle.labels && item.generatedArticle.labels.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Tag className="w-3 h-3 text-slate-500" />
                            <span className="text-slate-500">Labels:</span>
                            {item.generatedArticle.labels.map((l) => (
                              <span key={l} className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.generatedArticle.seoAudit && (
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-slate-300">
                              SEO Score: <strong className="text-emerald-400 font-bold">{item.generatedArticle.seoAudit.overallScore}/100</strong>
                            </span>
                            <span className="text-slate-400">
                              Primary KW in Title: {item.generatedArticle.seoAudit.primaryKeywordInTitle ? '✅ Yes' : '❌ No'}
                            </span>
                            <span className="text-slate-400">
                              Internal Links: {item.generatedArticle.seoAudit.internalLinksCount}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Instant Action Buttons */}
                  <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0">
                    {/* Primary Button: Post Now vs View Live Post */}
                    {isPublished ? (
                      <span className="px-3 py-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Published</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInstantPublish(item)}
                        disabled={publishingId === item.id || !item.generatedArticle}
                        title="Publish this article immediately live to website"
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {publishingId === item.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Posting Live...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                            <span>Post Now</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Review Article in Editor */}
                    {item.generatedArticle && (
                      <button
                        onClick={() => onEditItemInEditor(item)}
                        title="Inspect & Edit in AI SEO Editor"
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-slate-750 transition-colors"
                      >
                        <PenLine className="w-3.5 h-3.5 text-blue-400" />
                        <span>Review Article</span>
                      </button>
                    )}

                    {/* Secondary Actions: Draft, Copy, Delete */}
                    <div className="flex items-center space-x-1.5 pt-1">
                      {/* Save as Website Draft */}
                      {onSaveAsDraft && !isPublished && !isDraft && item.generatedArticle && (
                        <button
                          onClick={() => handleInstantDraft(item)}
                          disabled={savingDraftId === item.id}
                          title="Save to website as draft"
                          className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-[11px] rounded-lg border border-slate-800 transition-colors"
                        >
                          {savingDraftId === item.id ? 'Saving...' : 'Save Draft'}
                        </button>
                      )}

                      {/* Copy Article HTML */}
                      {item.generatedArticle && (
                        <button
                          onClick={() => handleCopyContent(item)}
                          title="Copy HTML content"
                          className="p-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Retry if failed */}
                      {isFailed && (
                        <button
                          onClick={() => onRetryItem(item)}
                          className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}

                      {/* Delete from Queue */}
                      {onDeleteItem && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${item.keyword.keyword}" from the campaign queue?`)) {
                              onDeleteItem(item.id);
                              showToast('Removed item from queue.', 'info');
                            }
                          }}
                          title="Delete from queue"
                          className="p-1.5 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear Completed Action Footer */}
      {publishedCount > 0 && onClearCompleted && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              if (confirm('Clear only already published articles from this list? Unposted scheduled articles will remain safe.')) {
                onClearCompleted();
                showToast('Cleared completed published articles.', 'info');
              }
            }}
            className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
          >
            Clear {publishedCount} published articles from queue
          </button>
        </div>
      )}
    </div>
  );
};
