import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BlogReaderView } from './components/BlogReaderView';
import { AiEditorView } from './components/AiEditorView';
import { PostsManagerView } from './components/PostsManagerView';
import { KeywordResearchView } from './components/KeywordResearchView';
import { CampaignQueueView } from './components/CampaignQueueView';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AiProvidersModal } from './components/AiProvidersModal';
import { CampaignModal } from './components/CampaignModal';
import { BlogPost, KeywordItem, CampaignConfig, CampaignQueueItem, AdminUser, SiteConfig, AiProviderType } from './types';
import { fetchServerConfig, ServerConfig, generateArticle } from './services/aiApi';
import { siteService } from './services/siteService';
import { Rocket, ShieldCheck } from 'lucide-react';

export default function App() {
  // Navigation Tabs: reader (public website blog), editor, posts, keywords, campaign
  const [activeTab, setActiveTab] = useState<'reader' | 'editor' | 'posts' | 'keywords' | 'campaign'>('reader');

  // Server Config
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  // Admin Account & Site Profile
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [hasAdminAccount, setHasAdminAccount] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => siteService.getSiteConfig());

  // Multi-Provider AI Settings
  const [activeAiProvider, setActiveAiProvider] = useState<AiProviderType>(() => siteService.getActiveProvider());
  const [activeAiModel, setActiveAiModel] = useState<string>(() => {
    const all = siteService.getAiProviders();
    return all[siteService.getActiveProvider()]?.selectedModel || 'gemini-3.8-flash';
  });

  // Native Website Posts
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  const [selectedPostForReader, setSelectedPostForReader] = useState<BlogPost | null>(null);

  // Editor Bridging
  const [selectedKeywordForEditor, setSelectedKeywordForEditor] = useState<KeywordItem | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Campaign State
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignKeywords, setCampaignKeywords] = useState<KeywordItem[]>([]);
  const [campaignQueue, setCampaignQueue] = useState<CampaignQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('website_seo_campaign_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isCampaignProcessing, setIsCampaignProcessing] = useState(false);
  const [campaignTargetWords, setCampaignTargetWords] = useState<number>(1200);

  // Modals
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [showAiKeysModal, setShowAiKeysModal] = useState(false);

  // Sync campaignQueue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('website_seo_campaign_queue', JSON.stringify(campaignQueue));
    } catch {}
  }, [campaignQueue]);

  // Load Initial Server Config & Admin Status
  useEffect(() => {
    fetchServerConfig()
      .then((cfg) => setServerConfig(cfg))
      .catch((err) => console.warn('Could not load server config:', err));

    // Check Admin status
    siteService.getAdminStatus().then((status) => {
      setHasAdminAccount(status.hasAdmin);
      if (status.siteConfig) setSiteConfig(status.siteConfig);
      if (status.currentUser) {
        setAdminUser(status.currentUser);
        setIsAdmin(true);
      } else {
        const localToken = siteService.getStoredToken();
        const localAdmin = siteService.getStoredAdmin();
        if (localToken && localAdmin) {
          setAdminUser(localAdmin);
          setIsAdmin(true);
        }
      }
    });

    // Load initial posts
    loadPosts();

    // Listen to events
    const handlePostsUpdated = (e: any) => {
      if (e.detail?.posts) setPosts(e.detail.posts);
    };

    const handleAuthChanged = (e: any) => {
      setIsAdmin(e.detail?.isAuthenticated);
      setAdminUser(e.detail?.user || null);
    };

    const handleSiteConfigChanged = (e: any) => {
      if (e.detail) setSiteConfig(e.detail);
    };

    const handleAiProviderChanged = (e: any) => {
      if (e.detail) {
        setActiveAiProvider(e.detail);
        const all = siteService.getAiProviders();
        setActiveAiModel(all[e.detail as AiProviderType]?.selectedModel || '');
      }
    };

    window.addEventListener('posts_updated', handlePostsUpdated);
    window.addEventListener('admin_auth_changed', handleAuthChanged);
    window.addEventListener('site_config_changed', handleSiteConfigChanged);
    window.addEventListener('active_provider_changed', handleAiProviderChanged);

    return () => {
      window.removeEventListener('posts_updated', handlePostsUpdated);
      window.removeEventListener('admin_auth_changed', handleAuthChanged);
      window.removeEventListener('site_config_changed', handleSiteConfigChanged);
      window.removeEventListener('active_provider_changed', handleAiProviderChanged);
    };
  }, []);

  const loadPosts = async () => {
    setIsRefreshingPosts(true);
    try {
      const fetched = await siteService.getPosts();
      setPosts(fetched);
    } catch (e) {
      console.warn('Load posts error:', e);
    } finally {
      setIsRefreshingPosts(false);
    }
  };

  // Launch Campaign Workflow
  const handleOpenCampaignModal = (keywords: KeywordItem[]) => {
    setCampaignKeywords(keywords);
    setShowCampaignModal(true);
  };

  const handleStartCampaign = async (config: CampaignConfig) => {
    setShowCampaignModal(false);
    setCampaignTargetWords(config.targetWordCount);

    const startDate = new Date(config.startDateTime);
    const newItems: CampaignQueueItem[] = config.keywords.map((kw, idx) => {
      const postDate = new Date(startDate);
      const hoursOffset = config.frequencyDays * 24 * idx;
      postDate.setTime(postDate.getTime() + hoursOffset * 60 * 60 * 1000);

      return {
        id: `camp_${Date.now()}_${idx}`,
        keyword: kw,
        targetWordCount: config.targetWordCount,
        scheduledTime: postDate.toISOString(),
        status: 'pending',
      };
    });

    setCampaignQueue((prev) => [...prev, ...newItems]);
    setActiveTab('campaign');

    executeCampaignQueue(newItems, config);
  };

  // Process Campaign Queue
  const executeCampaignQueue = async (items: CampaignQueueItem[], config: CampaignConfig) => {
    setIsCampaignProcessing(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      setCampaignQueue((current) =>
        current.map((q) => (q.id === item.id ? { ...q, status: 'generating' } : q))
      );

      try {
        const linksContext = posts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          url: `/post/${p.slug}`,
        }));

        const activeProviders = siteService.getAiProviders();
        const currentProviderConfig = activeProviders[activeAiProvider];

        const generated = await generateArticle({
          keyword: item.keyword.keyword,
          title: item.keyword.suggestedTitle,
          wordCount: config.targetWordCount,
          tone: config.tone,
          niche: siteConfig.siteTitle,
          existingPosts: linksContext,
          includeFaq: config.includeFaq,
          includeKeyTakeaways: config.includeKeyTakeaways,
          generateImages: config.generateImages,
          provider: activeAiProvider,
          apiKey: currentProviderConfig?.apiKey,
          model: currentProviderConfig?.selectedModel,
        });

        // Publish or schedule directly to website
        let postStatus: 'LIVE' | 'DRAFT' | 'SCHEDULED' = 'DRAFT';
        if (config.publishAction === 'publish') postStatus = 'LIVE';
        else if (config.publishAction === 'schedule') postStatus = 'SCHEDULED';

        const createdPost = await siteService.createPost({
          title: generated.title,
          content: generated.htmlContent,
          slug: generated.slug,
          metaDescription: generated.metaDescription,
          labels: generated.labels,
          status: postStatus,
          scheduledAt: config.publishAction === 'schedule' ? item.scheduledTime : undefined,
          publishedAt: config.publishAction === 'publish' ? new Date().toISOString() : undefined,
          targetKeyword: item.keyword.keyword,
        });

        const queueStatus = config.publishAction === 'schedule' 
          ? 'scheduled' 
          : config.publishAction === 'publish' 
          ? 'published' 
          : 'draft';

        setCampaignQueue((current) =>
          current.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: queueStatus,
                  generatedArticle: generated,
                  postId: createdPost.id,
                  articleSlug: createdPost.slug,
                  publishedAt: createdPost.publishedAt,
                }
              : q
          )
        );

        loadPosts();
      } catch (err: any) {
        console.error(`Error processing campaign item ${item.keyword.keyword}:`, err);
        setCampaignQueue((current) =>
          current.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'failed',
                  errorMessage: err.message || 'Generation failed',
                }
              : q
          )
        );
      }
    }

    setIsCampaignProcessing(false);
  };

  const handlePublishNowQueueItem = async (item: CampaignQueueItem) => {
    if (!item.generatedArticle) throw new Error('Article not generated yet');

    const createdPost = await siteService.createPost({
      title: item.generatedArticle.title,
      content: item.generatedArticle.htmlContent,
      slug: item.generatedArticle.slug,
      metaDescription: item.generatedArticle.metaDescription,
      labels: item.generatedArticle.labels,
      status: 'LIVE',
      publishedAt: new Date().toISOString(),
      targetKeyword: item.keyword.keyword,
    });

    setCampaignQueue((current) =>
      current.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: 'published',
              postId: createdPost.id,
              articleSlug: createdPost.slug,
              publishedAt: createdPost.publishedAt,
            }
          : q
      )
    );

    loadPosts();
  };

  const handleSaveAsDraftQueueItem = async (item: CampaignQueueItem) => {
    if (!item.generatedArticle) throw new Error('Article not generated yet');

    const createdPost = await siteService.createPost({
      title: item.generatedArticle.title,
      content: item.generatedArticle.htmlContent,
      slug: item.generatedArticle.slug,
      metaDescription: item.generatedArticle.metaDescription,
      labels: item.generatedArticle.labels,
      status: 'DRAFT',
      targetKeyword: item.keyword.keyword,
    });

    setCampaignQueue((current) =>
      current.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: 'draft',
              postId: createdPost.id,
              articleSlug: createdPost.slug,
            }
          : q
      )
    );

    loadPosts();
  };

  const handleUpdateScheduleTime = (itemId: string, newTime: string) => {
    setCampaignQueue((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, scheduledTime: newTime } : i))
    );
  };

  const handleDeleteQueueItem = (itemId: string) => {
    setCampaignQueue((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handlePublishAllNow = async () => {
    const readyItems = campaignQueue.filter(
      (i) => i.status === 'ready' || i.status === 'scheduled' || i.status === 'draft'
    );
    for (const item of readyItems) {
      try {
        await handlePublishNowQueueItem(item);
      } catch (err) {
        console.warn(`Bulk publish failed for "${item.keyword.keyword}":`, err);
      }
    }
  };

  const livePostsCount = posts.filter((p) => p.status === 'LIVE').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedPostForReader(null);
          setActiveTab(tab);
        }}
        isAdmin={isAdmin}
        hasAdminAccount={hasAdminAccount}
        adminUser={adminUser}
        siteConfig={siteConfig}
        activeAiProvider={activeAiProvider}
        activeAiModel={activeAiModel}
        onOpenAiKeysModal={() => setShowAiKeysModal(true)}
        onOpenAdminAuthModal={() => setShowAdminAuthModal(true)}
        livePostsCount={livePostsCount}
      />

      {/* Onboarding Banner if no Admin Account exists */}
      {!hasAdminAccount && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-indigo-500/20 border border-amber-500/40 text-amber-200 px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 shadow-xl">
            <div className="flex items-center space-x-3">
              <Rocket className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-100 text-sm">
                  First-Time Deployment Detected: Set up your Admin Account
                </p>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Create your administrator account in 10 seconds to publish articles directly to this website and manage AI keys.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAdminAuthModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl cursor-pointer transition-all shadow-md flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Create Admin Account Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Tab: Live Blog / Public Reader */}
        {activeTab === 'reader' && (
          <BlogReaderView
            posts={posts}
            siteConfig={siteConfig}
            selectedPost={selectedPostForReader}
            onSelectPost={setSelectedPostForReader}
            onEditInEditor={(post) => {
              setEditingPost(post);
              setActiveTab('editor');
            }}
            isAdmin={isAdmin}
          />
        )}

        {/* Tab: AI Article Writer / Editor */}
        {activeTab === 'editor' && (
          <AiEditorView
            initialKeyword={selectedKeywordForEditor}
            existingPosts={posts}
            editingPost={editingPost}
            onClearEditingPost={() => setEditingPost(null)}
            onViewPostOnSite={(post) => {
              setSelectedPostForReader(post);
              setActiveTab('reader');
            }}
            activeAiProvider={activeAiProvider}
            onOpenAiKeysModal={() => setShowAiKeysModal(true)}
            siteConfig={siteConfig}
            onPostPublishedOrScheduled={() => {
              loadPosts();
            }}
          />
        )}

        {/* Tab: Posts CMS Manager */}
        {activeTab === 'posts' && (
          <PostsManagerView
            posts={posts}
            onRefreshPosts={loadPosts}
            isRefreshing={isRefreshingPosts}
            onEditPost={(post) => {
              setEditingPost(post);
              setSelectedKeywordForEditor(null);
              setActiveTab('editor');
            }}
            onViewPost={(post) => {
              setSelectedPostForReader(post);
              setActiveTab('reader');
            }}
            onNewArticle={() => {
              setEditingPost(null);
              setSelectedKeywordForEditor(null);
              setActiveTab('editor');
            }}
          />
        )}

        {/* Tab: Keyword Research & KD Analyzer */}
        {activeTab === 'keywords' && (
          <KeywordResearchView
            onSelectKeywordForEditor={(kw) => {
              setSelectedKeywordForEditor(kw);
              setEditingPost(null);
              setActiveTab('editor');
            }}
            onLaunchCampaignForKeywords={handleOpenCampaignModal}
            connectedBlogName={siteConfig.siteTitle}
            hasGeminiKey={true}
          />
        )}

        {/* Tab: Automated Campaign Queue */}
        {activeTab === 'campaign' && (
          <CampaignQueueView
            queueItems={campaignQueue}
            onEditItemInEditor={(item) => {
              setSelectedKeywordForEditor(item.keyword);
              if (item.generatedArticle) {
                setEditingPost({
                  id: item.postId || '',
                  title: item.generatedArticle.title,
                  content: item.generatedArticle.htmlContent,
                  slug: item.generatedArticle.slug,
                  metaDescription: item.generatedArticle.metaDescription,
                  labels: item.generatedArticle.labels,
                  status: 'DRAFT',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  author: { displayName: siteConfig.authorName },
                });
              }
              setActiveTab('editor');
            }}
            onRetryItem={(item) => {
              executeCampaignQueue([item], {
                name: 'Retry',
                targetWordCount: item.targetWordCount,
                tone: 'informative and engaging',
                generateImages: true,
                includeFaq: true,
                includeKeyTakeaways: true,
                frequencyDays: 1,
                startDateTime: item.scheduledTime,
                publishAction: 'schedule',
                keywords: [item.keyword],
              });
            }}
            onPublishNow={handlePublishNowQueueItem}
            onSaveAsDraft={handleSaveAsDraftQueueItem}
            onUpdateScheduleTime={handleUpdateScheduleTime}
            onDeleteItem={handleDeleteQueueItem}
            onPublishAllNow={handlePublishAllNow}
            onImportQueue={(imported) => {
              setCampaignQueue((prev) => {
                const map = new Map(prev.map((i) => [i.id, i]));
                for (const item of imported) map.set(item.id, item);
                return Array.from(map.values());
              });
            }}
            onClearCompleted={() => {
              setCampaignQueue((prev) => prev.filter((i) => i.status !== 'published'));
            }}
            isProcessing={isCampaignProcessing}
            targetWordCount={campaignTargetWords}
          />
        )}
      </main>

      {/* Admin Auth / Setup / Profile Modal */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        hasAdmin={hasAdminAccount}
        currentUser={adminUser}
        siteConfig={siteConfig}
        onAuthSuccess={(user, cfg) => {
          setIsAdmin(true);
          setHasAdminAccount(true);
          setAdminUser(user);
          setSiteConfig(cfg);
        }}
        onLogout={() => {
          siteService.logoutAdmin();
          setIsAdmin(false);
          setAdminUser(null);
        }}
      />

      {/* AI Providers & Free Keys Modal (Claude, ChatGPT, Grok, Gemini) */}
      <AiProvidersModal
        isOpen={showAiKeysModal}
        onClose={() => setShowAiKeysModal(false)}
        activeProvider={activeAiProvider}
        onSelectActiveProvider={(p) => {
          setActiveAiProvider(p);
          const all = siteService.getAiProviders();
          setActiveAiModel(all[p]?.selectedModel || '');
        }}
        hasServerGeminiKey={serverConfig?.hasGeminiKey ?? true}
      />

      {/* Campaign Setup Modal */}
      <CampaignModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        keywords={campaignKeywords}
        onStartCampaign={handleStartCampaign}
      />
    </div>
  );
}
