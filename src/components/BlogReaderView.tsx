import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  Calendar, 
  Tag, 
  ArrowLeft, 
  Share2, 
  Bookmark, 
  Check, 
  ExternalLink, 
  PenLine, 
  User, 
  BookOpen, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Flame,
  Globe
} from 'lucide-react';
import { BlogPost, SiteConfig } from '../types';

interface BlogReaderViewProps {
  posts: BlogPost[];
  siteConfig: SiteConfig;
  selectedPost: BlogPost | null;
  onSelectPost: (post: BlogPost | null) => void;
  onEditInEditor?: (post: BlogPost) => void;
  isAdmin: boolean;
}

export const BlogReaderView: React.FC<BlogReaderViewProps> = ({
  posts,
  siteConfig,
  selectedPost,
  onSelectPost,
  onEditInEditor,
  isAdmin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter only LIVE posts for readers, unless admin is viewing
  const livePosts = posts.filter((p) => p.status === 'LIVE' || isAdmin);

  // Extract all unique labels
  const allLabels = Array.from(
    new Set(
      livePosts
        .flatMap((p) => p.labels || [])
        .filter(Boolean)
    )
  );

  const filteredPosts = livePosts.filter((post) => {
    if (selectedLabel !== 'ALL') {
      if (!post.labels?.includes(selectedLabel)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title?.toLowerCase().includes(q);
      const matchExcerpt = post.metaDescription?.toLowerCase().includes(q);
      const matchContent = post.content?.toLowerCase().includes(q);
      const matchLabels = post.labels?.some((l) => l.toLowerCase().includes(q));
      if (!matchTitle && !matchExcerpt && !matchContent && !matchLabels) return false;
    }
    return true;
  });

  const handleShareArticle = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Helper to format date
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recently published';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently published';
    }
  };

  // ----------------------------------------------------
  // SINGLE ARTICLE DETAIL VIEW
  // ----------------------------------------------------
  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-8 animate-in fade-in duration-200">
        {/* Top Back & Action Bar */}
        <div className="flex items-center justify-between py-3 border-b border-slate-800">
          <button
            type="button"
            onClick={() => onSelectPost(null)}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Articles</span>
          </button>

          <div className="flex items-center space-x-2">
            {isAdmin && onEditInEditor && (
              <button
                type="button"
                onClick={() => onEditInEditor(selectedPost)}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Edit in CMS</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareArticle}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {selectedPost.labels?.map((label) => (
              <span
                key={label}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              >
                #{label}
              </span>
            ))}
            {selectedPost.status !== 'LIVE' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {selectedPost.status}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {selectedPost.title}
          </h1>

          {selectedPost.metaDescription && (
            <p className="text-base text-slate-300 leading-relaxed font-normal">
              {selectedPost.metaDescription}
            </p>
          )}

          {/* Author & Metadata */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow">
                {selectedPost.author?.displayName?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <p className="font-semibold text-white">{selectedPost.author?.displayName || siteConfig.authorName}</p>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(selectedPost.publishedAt || selectedPost.createdAt)}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{selectedPost.readingTimeMinutes || 5} min read</span>
                  </span>
                </div>
              </div>
            </div>

            {selectedPost.wordCount && (
              <span className="text-slate-500 text-[11px] hidden sm:inline">
                {selectedPost.wordCount.toLocaleString()} words
              </span>
            )}
          </div>
        </header>

        {/* Cover image if available */}
        {selectedPost.coverImageUrl && !selectedPost.content.includes(selectedPost.coverImageUrl) && (
          <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl max-h-[460px]">
            <img
              src={selectedPost.coverImageUrl}
              alt={selectedPost.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article HTML Content */}
        <article className="prose prose-invert max-w-none text-slate-200 leading-relaxed space-y-4">
          <div
            className="article-body-content text-slate-200 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-slate-300 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_ol]:mb-4 [&_li]:text-slate-300 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-indigo-200 [&_blockquote]:my-4 [&_a]:text-blue-400 [&_a]:underline [&_img]:rounded-xl [&_img]:my-4 [&_img]:shadow-lg"
            dangerouslySetInnerHTML={{ __html: selectedPost.content }}
          />
        </article>

        {/* Author Bio Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start space-x-4 mt-12 shadow-md">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow shrink-0">
            {selectedPost.author?.displayName?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">
              Written by {selectedPost.author?.displayName || siteConfig.authorName}
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {siteConfig.siteTagline || 'Publisher and content strategist on this website.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // BLOG HOME / POSTS DIRECTORY VIEW
  // ----------------------------------------------------
  return (
    <div className="space-y-8 pb-24">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-slate-800/80 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
            <Globe className="w-3.5 h-3.5" />
            <span>Live Publication Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {siteConfig.siteTitle || 'ApexBlog AI'}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-2xl">
            {siteConfig.siteTagline || 'Autonomous AI Content & Search Engine Publishing Platform'}
          </p>

          {/* Search bar */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by title, keyword, or topic..."
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 shadow-inner focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-500 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      {allLabels.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedLabel('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedLabel === 'ALL'
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Topics ({livePosts.length})
          </button>
          {allLabels.map((lbl) => (
            <button
              key={lbl}
              type="button"
              onClick={() => setSelectedLabel(lbl)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedLabel === lbl
                  ? 'bg-indigo-600 text-white shadow shadow-indigo-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              #{lbl}
            </button>
          ))}
        </div>
      )}

      {/* Articles Grid */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-3xl space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No articles found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? `No articles matched your search query "${searchQuery}".`
              : 'There are no published articles on the website yet. Go to the AI Writer to generate and publish your first article!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col group cursor-pointer"
            >
              {/* Cover image or fallback badge */}
              {post.coverImageUrl ? (
                <div className="h-44 w-full overflow-hidden bg-slate-950 relative">
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {post.status !== 'LIVE' && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/80 text-white shadow">
                      {post.status}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-32 w-full bg-gradient-to-br from-indigo-950 to-slate-900 p-4 flex flex-col justify-between border-b border-slate-800/80">
                  <div className="flex items-center space-x-1.5 text-[11px] text-indigo-400 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Featured Article</span>
                  </div>
                  {post.labels && post.labels[0] && (
                    <span className="self-start px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      #{post.labels[0]}
                    </span>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{post.readingTimeMinutes || 5} min read</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>

                  {post.metaDescription && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {post.metaDescription}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                      {post.author?.displayName?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <span className="text-slate-300 text-xs truncate max-w-[110px]">
                      {post.author?.displayName || siteConfig.authorName}
                    </span>
                  </div>

                  <span className="text-indigo-400 font-bold flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                    <span>Read</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
