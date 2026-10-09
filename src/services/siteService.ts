import { BlogPost, AdminUser, SiteConfig, AiProviderType, AiProviderConfig, PostStatus } from '../types';

export const DEFAULT_PROVIDERS: Record<AiProviderType, AiProviderConfig> = {
  gemini: {
    provider: 'gemini',
    name: 'Google Gemini',
    description: 'Generous free tier with Gemini 3.8 Flash via Google AI Studio.',
    keyPrefix: 'AIzaSy...',
    apiKey: '',
    selectedModel: 'gemini-3.8-flash',
    availableModels: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Next-gen reasoning speed & free tier quota', badge: 'Recommended Free' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Lightweight ultra-fast response' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', description: 'Continuously updated fast model' },
    ],
    keyHelpUrl: 'https://aistudio.google.com/app/apikey',
    keyHelpText: 'Get Free Gemini Key on Google AI Studio',
    isFreeTierAvailable: true,
    isConfigured: false,
  },
  chatgpt: {
    provider: 'chatgpt',
    name: 'ChatGPT / OpenAI',
    description: 'Industry-standard GPT-4o and GPT-4o-mini models.',
    keyPrefix: 'sk-proj-... / sk-...',
    apiKey: '',
    selectedModel: 'gpt-4o-mini',
    availableModels: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, high quality, and ultra low cost', badge: 'Best Value' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Flagship high-intelligence model' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Comprehensive knowledge base' },
    ],
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    keyHelpText: 'Get OpenAI API Key on OpenAI Platform',
    isFreeTierAvailable: false,
    isConfigured: false,
  },
  claude: {
    provider: 'claude',
    name: 'Claude / Anthropic',
    description: 'Exceptional nuanced prose, engaging tone, and natural writing.',
    keyPrefix: 'sk-ant-api...',
    apiKey: '',
    selectedModel: 'claude-3-5-sonnet-20241022',
    availableModels: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Highest-quality human-like writing', badge: 'Top Writing' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Lightning-fast generation' },
    ],
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    keyHelpText: 'Get Claude API Key on Anthropic Console',
    isFreeTierAvailable: false,
    isConfigured: false,
  },
  grok: {
    provider: 'grok',
    name: 'Grok / xAI',
    description: 'Witty, insightful, up-to-date AI from xAI.',
    keyPrefix: 'xai-...',
    apiKey: '',
    selectedModel: 'grok-2-latest',
    availableModels: [
      { id: 'grok-2-latest', name: 'Grok 2', description: 'Premier frontier reasoning model', badge: 'xAI' },
      { id: 'grok-beta', name: 'Grok Beta', description: 'High-speed generation' },
    ],
    keyHelpUrl: 'https://console.x.ai/',
    keyHelpText: 'Get Grok API Key on xAI Console',
    isFreeTierAvailable: false,
    isConfigured: false,
  },
};

const STORAGE_KEYS = {
  ADMIN_USER: 'apex_blog_admin_user',
  ADMIN_TOKEN: 'apex_blog_admin_token',
  SITE_CONFIG: 'apex_blog_site_config',
  LOCAL_POSTS: 'apex_blog_posts_cache',
  AI_PROVIDERS: 'apex_blog_ai_providers',
  ACTIVE_PROVIDER: 'apex_blog_active_provider',
};

