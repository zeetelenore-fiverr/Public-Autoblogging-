import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Eye, 
  Code, 
  Send, 
  Save, 
  Calendar, 
  Image as ImageIcon, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  BarChart2, 
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Sliders,
  HelpCircle,
  Hash,
  Copy,
  Download,
  KeyRound,
  Check,
  Cpu,
  Globe,
  ArrowRight
} from 'lucide-react';
import { BlogPost, GeneratedArticle, SeoAuditResult, KeywordItem, AiProviderType, SiteConfig } from '../types';
import { generateArticle, generateBlogImage, runSeoAudit } from '../services/aiApi';
import { siteService } from '../services/siteService';

interface AiEditorViewProps {
  initialKeyword?: KeywordItem | null;
  existingPosts: BlogPost[];
  onPostPublishedOrScheduled?: () => void;
  editingPost?: BlogPost | null;
  onClearEditingPost?: () => void;
  onViewPostOnSite?: (post: BlogPost) => void;
  activeAiProvider: AiProviderType;
  onOpenAiKeysModal: () => void;
  siteConfig: SiteConfig;
}

export const AiEditorView: React.FC<AiEditorViewProps> = ({
  initialKeyword,
  existingPosts,
  onPostPublishedOrScheduled,
  editingPost,
  onClearEditingPost,
  onViewPostOnSite,
  activeAiProvider,
  onOpenAiKeysModal,
  siteConfig,
}) => {
  // Article State
  const [targetKeyword, setTargetKeyword] = useState<string>(initialKeyword?.keyword || '');
  const [title, setTitle] = useState<string>(editingPost?.title || initialKeyword?.suggestedTitle || '');
  const [metaDescription, setMetaDescription] = useState<string>(editingPost?.metaDescription || '');
  const [labels, setLabels] = useState<string[]>(editingPost?.labels || []);
  const [labelInput, setLabelInput] = useState('');
  const [contentHtml, setContentHtml] = useState<string>(editingPost?.content || '');
  const [targetWordCount, setTargetWordCount] = useState<number>(initialKeyword?.recommendedWordCount || 1200);
  const [tone, setTone] = useState<string>('informative and engaging');
  const [selectedProvider, setSelectedProvider] = useState<AiProviderType>(activeAiProvider);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Editor View Mode
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');

  // Auto-backup to localStorage on article changes so user never loses work
  useEffect(() => {
    if (title || contentHtml) {
      try {
        localStorage.setItem(
          'website_editor_autosave_draft',
          JSON.stringify({
            title,
            contentHtml,
            targetKeyword,
            labels,
            metaDescription,
            timestamp: Date.now(),
          })
        );
      } catch {}
    }
  }, [title, contentHtml, targetKeyword, labels, metaDescription]);

  // If initialKeyword updates, populate fields
  useEffect(() => {
    if (initialKeyword) {
      setTargetKeyword(initialKeyword.keyword);
      if (initialKeyword.suggestedTitle) setTitle(initialKeyword.suggestedTitle);
      if (initialKeyword.recommendedWordCount) setTargetWordCount(initialKeyword.recommendedWordCount);
    }
  }, [initialKeyword]);

  // If editingPost updates, populate fields
  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title || '');
      setContentHtml(editingPost.content || '');
      setMetaDescription(editingPost.metaDescription || '');
      setLabels(editingPost.labels || []);
      setTargetKeyword(editingPost.targetKeyword || '');
    }
  }, [editingPost]);

  // Keep selected provider synced with global active
  useEffect(() => {
    setSelectedProvider(activeAiProvider);
  }, [activeAiProvider]);

  // Generation options
  const [includeFaq, setIncludeFaq] = useState(true);
  const [includeKeyTakeaways, setIncludeKeyTakeaways] = useState(true);
  const [generateImages, setGenerateImages] = useState(true);

  // Loading & status
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const [scheduleDateTime, setScheduleDateTime] = useState<string>(tomorrow.toISOString().slice(0, 16));

  // SEO Audit State
  const [seoAudit, setSeoAudit] = useState<SeoAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Word count & reading time stats
  const cleanWordCount = (contentHtml || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(cleanWordCount / 200));

  // Generate article using selected AI provider
  const handleGenerateArticle = async () => {
    if (!targetKeyword.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a target keyword first.' });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const activeProviders = siteService.getAiProviders();
      const currentConfig = activeProviders[selectedProvider];

      const res: GeneratedArticle = await generateArticle({
        keyword: targetKeyword.trim(),
        title: title.trim() || undefined,
        wordCount: targetWordCount,
        tone,
        niche: labels[0] || '',
        existingPosts: existingPosts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          url: `/post/${p.slug}`,
        })),
        includeFaq,
        includeKeyTakeaways,
        generateImages,
        provider: selectedProvider,
        apiKey: currentConfig?.apiKey,
        model: currentConfig?.selectedModel,
      });

      setTitle(res.title);
      setContentHtml(res.htmlContent);
      setMetaDescription(res.metaDescription || '');
      if (res.labels && res.labels.length > 0) {
        setLabels(Array.from(new Set([...labels, ...res.labels])));
      }

      setStatusMessage({
        type: 'success',
        text: `Article generated successfully with ${selectedProvider.toUpperCase()} (${cleanWordCount} words)!`,
      });

      // Run live SEO audit
      handleRunAudit(res.title, res.htmlContent, targetKeyword, res.metaDescription);
    } catch (err: any) {
      console.error('Article generation failed:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || `Failed to generate article with ${selectedProvider}. Check your API key.`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Run SEO Audit
  const handleRunAudit = async (
    t: string = title,
    c: string = contentHtml,
    k: string = targetKeyword,
    m: string = metaDescription
  ) => {
    if (!c.trim()) return;
    setIsAuditing(true);
    try {
      const result = await runSeoAudit(t, c, k, m);
      setSeoAudit(result);
    } catch (err) {
      console.warn('SEO audit error:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Label handlers
  const handleAddLabel = () => {
    if (!labelInput.trim()) return;
    const clean = labelInput.trim().replace(/^#/, '');
    if (!labels.includes(clean)) {
      setLabels([...labels, clean]);
    }
    setLabelInput('');
  };

  const handleRemoveLabel = (tag: string) => {
    setLabels(labels.filter((l) => l !== tag));
  };

  // Generate and insert AI banner graphic
  const handleAddGraphic = async () => {
    try {
      setStatusMessage(null);
      const res = await generateBlogImage(
        title || targetKeyword || 'Guide',
        labels[0] || 'Tutorial',
        '#6366f1'
      );
      const imageHtml = `
<div class="blog-ai-inline-container" style="margin: 28px 0; text-align: center;">
  <img src="${res.imageUrl}" alt="${title || targetKeyword}" style="width: 100%; max-width: 800px; height: auto; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); display: inline-block;" />
  <p style="font-size: 13px; color: #94a3b8; margin-top: 6px; font-style: italic;">Infographic &amp; Summary for ${targetKeyword || title}</p>
</div>\n`;
      setContentHtml((prev) => prev + imageHtml);
      setStatusMessage({ type: 'success', text: 'Added new AI visual graphic with SEO alt tag!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to add image.' });
    }
  };

  // Insert Internal Link from existing blog posts
  const handleInsertInternalLink = (post: BlogPost) => {
    const linkHtml = ` <a href="/post/${post.slug}" title="${post.title}" style="color: #60a5fa; font-weight: 600; text-decoration: underline;">${post.title}</a> `;
    setContentHtml((prev) => prev + `\n<p>Related read: ${linkHtml}</p>`);
    setStatusMessage({ type: 'success', text: `Inserted internal link to "${post.title}"` });
  };

  // Save to Website CMS (Draft)
  const handleSaveDraft = async () => {
    if (!title.trim() || !contentHtml.trim()) {
      setStatusMessage({ type: 'error', text: 'Title and content cannot be empty.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (editingPost) {
        await siteService.updatePost(editingPost.id, {
          title,
          content: contentHtml,
          metaDescription,
          labels,
          status: 'DRAFT',
          targetKeyword,
        });
        setStatusMessage({ type: 'success', text: 'Updated draft successfully on website!' });
      } else {
        await siteService.createPost({
          title,
          content: contentHtml,
          metaDescription,
          labels,
          status: 'DRAFT',
          targetKeyword,
        });
        setStatusMessage({ type: 'success', text: 'Saved as draft on website CMS!' });
      }
      if (onPostPublishedOrScheduled) onPostPublishedOrScheduled();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save draft.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publish Live Directly to Current Website
  const handlePublishNow = async () => {
    if (!title.trim() || !contentHtml.trim()) {
      setStatusMessage({ type: 'error', text: 'Title and content cannot be empty.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      let publishedPost: BlogPost;
      if (editingPost) {
        publishedPost = await siteService.updatePost(editingPost.id, {
          title,
          content: contentHtml,
          metaDescription,
          labels,
          status: 'LIVE',
          publishedAt: new Date().toISOString(),
          targetKeyword,
        });
      } else {
        publishedPost = await siteService.createPost({
          title,
          content: contentHtml,
          metaDescription,
          labels,
          status: 'LIVE',
          publishedAt: new Date().toISOString(),
          targetKeyword,
        });
      }

      setStatusMessage({
        type: 'success',
        text: `Post published LIVE on website! Viewable by visitors immediately.`,
      });

      if (onPostPublishedOrScheduled) onPostPublishedOrScheduled();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to publish post.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule Post on Website
  const handleSchedulePost = async () => {
    if (!title.trim() || !contentHtml.trim()) {
      setStatusMessage({ type: 'error', text: 'Title and content cannot be empty.' });
      return;
    }

    const scheduledIso = new Date(scheduleDateTime).toISOString();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (editingPost) {
        await siteService.updatePost(editingPost.id, {
          title,
          content: contentHtml,
          metaDescription,
          labels,
          status: 'SCHEDULED',
          scheduledAt: scheduledIso,
          targetKeyword,
        });
      } else {
        await siteService.createPost({
          title,
          content: contentHtml,
          metaDescription,
          labels,
          status: 'SCHEDULED',
          scheduledAt: scheduledIso,
          targetKeyword,
        });
      }

      setShowScheduleModal(false);
      setStatusMessage({
        type: 'success',
        text: `Post scheduled on website for ${new Date(scheduleDateTime).toLocaleString()}!`,
      });
      if (onPostPublishedOrScheduled) onPostPublishedOrScheduled();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to schedule post.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy HTML to clipboard
  const handleCopyHtml = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(contentHtml);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-extrabold text-xl text-white tracking-tight">AI SEO Article Studio</span>
              {editingPost && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  Editing: {editingPost.title}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Generate long-form articles, audit SEO rankings, insert internal links, and publish directly to this website.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick AI Provider Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 text-[11px]">AI Engine:</span>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  const p = e.target.value as AiProviderType;
                  setSelectedProvider(p);
                  siteService.setActiveProvider(p);
                }}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="gemini" className="bg-slate-900">Gemini (Free Tier)</option>
                <option value="chatgpt" className="bg-slate-900">ChatGPT (OpenAI)</option>
                <option value="claude" className="bg-slate-900">Claude (Anthropic)</option>
                <option value="grok" className="bg-slate-900">Grok (xAI)</option>
              </select>
              <button
                type="button"
                onClick={onOpenAiKeysModal}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold ml-1 cursor-pointer"
              >
                Keys
              </button>
            </div>

            {editingPost && (
              <button
                onClick={onClearEditingPost}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            )}

            <button
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span>Save Draft</span>
            </button>

            <button
              onClick={() => setShowScheduleModal(true)}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold rounded-xl flex items-center space-x-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Schedule</span>
            </button>

            <button
              onClick={handlePublishNow}
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Live</span>
            </button>
          </div>
        </div>

        {/* AI Generator Controls Strip */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Target Keyword
            </label>
            <input
              type="text"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="e.g. best automated blogging tools"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-medium"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Word Count
            </label>
            <div className="flex items-center space-x-1">
              {[800, 1200, 1600, 2200].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setTargetWordCount(w)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    targetWordCount === w
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {w}w
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="informative and engaging">Informative</option>
              <option value="authoritative and analytical">Authoritative</option>
              <option value="conversational and witty">Conversational</option>
              <option value="step-by-step tutorial">Tutorial Guide</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleGenerateArticle}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Writing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Article</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status notice */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-inner ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-800/80 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white px-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Studio Grid: Editor (left) + SEO Auditor / Assets (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Area (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Post Title */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Article Title (H1)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter high-converting, SEO-optimized title..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-base font-bold text-white placeholder-slate-600 focus:outline-none"
            />
          </div>

          {/* Meta Description */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Meta Description (140-160 characters)
              </label>
              <span className={`text-[10px] font-mono ${
                metaDescription.length >= 120 && metaDescription.length <= 160
                  ? 'text-emerald-400'
                  : 'text-slate-500'
              }`}>
                {metaDescription.length} chars
              </span>
            </div>
            <textarea
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Compelling search snippet hook including target keyword..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-none"
            />
          </div>

          {/* Content Body Editor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
            {/* Toolbar */}
            <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    viewMode === 'visual'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visual Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    viewMode === 'code'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>HTML Source</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAddGraphic}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded-lg flex items-center space-x-1 border border-slate-700 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add AI Graphic</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded-lg flex items-center space-x-1 border border-slate-700 cursor-pointer"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSuccess ? 'Copied!' : 'Copy HTML'}</span>
                </button>
              </div>
            </div>

            {/* Editor Content */}
            {viewMode === 'visual' ? (
              <div className="p-6 min-h-[460px] max-h-[680px] overflow-y-auto bg-slate-950/40 text-slate-200">
                {contentHtml ? (
                  <div
                    className="article-body-content text-slate-200 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-slate-300 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_ol]:mb-4 [&_li]:text-slate-300 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-indigo-200 [&_blockquote]:my-4 [&_a]:text-blue-400 [&_a]:underline [&_img]:rounded-xl [&_img]:my-4 [&_img]:shadow-lg"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-600" />
                    <p className="text-xs">Your generated article will appear here.</p>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                rows={22}
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder="<h2>Introduction</h2><p>Start writing or generate with AI above...</p>"
                className="w-full bg-slate-950 p-4 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none min-h-[460px]"
              />
            )}

            {/* Footer Stats */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-4">
                <span>Words: <strong className="text-white">{cleanWordCount.toLocaleString()}</strong></span>
                <span>Reading Time: <strong className="text-white">{readingTime} min</strong></span>
              </div>
              <button
                type="button"
                onClick={() => handleRunAudit()}
                disabled={isAuditing}
                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{isAuditing ? 'Auditing...' : 'Run Live SEO Audit'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Tags, Internal Links & SEO Audit (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tags & Categories */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Labels / Tags
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                placeholder="Add tag (e.g. SEO, AI)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddLabel}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {labels.map((l) => (
                <span
                  key={l}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center space-x-1"
                >
                  <span>#{l}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(l)}
                    className="text-slate-400 hover:text-rose-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Internal Linking Assistant */}
          {existingPosts.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center space-x-2">
                <Link2 className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Internal Linking ({existingPosts.length})
                </h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Click to insert a contextual hyperlink to an existing article:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-none">
                {existingPosts.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleInsertInternalLink(p)}
                    className="w-full text-left p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 hover:text-white border border-slate-850 truncate block transition-colors cursor-pointer"
                  >
                    + {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SEO Score & Audit Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <span>SEO Content Health</span>
              </h4>
              {seoAudit && (
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                  seoAudit.score >= 80
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : seoAudit.score >= 60
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {seoAudit.score}/100
                </span>
              )}
            </div>

            {seoAudit ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Density</span>
                    <strong className="text-white">{seoAudit.keywordDensity}%</strong>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Headings</span>
                    <strong className="text-white">{seoAudit.h2Count} H2s, {seoAudit.h3Count} H3s</strong>
                  </div>
                </div>

                {seoAudit.strengths && seoAudit.strengths.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Strengths</span>
                    {seoAudit.strengths.slice(0, 3).map((s, idx) => (
                      <p key={idx} className="text-[11px] text-emerald-200/90 flex items-start space-x-1">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </p>
                    ))}
                  </div>
                )}

                {seoAudit.issues && seoAudit.issues.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400">To Improve</span>
                    {seoAudit.issues.slice(0, 3).map((iss, idx) => (
                      <p key={idx} className="text-[11px] text-amber-200/90 flex items-start space-x-1">
                        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <span>{iss}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 space-y-2">
                <BarChart2 className="w-6 h-6 mx-auto text-slate-600" />
                <p className="text-xs">Generate or write content to view live SEO metrics.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Schedule Post</h3>
                <p className="text-xs text-slate-400">Set publication date and time for website</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Publication Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSchedulePost}
                disabled={isSubmitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
