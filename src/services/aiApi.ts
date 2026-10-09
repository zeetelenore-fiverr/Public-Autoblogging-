import { KeywordResearchResult, GeneratedArticle, SeoAuditResult, AiProviderType } from '../types';
import { siteService } from './siteService';

export interface ServerConfig {
  oAuthClientId: string;
  projectId: string;
  hasGeminiKey: boolean;
  hasOpenAiKey?: boolean;
  hasClaudeKey?: boolean;
  hasGrokKey?: boolean;
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) {
    throw new Error('Failed to load server configuration');
  }
  return await res.json();
}

function getAiCallHeadersAndBody() {
  const activeProvider = siteService.getActiveProvider();
  const allProviders = siteService.getAiProviders();
  const current = allProviders[activeProvider];

  return {
    provider: activeProvider,
    apiKey: current?.apiKey || '',
    model: current?.selectedModel || '',
  };
}

export async function researchKeywords(
  seedKeyword: string,
  niche?: string,
  targetAudience?: string,
  customProvider?: { provider: AiProviderType; apiKey?: string; model?: string }
): Promise<KeywordResearchResult> {
  const aiConfig = customProvider || getAiCallHeadersAndBody();

  const res = await fetch('/api/keywords/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seedKeyword,
      niche,
      targetAudience,
      ...aiConfig,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to research keywords');
  }

  return await res.json();
}

export interface GenerateArticleOptions {
  keyword: string;
  title?: string;
  wordCount?: number;
  tone?: string;
  niche?: string;
  secondaryKeywords?: string[];
  existingPosts?: Array<{ id: string; title: string; url?: string; slug?: string }>;
  includeFaq?: boolean;
  includeKeyTakeaways?: boolean;
  generateImages?: boolean;
  provider?: AiProviderType;
  apiKey?: string;
  model?: string;
}

export async function generateArticle(options: GenerateArticleOptions): Promise<GeneratedArticle> {
  const aiConfig = options.provider 
    ? { provider: options.provider, apiKey: options.apiKey || '', model: options.model || '' }
    : getAiCallHeadersAndBody();

  const res = await fetch('/api/articles/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...options,
      ...aiConfig,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate SEO article');
  }

  return await res.json();
}


export async function generateBlogImage(title: string, category: string, themeColor?: string): Promise<{ imageUrl: string; prompt: string }> {
  const res = await fetch('/api/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category, themeColor }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate image');
  }

  return await res.json();
}

export async function runSeoAudit(
  title: string,
  content: string,
  targetKeyword: string,
  metaDescription: string = ''
): Promise<SeoAuditResult> {
  const res = await fetch('/api/articles/seo-audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, targetKeyword, metaDescription }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to audit SEO content');
  }

  return await res.json();
}