// Seed sample posts for first-time visitors
const INITIAL_DEMO_POSTS: BlogPost[] = [
  {
    id: 'post-demo-1',
    title: 'The Complete Guide to Next-Gen AI Blogging and Organic Search Dominance',
    slug: 'guide-to-next-gen-ai-blogging-seo',
    metaDescription: 'Discover how modern AI models like Gemini, Claude, and GPT-4o paired with low-KD keyword research create unstoppable organic traffic engines.',
    status: 'LIVE',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    labels: ['AI Content', 'SEO Strategy', 'Organic Growth'],
    author: {
      displayName: 'Admin Editor',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    },
    readingTimeMinutes: 7,
    wordCount: 1650,
    targetKeyword: 'AI blogging organic search',
    content: `
      <h2>The Shift in Search Intent and Generative Engines</h2>
      <p>Search has fundamentally evolved. Search engines and AI-driven answer engines reward in-depth, structured content that directly satisfies the reader's intent without fluff.</p>
      <div style="background: rgba(37,99,235,0.08); border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #60a5fa; font-weight: 700;">Key Takeaway</h4>
        <p style="margin: 0; color: #cbd5e1; font-size: 14px;">Targeting low Keyword Difficulty (KD &lt; 25) queries with authoritative, well-structured long-form articles yields rapid top-3 rankings within weeks.</p>
      </div>
      <h2>Strategic Framework: From Seed Keyword to High Ranking</h2>
      <p>To rank reliably, follow this exact workflow:</p>
      <ul>
        <li><strong>Uncover low-hanging fruit:</strong> Search volume between 800 and 4,000 with KD below 30.</li>
        <li><strong>Comprehensive heading architecture:</strong> Use H2 and H3 tags answering People Also Ask questions.</li>
        <li><strong>Visual engagement:</strong> Embed relevant diagrams and contextual infographics.</li>
      </ul>
      <h2>Conclusion</h2>
      <p>Publishing consistently with automated scheduling and robust content guidelines establishes your domain authority faster than any competitor.</p>
    `,
  },
  {
    id: 'post-demo-2',
    title: 'Top 7 Low-Difficulty Keyword Tactics That Drive Instant Traffic',
    slug: 'top-7-low-difficulty-keyword-tactics',
    metaDescription: 'Learn actionable techniques to identify zero-competition keywords and rank on page 1 of search results without expensive backlink campaigns.',
    status: 'LIVE',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    publishedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    labels: ['Keyword Research', 'Growth Hacks'],
    author: {
      displayName: 'Admin Editor',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    },
    readingTimeMinutes: 5,
    wordCount: 1280,
    targetKeyword: 'low difficulty keyword tactics',
    content: `
      <h2>Why High-Volume Keywords Are a Trap for New Websites</h2>
      <p>Targeting mega keywords like "CRM software" or "crypto" will result in months of zero clicks. Instead, long-tail search phrases with KD 10-25 represent the true sweet spot for fast monetization.</p>
      <h3>1. The Modifier Strategy</h3>
      <p>Append modifiers like "step by step", "for beginners", "best templates", or "vs alternatives".</p>
      <h3>2. Forum & Community Gap Analysis</h3>
      <p>When forums rank on the first page, it is a clear indicator that no authoritative dedicated guide exists for that query.</p>
    `,
  },
];

export class SiteService {
  // ----------------------------------------------------
  // ADMIN AUTH & SETUP
  // ----------------------------------------------------

  async getAdminStatus(): Promise<{
    hasAdmin: boolean;
    siteConfig: SiteConfig;
    currentUser?: AdminUser;
  }> {
    try {
      const res = await fetch('/api/admin/status');
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn('Backend admin status check offline, checking local storage', e);
    }

    // Local storage fallback
    const localUser = this.getStoredAdmin();
    const localConfig = this.getSiteConfig();
    return {
      hasAdmin: Boolean(localUser),
      siteConfig: localConfig,
      currentUser: localUser || undefined,
    };
  }

