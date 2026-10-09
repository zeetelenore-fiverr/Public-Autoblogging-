export type KdLevel = 'very_easy' | 'easy' | 'possible' | 'hard' | 'very_hard';

export interface KeywordItem {
  keyword: string;
  kd: number; // 0-100
  kdLevel: KdLevel;
  searchVolume: number;
  cpc: number;
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  serpAnalysis: string;
  suggestedTitle: string;
  recommendedWordCount: number;
  opportunityScore: number;
}

export interface KeywordResearchResult {
  seedKeyword: string;
  summary: string;
  keywords: KeywordItem[];
}

export type PostStatus = 'LIVE' | 'DRAFT' | 'SCHEDULED';

export interface BlogPost {
  id: string;
  title: string;
  content: string; // HTML content
  slug: string;
  metaDescription?: string;
  status: PostStatus;
  publishedAt?: string; // ISO string
  scheduledAt?: string; // ISO string
  createdAt: string;
  updatedAt: string;
  labels: string[];
  coverImageUrl?: string;
  inlineImageUrl?: string;
  author: {
    displayName: string;
    avatarUrl?: string;
  };
  readingTimeMinutes?: number;
  wordCount?: number;
  targetKeyword?: string;
}

export interface BloggerBlog {
  id: string;
  name: string;
  description?: string;
  url: string;
  posts: {
    totalItems: number;
  };
  pages?: {
    totalItems: number;
  };
}

// Backwards compatibility alias
export type BloggerPost = BlogPost;


export interface AdminUser {
  username: string;
  email: string;
  displayName: string;
  role: 'admin';
  createdAt: string;
}

export interface SiteConfig {
  siteTitle: string;
  siteTagline: string;
  authorName: string;
  bio?: string;
  defaultNiche?: string;
}

export type AiProviderType = 'gemini' | 'chatgpt' | 'claude' | 'grok';

export interface AiProviderConfig {
  provider: AiProviderType;
  name: string;
  description: string;
  keyPrefix: string;
  apiKey: string;
  selectedModel: string;
  availableModels: { id: string; name: string; description: string; badge?: string }[];
  keyHelpUrl: string;
  keyHelpText: string;
  isFreeTierAvailable: boolean;
  isConfigured: boolean;
}

export interface SeoAuditResult {
  score: number;
  wordCount: number;
  keywordCount: number;
  keywordDensity: number;
  keywordInTitle: boolean;
  keywordInMeta: boolean;
  titleLength: number;
  metaLength: number;
  h2Count: number;
  h3Count: number;
  linksCount: number;
  imagesCount: number;
  issues: string[];
  strengths: string[];
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  slug: string;
  labels: string[];
  estimatedReadingTimeMinutes: number;
  actualWordCount: number;
  htmlContent: string;
  coverImagePrompt?: string;
  inlineImagePrompt?: string;
  coverImageUrl?: string;
  inlineImageUrl?: string;
  seoAudit?: {
    overallScore: number;
    primaryKeywordInTitle: boolean;
    primaryKeywordInFirst100Words: boolean;
    headingCoverage: string;
    keywordDensityPercent: number;
    internalLinksCount: number;
    hasFaqSection: boolean;
    recommendations: string[];
  };
}

export interface CampaignQueueItem {
  id: string;
  keyword: KeywordItem;
  targetWordCount: number;
  scheduledTime: string; // ISO date string
  status: 'pending' | 'generating' | 'ready' | 'scheduled' | 'draft' | 'published' | 'failed' | 'scheduled_blogger' | 'draft_blogger' | 'published_blogger';
  generatedArticle?: GeneratedArticle;
  postId?: string;
  articleSlug?: string;
  bloggerPostId?: string;
  bloggerUrl?: string;
  errorMessage?: string;
  publishedAt?: string;
}


export interface CampaignConfig {
  name: string;
  targetWordCount: number;
  tone: string;
  generateImages: boolean;
  includeFaq: boolean;
  includeKeyTakeaways: boolean;
  frequencyDays: number;
  frequencyHours?: number;
  startDateTime: string;
  publishAction: 'schedule' | 'draft' | 'publish';
  keywords: KeywordItem[];
}

