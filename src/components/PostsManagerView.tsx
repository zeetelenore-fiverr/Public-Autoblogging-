import React, { useState } from 'react';
import { 
  ListFilter, 
  Search, 
  ExternalLink, 
  PenLine, 
  Send, 
  Clock, 
  RotateCcw, 
  Trash2, 
  RefreshCw, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus
} from 'lucide-react';
import { BlogPost } from '../types';
import { siteService } from '../services/siteService';

interface PostsManagerViewProps {
  posts: BlogPost[];
  onRefreshPosts: () => void;
  isRefreshing: boolean;
  onEditPost: (post: BlogPost) => void;
  onViewPost: (post: BlogPost) => void;
  onNewArticle: () => void;
}

export const PostsManagerView: React.FC<PostsManagerViewProps> = ({
  posts,
  onRefreshPosts,
  isRefreshing,
  onEditPost,
  onViewPost,
  onNewArticle,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'DRAFT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredPosts = posts.filter((post) => {
    if (filterStatus !== 'ALL') {
      if (post.status !== filterStatus) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title?.toLowerCase().includes(q);
      const matchLabels = post.labels?.some((l) => l.toLowerCase().includes(q));
      if (!matchTitle && !matchLabels) return false;
    }
    return true;
  });

  const handlePublishNow = async (post: BlogPost) => {
    setActionLoadingId(post.id);
    setNotification(null);
    try {
      await siteService.publishPost(post.id);
      setNotification({ type: 'success', text: `Published "${post.title}" live to website!` });
      onRefreshPosts();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to publish post' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevertToDraft = async (post: BlogPost) => {
    setActionLoadingId(post.id);
    setNotification(null);
    try {
      await siteService.revertToDraft(post.id);
      setNotification({ type: 'success', text: `Reverted "${post.title}" to draft.` });
      onRefreshPosts();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to revert post' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePost = async (post: BlogPost) => {
    if (!window.confirm(`Are you sure you want to delete "${post.title}" from the website?`)) return;
    setActionLoadingId(post.id);
    setNotification(null);
    try {
      await siteService.deletePost(post.id);
      setNotification({ type: 'success', text: `Deleted post successfully.` });
      onRefreshPosts();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to delete post' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Draft';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Website Article Manager</h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage your self-hosted blog posts, published articles, drafts, and scheduled releases.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefreshPosts}
              disabled={isRefreshing}
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Refresh posts"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onNewArticle}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Article</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {(['ALL', 'LIVE', 'SCHEDULED', 'DRAFT'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white shadow shadow-indigo-600/20'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Articles' : st === 'LIVE' ? 'Published' : st}
                {' ('}
                {st === 'ALL'
                  ? posts.length
                  : posts.filter((p) => p.status === st).length}
                {')'}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or label..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {notification && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-800/80 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <ListFilter className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No articles found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No articles match "${searchQuery}".`
              : 'Start by writing an article in the AI Writer or running an automated campaign!'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/80">
            {filteredPosts.map((post) => {
              const isLoading = actionLoadingId === post.id;
              return (
                <div
                  key={post.id}
                  className="p-5 hover:bg-slate-850/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          post.status === 'LIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : post.status === 'SCHEDULED'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {post.status}
                      </span>

                      <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {post.status === 'SCHEDULED' && post.scheduledAt
                            ? `Scheduled: ${formatDate(post.scheduledAt)}`
                            : formatDate(post.publishedAt || post.createdAt)}
                        </span>
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm hover:text-indigo-300 transition-colors">
                      {post.title}
                    </h3>

                    {post.labels && post.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {post.labels.map((l) => (
                          <span
                            key={l}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-slate-400 border border-slate-800"
                          >
                            #{l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => onViewPost(post)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
                      title="View on website"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditPost(post)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
                      title="Edit in AI Studio"
                    >
                      <PenLine className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Edit</span>
                    </button>

                    {post.status !== 'LIVE' ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handlePublishNow(post)}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Publish immediately"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleRevertToDraft(post)}
                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Revert to Draft"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleDeletePost(post)}
                      className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/80 rounded-xl transition-colors cursor-pointer"
                      title="Delete post"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