  async setupInitialAdmin(payload: {
    username: string;
    email: string;
    password: string;
    siteTitle: string;
    siteTagline?: string;
    authorName?: string;
    initialApiKey?: string;
    aiProvider?: AiProviderType;
  }): Promise<{ success: boolean; token: string; user: AdminUser }> {
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        this.saveSession(data.token, data.user);
        this.saveSiteConfig({
          siteTitle: payload.siteTitle,
          siteTagline: payload.siteTagline || 'AI-Powered Organic Publishing Platform',
          authorName: payload.authorName || payload.username,
        });
        if (payload.initialApiKey && payload.aiProvider) {
          this.updateApiKey(payload.aiProvider, payload.initialApiKey);
        }
        return data;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to setup admin account');
      }
    } catch (err: any) {
      // Local fallback in case serverless environment disk is read-only
      const fallbackUser: AdminUser = {
        username: payload.username.trim(),
        email: payload.email.trim(),
        displayName: payload.authorName || payload.username,
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      const token = `adm_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      this.saveSession(token, fallbackUser);
      this.saveSiteConfig({
        siteTitle: payload.siteTitle,
        siteTagline: payload.siteTagline || 'AI-Powered Organic Publishing Platform',
        authorName: payload.authorName || payload.username,
      });
      if (payload.initialApiKey && payload.aiProvider) {
        this.updateApiKey(payload.aiProvider, payload.initialApiKey);
      }
      return { success: true, token, user: fallbackUser };
    }
  }

  async loginAdmin(usernameOrEmail: string, password: string): Promise<{ success: boolean; token: string; user: AdminUser }> {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });
      if (res.ok) {
        const data = await res.json();
        this.saveSession(data.token, data.user);
        return data;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Invalid username or password');
      }
    } catch (err: any) {
      // Fallback check against stored local user if offline
      const stored = this.getStoredAdmin();
      if (stored && (stored.username === usernameOrEmail.trim() || stored.email === usernameOrEmail.trim())) {
        const token = `adm_token_${Date.now()}`;
        this.saveSession(token, stored);
        return { success: true, token, user: stored };
      }
      throw err;
    }
  }

  logoutAdmin() {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
    window.dispatchEvent(new CustomEvent('admin_auth_changed', { detail: { isAuthenticated: false } }));
  }

  saveSession(token: string, user: AdminUser) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('admin_auth_changed', { detail: { isAuthenticated: true, user } }));
  }

  getStoredToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  }

  getStoredAdmin(): AdminUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getSiteConfig(): SiteConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SITE_CONFIG);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      siteTitle: 'ApexBlog AI',
      siteTagline: 'Autonomous AI Content & Search Engine Publishing Platform',
      authorName: 'Site Admin',
    };
  }

  saveSiteConfig(config: SiteConfig) {
    localStorage.setItem(STORAGE_KEYS.SITE_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('site_config_changed', { detail: config }));
  }

  // ----------------------------------------------------
  // NATIVE BLOG POSTS CRUD
  // ----------------------------------------------------

  async getPosts(): Promise<BlogPost[]> {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sync to localStorage cache
          localStorage.setItem(STORAGE_KEYS.LOCAL_POSTS, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.warn('Fetch posts from server failed, using local cache', e);
    }

    // Fallback to local storage
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_POSTS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Initial demo posts
    localStorage.setItem(STORAGE_KEYS.LOCAL_POSTS, JSON.stringify(INITIAL_DEMO_POSTS));
    return INITIAL_DEMO_POSTS;
  }

  async createPost(postData: Partial<BlogPost>): Promise<BlogPost> {
    const admin = this.getStoredAdmin();
    const config = this.getSiteConfig();

    const postPayload: BlogPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: postData.title || 'Untitled Post',
      slug: postData.slug || this.slugify(postData.title || 'untitled'),
      content: postData.content || '',
      metaDescription: postData.metaDescription || '',
      status: postData.status || 'DRAFT',
      scheduledAt: postData.scheduledAt,
      publishedAt: postData.status === 'LIVE' ? (postData.publishedAt || new Date().toISOString()) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      labels: postData.labels || [],
      coverImageUrl: postData.coverImageUrl,
      inlineImageUrl: postData.inlineImageUrl,
      author: {
        displayName: admin?.displayName || config.authorName || 'Site Admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
      },
      readingTimeMinutes: postData.readingTimeMinutes || Math.max(1, Math.round(((postData.content || '').replace(/<[^>]*>/g, '').split(/\s+/).length) / 200)),
      wordCount: postData.wordCount || (postData.content || '').replace(/<[^>]*>/g, '').split(/\s+/).length,
      targetKeyword: postData.targetKeyword,
    };

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getStoredToken() || ''}`,
        },
        body: JSON.stringify(postPayload),
      });

      if (res.ok) {
        const created = await res.json();
        this.updateLocalPostsList(created, 'add');
        return created;
      }
    } catch (e) {
      console.warn('Create post API request failed, saving to local cache', e);
    }

    // Local fallback
    this.updateLocalPostsList(postPayload, 'add');
    return postPayload;
  }

  async updatePost(id: string, postData: Partial<BlogPost>): Promise<BlogPost> {
    const existingList = await this.getPosts();
    const current = existingList.find((p) => p.id === id);

    const updated: BlogPost = {
      ...(current || {
        id,
        createdAt: new Date().toISOString(),
        author: { displayName: 'Site Admin' },
        labels: [],
      }),
      ...postData,
      id,
      updatedAt: new Date().toISOString(),
    } as BlogPost;

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getStoredToken() || ''}`,
        },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        const data = await res.json();
        this.updateLocalPostsList(data, 'update');
        return data;
      }
    } catch (e) {
      console.warn('Update post API call failed, updating local store', e);
    }

    this.updateLocalPostsList(updated, 'update');
    return updated;
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.getStoredToken() || ''}` },
      });
    } catch (e) {
      console.warn('Delete post API failed, updating local store', e);
    }

    this.updateLocalPostsList({ id } as BlogPost, 'delete');
    return true;
  }

  async publishPost(id: string): Promise<BlogPost> {
    return this.updatePost(id, {
      status: 'LIVE',
      publishedAt: new Date().toISOString(),
    });
  }

  async revertToDraft(id: string): Promise<BlogPost> {
    return this.updatePost(id, {
      status: 'DRAFT',
      publishedAt: undefined,
    });
  }

  private updateLocalPostsList(post: BlogPost, action: 'add' | 'update' | 'delete') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_POSTS);
      let posts: BlogPost[] = raw ? JSON.parse(raw) : [...INITIAL_DEMO_POSTS];

      if (action === 'add') {
        posts = [post, ...posts.filter((p) => p.id !== post.id)];
      } else if (action === 'update') {
        posts = posts.map((p) => (p.id === post.id ? post : p));
      } else if (action === 'delete') {
        posts = posts.filter((p) => p.id !== post.id);
      }

      localStorage.setItem(STORAGE_KEYS.LOCAL_POSTS, JSON.stringify(posts));
      window.dispatchEvent(new CustomEvent('posts_updated', { detail: { posts } }));
    } catch {}
  }

  // ----------------------------------------------------
  // MULTI-PROVIDER AI CONFIGURATION
  // ----------------------------------------------------

  getAiProviders(): Record<AiProviderType, AiProviderConfig> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AI_PROVIDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const geminiConfig = { ...DEFAULT_PROVIDERS.gemini, ...parsed.gemini, isConfigured: Boolean(parsed.gemini?.apiKey) };
        // Auto-upgrade obsolete or deprecated Gemini models
        if (!geminiConfig.selectedModel || geminiConfig.selectedModel.includes('gemini-2.') || geminiConfig.selectedModel.includes('gemini-1.') || geminiConfig.selectedModel === 'gemini-pro') {
          geminiConfig.selectedModel = 'gemini-3.8-flash';
        }
        geminiConfig.availableModels = DEFAULT_PROVIDERS.gemini.availableModels;

        return {
          gemini: geminiConfig,
          chatgpt: { ...DEFAULT_PROVIDERS.chatgpt, ...parsed.chatgpt, isConfigured: Boolean(parsed.chatgpt?.apiKey) },
          claude: { ...DEFAULT_PROVIDERS.claude, ...parsed.claude, isConfigured: Boolean(parsed.claude?.apiKey) },
          grok: { ...DEFAULT_PROVIDERS.grok, ...parsed.grok, isConfigured: Boolean(parsed.grok?.apiKey) },
        };
      }
    } catch {}

    return { ...DEFAULT_PROVIDERS };
  }

  saveAiProviders(providers: Record<AiProviderType, AiProviderConfig>) {
    localStorage.setItem(STORAGE_KEYS.AI_PROVIDERS, JSON.stringify(providers));
    window.dispatchEvent(new CustomEvent('ai_providers_changed', { detail: providers }));
  }

  getActiveProvider(): AiProviderType {
    const active = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER) as AiProviderType;
    if (active && DEFAULT_PROVIDERS[active]) {
      return active;
    }
    return 'gemini';
  }

  setActiveProvider(provider: AiProviderType) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, provider);
    window.dispatchEvent(new CustomEvent('active_provider_changed', { detail: provider }));
  }

  updateApiKey(provider: AiProviderType, key: string, model?: string) {
    const all = this.getAiProviders();
    if (all[provider]) {
      all[provider].apiKey = key.trim();
      all[provider].isConfigured = Boolean(key.trim());
      if (model) all[provider].selectedModel = model;
      this.saveAiProviders(all);
    }
  }

  async testAiProviderKey(provider: AiProviderType, apiKey: string, model: string): Promise<{ success: boolean; message: string; sampleText?: string }> {
    const res = await fetch('/api/ai/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Failed to verify key for ${provider}`);
    }
    return data;
  }

  slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export const siteService = new SiteService();
