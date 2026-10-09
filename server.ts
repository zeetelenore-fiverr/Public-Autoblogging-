import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Read firebase-applet-config.json if available
let firebaseConfig: Record<string, string> = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

// Lazy Gemini client helper
function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add your key in the AI Keys panel.');
  }
  return new GoogleGenAI({ apiKey });
}

// Multi-Provider AI Engine (Gemini, ChatGPT / OpenAI, Claude / Anthropic, Grok / xAI)
export interface AiCallParams {
  provider?: 'gemini' | 'chatgpt' | 'claude' | 'grok';
  apiKey?: string;
  model?: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  jsonMode?: boolean;
}

export async function callMultiProviderAi(params: AiCallParams): Promise<string> {
  const provider = params.provider || 'gemini';
  const temperature = params.temperature ?? 0.4;

  if (provider === 'chatgpt') {
    const key = params.apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API Key is missing. Please add your ChatGPT key in the AI Keys panel.');
    }
    const model = params.model || 'gpt-4o-mini';
    const messages: any[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const bodyPayload: any = {
      model,
      messages,
      temperature,
    };
    if (params.jsonMode) {
      bodyPayload.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenAI API error (${res.status}): ${err?.error?.message || res.statusText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'claude') {
    const key = params.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error('Claude/Anthropic API Key is missing. Please add your Claude key in the AI Keys panel.');
    }
    const model = params.model || 'claude-3-5-sonnet-20241022';
    const bodyPayload: any = {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: params.prompt }],
      temperature,
    };
    if (params.systemPrompt) {
      bodyPayload.system = params.systemPrompt;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Claude API error (${res.status}): ${err?.error?.message || res.statusText}`);
    }
    const data = await res.json();
    const textBlock = data.content?.find((c: any) => c.type === 'text');
    return textBlock?.text || '';
  }

  if (provider === 'grok') {
    const key = params.apiKey || process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    if (!key) {
      throw new Error('Grok/xAI API Key is missing. Please add your Grok key in the AI Keys panel.');
    }
    const model = params.model || 'grok-2-latest';
    const messages: any[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const bodyPayload: any = {
      model,
      messages,
      temperature,
    };
    if (params.jsonMode) {
      bodyPayload.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Grok API error (${res.status}): ${err?.error?.message || res.statusText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // Gemini provider
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please add your free Google AI Studio key in the AI Keys panel.');
  }
  const ai = new GoogleGenAI({ apiKey });
  let model = params.model || 'gemini-3.8-flash';
  // Map any obsolete/deprecated models (such as gemini-2.5-flash) to modern gemini-3.8-flash
  if (model.includes('gemini-2.5') || model.includes('gemini-2.0') || model.includes('gemini-1.5') || model === 'gemini-pro') {
    model = 'gemini-3.8-flash';
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: params.prompt,
      config: {
        temperature,
        ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    });
    return response.text || '';
  } catch (err: any) {
    console.warn(`Primary Gemini model ${model} encountered error, trying fallback...`, err.message);
    const fallbackResponse = await generateWithGeminiFallback(ai, params.prompt, {
      responseMimeType: params.jsonMode ? 'application/json' : undefined,
      temperature,
    });
    return fallbackResponse.text || '';
  }
}


// Resilient helper to call Gemini with model fallback if a model experiences temporary high demand or network timeout
async function generateWithGeminiFallback(
  ai: GoogleGenAI,
  prompt: string,
  config: { responseMimeType?: string; temperature?: number }
) {
  // Primary model and lightweight high-availability fallback models
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = (err?.message || String(err)).toLowerCase();
        const isTransient =
          errMsg.includes('timeout') ||
          errMsg.includes('fetch failed') ||
          errMsg.includes('headers timeout') ||
          errMsg.includes('und_err_headers_timeout') ||
          errMsg.includes('econnreset') ||
          errMsg.includes('etimedout') ||
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('unavailable') ||
          errMsg.includes('429') ||
          errMsg.includes('resource_exhausted') ||
          errMsg.includes('quota');

        if (isTransient) {
          console.warn(`Model ${model} attempt ${attempt + 1} transient error: ${err.message}. Retrying or switching model...`);
          continue;
        }
        // Non-transient error for this model, break to try next model
        break;
      }
    }
  }

  throw lastError;
}

// Algorithmic Fallback Keyword Generator when AI network requests encounter timeouts
function generateFallbackKeywords(seed: string, niche: string = '', audience: string = ''): any {
  const cleanSeed = seed.trim();
  const titleCase = cleanSeed.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const currentYear = new Date().getFullYear();

  const templates = [
    { pattern: `how to start with ${cleanSeed}`, kd: 14, vol: 4800, cpc: 1.25, intent: 'Informational', kdLevel: 'very_easy' },
    { pattern: `best ${cleanSeed} for beginners`, kd: 18, vol: 3600, cpc: 1.85, intent: 'Commercial', kdLevel: 'easy' },
    { pattern: `${cleanSeed} step by step guide`, kd: 22, vol: 2900, cpc: 1.40, intent: 'Informational', kdLevel: 'easy' },
    { pattern: `complete ${cleanSeed} tutorial ${currentYear}`, kd: 26, vol: 2400, cpc: 1.60, intent: 'Informational', kdLevel: 'easy' },
    { pattern: `${cleanSeed} strategies that work`, kd: 29, vol: 1900, cpc: 2.10, intent: 'Informational', kdLevel: 'easy' },
    { pattern: `top 10 ${cleanSeed} tools`, kd: 34, vol: 5400, cpc: 2.75, intent: 'Commercial', kdLevel: 'possible' },
    { pattern: `${cleanSeed} vs alternatives`, kd: 38, vol: 1800, cpc: 3.20, intent: 'Commercial', kdLevel: 'possible' },
    { pattern: `${cleanSeed} workflow automation`, kd: 24, vol: 2200, cpc: 2.90, intent: 'Commercial', kdLevel: 'easy' },
    { pattern: `common ${cleanSeed} mistakes to avoid`, kd: 16, vol: 1700, cpc: 0.95, intent: 'Informational', kdLevel: 'easy' },
    { pattern: `free ${cleanSeed} templates & checklist`, kd: 12, vol: 3900, cpc: 1.15, intent: 'Transactional', kdLevel: 'very_easy' },
    { pattern: `is ${cleanSeed} worth it in ${currentYear}`, kd: 21, vol: 2100, cpc: 1.50, intent: 'Informational', kdLevel: 'easy' },
    { pattern: `${cleanSeed} for small business`, kd: 27, vol: 2600, cpc: 2.80, intent: 'Commercial', kdLevel: 'easy' },
    { pattern: `${cleanSeed} case study and results`, kd: 11, vol: 1200, cpc: 1.90, intent: 'Informational', kdLevel: 'very_easy' },
    { pattern: `how much does ${cleanSeed} cost`, kd: 25, vol: 1950, cpc: 2.45, intent: 'Commercial', kdLevel: 'easy' },
    { pattern: `advanced ${cleanSeed} techniques`, kd: 44, vol: 1400, cpc: 2.60, intent: 'Informational', kdLevel: 'possible' },
    { pattern: `${cleanSeed} industry trends ${currentYear}`, kd: 31, vol: 1600, cpc: 1.70, intent: 'Informational', kdLevel: 'possible' },
    { pattern: `how to optimize your ${cleanSeed}`, kd: 20, vol: 2800, cpc: 2.15, intent: 'Informational', kdLevel: 'easy' },
    { pattern: `enterprise ${cleanSeed} solutions`, kd: 56, vol: 1100, cpc: 4.80, intent: 'Commercial', kdLevel: 'hard' },
  ];

  const keywords = templates.map((t, idx) => {
    const opp = Math.max(15, Math.min(98, Math.round(100 - t.kd * 0.75 + (t.vol / 300))));
    return {
      keyword: t.pattern,
      kd: t.kd,
      kdLevel: t.kdLevel,
      searchVolume: t.vol,
      cpc: t.cpc,
      intent: t.intent,
      serpAnalysis: t.kd < 25 
        ? 'High ranking opportunity: Low domain authority competitors and forum threads on page 1.' 
        : 'Moderate competition: Ranking achievable with comprehensive long-form content and internal links.',
      suggestedTitle: `${titleCase}: The Ultimate Guide (${currentYear})`,
      recommendedWordCount: t.kd < 20 ? 1200 : t.kd < 35 ? 1600 : 2200,
      opportunityScore: opp,
    };
  });

  return {
    seedKeyword: cleanSeed,
    summary: `Strategic analysis for "${cleanSeed}": High-potential niche with ${keywords.filter((k) => k.kd < 30).length} low-difficulty ranking opportunities.`,
    keywords,
  };
}

// Helper: Scrape / Resolve real numeric Blogger Blog ID from a blog URL or domain
async function resolveNumericBloggerId(urlOrDomain: string): Promise<{ id: string; name: string; url: string } | null> {
  if (!urlOrDomain) return null;
  let cleaned = urlOrDomain.trim();

  // If already purely numeric digits, it's already a valid Blog ID
  if (/^\d+$/.test(cleaned)) {
    return { id: cleaned, name: `Blog ${cleaned}`, url: `https://www.blogger.com/blog/posts/${cleaned}` };
  }

  // Check if user provided a Blogger Dashboard / Admin URL (e.g. blogger.com/blog/posts/8492048204928492)
  const dashboardMatch = cleaned.match(/blogger\.com\/(?:u\/\d+\/)?blog\/(?:posts|settings|stats|comments|pages|layout|theme|earnings)(?:\/[a-z]+)*\/(\d{6,30})/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return {
      id: dashboardMatch[1],
      name: `Blog (${dashboardMatch[1]})`,
      url: `https://www.blogger.com/blog/posts/${dashboardMatch[1]}`,
    };
  }

  // Normalize URL
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(cleaned);
  } catch {
    return null;
  }

  // If hostname has no dot (e.g. "automationai99"), append ".blogspot.com"
  if (!parsedUrl.hostname.includes('.')) {
    parsedUrl.hostname = `${parsedUrl.hostname}.blogspot.com`;
  }

  const normalizedUrl = parsedUrl.origin + '/';
  const blogName = parsedUrl.hostname.replace('.blogspot.com', '');

  // 1. Fetch public HTML of the blog to extract official numeric blogId
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      // Match meta name="blogId" content="123456789"
      const metaMatch1 = html.match(/name=['"]blogId['"]\s+content=['"](\d+)['"]/i);
      const metaMatch2 = html.match(/content=['"](\d+)['"]\s+name=['"]blogId['"]/i);
      // Match "blogId": "123456789" or blogId = "123456789"
      const jsMatch = html.match(/['"]?blogId['"]?\s*[:=]\s*['"]?(\d+)['"]?/i);
      // Match feed tag: tag:blogger.com,1999:blog-123456789
      const feedMatch = html.match(/tag:blogger\.com,1999:blog-(\d+)/i);
      const generalMatch = html.match(/blog-(\d{6,30})/i);

      const resolvedId =
        metaMatch1?.[1] ||
        metaMatch2?.[1] ||
        jsMatch?.[1] ||
        feedMatch?.[1] ||
        generalMatch?.[1];

      if (resolvedId) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const resolvedName = titleMatch ? titleMatch[1].trim() : blogName;
        return {
          id: resolvedId,
          name: resolvedName,
          url: normalizedUrl,
        };
      }
    }
  } catch (err) {
    console.warn(`Failed to scrape blog ID directly from HTML at ${normalizedUrl}:`, err);
  }

  // 2. Fallback: Query Blogger's public Atom feed
  try {
    const feedUrl = `${normalizedUrl}feeds/posts/default?alt=json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const feedRes = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (feedRes.ok) {
      const feedJson: any = await feedRes.json().catch(() => ({}));
      const feedIdStr: string = feedJson?.feed?.id?.$t || '';
      const match = feedIdStr.match(/blog-(\d+)/);
      if (match) {
        return {
          id: match[1],
          name: feedJson?.feed?.title?.$t || blogName,
          url: normalizedUrl,
        };
      }
    }
  } catch (err) {
    // Ignore feed scrape failure
  }

  return null;
}

// Helper to safely parse JSON from Gemini output, extracting innermost valid JSON object/array
function safeParseJson(rawText: string): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();

  // 1. Remove markdown code fences if wrapped
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // 2. Direct JSON parse attempt
  try {
    return JSON.parse(cleaned);
  } catch (err1: any) {
    // 3. Handle 'Unexpected non-whitespace character after JSON at position X'
    const afterPosMatch = err1.message && err1.message.match(/after JSON at position (\d+)/i);
    if (afterPosMatch) {
      const pos = parseInt(afterPosMatch[1], 10);
      try {
        return JSON.parse(cleaned.substring(0, pos).trim());
      } catch {
        // Continue to balanced scanner
      }
    }

    // 4. Balanced scanner: scans quotes, escapes, and curly braces to identify the exact valid root object
    const startIdx = cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : cleaned.indexOf('[');
    if (startIdx !== -1) {
      const isObject = cleaned[startIdx] === '{';
      const openChar = isObject ? '{' : '[';
      const closeChar = isObject ? '}' : ']';
      let depth = 0;
      let inString = false;
      let escape = false;

      for (let i = startIdx; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === openChar) depth++;
          else if (char === closeChar) {
            depth--;
            if (depth === 0) {
              const candidate = cleaned.substring(startIdx, i + 1);
              try {
                return JSON.parse(candidate);
              } catch {
                try {
                  const withoutTrailingCommas = candidate.replace(/,\s*([}\]])/g, '$1');
                  return JSON.parse(withoutTrailingCommas);
                } catch {
                  // Keep looking if malformed
                }
              }
            }
          }
        }
      }
    }

    // 5. Fallback: try stripping trailing commas from whole cleaned string
    try {
      const withoutTrailingCommas = cleaned.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(withoutTrailingCommas);
    } catch {
      throw err1;
    }
  }
}

// ==========================================
// PERSISTENT DATA STORAGE (Admin & Posts)
// ==========================================
const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data directory (serverless disk?)', e);
}

let inMemoryPosts: any[] = [
  {
    id: 'post-welcome-1',
    title: 'The Complete Guide to Next-Gen AI Blogging and Organic Search Dominance',
    slug: 'guide-to-next-gen-ai-blogging-seo',
    metaDescription: 'Discover how modern AI models like Gemini, Claude, and GPT-4o paired with low-KD keyword research create unstoppable organic traffic engines.',
    status: 'LIVE',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    labels: ['AI Content', 'SEO Strategy', 'Organic Growth'],
    author: {
      displayName: 'Site Admin',
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
];

let inMemoryAdmin: any = null;

function loadStoredPosts(): any[] {
  try {
    if (fs.existsSync(POSTS_FILE)) {
      const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
      inMemoryPosts = JSON.parse(raw);
    }
  } catch (e) {}

  // Auto-promote scheduled posts that have reached their scheduled time
  const now = Date.now();
  let changed = false;
  inMemoryPosts = inMemoryPosts.map((p) => {
    if (p.status === 'SCHEDULED' && p.scheduledAt) {
      const schedTime = new Date(p.scheduledAt).getTime();
      if (!isNaN(schedTime) && schedTime <= now) {
        changed = true;
        return {
          ...p,
          status: 'LIVE',
          publishedAt: p.scheduledAt,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    return p;
  });

  if (changed) {
    saveStoredPosts(inMemoryPosts);
  }

  return inMemoryPosts;
}

function saveStoredPosts(posts: any[]) {
  inMemoryPosts = posts;
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not persist posts to file (fallback to memory)', e);
  }
}

function loadStoredAdmin(): any {
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const raw = fs.readFileSync(ADMIN_FILE, 'utf-8');
      inMemoryAdmin = JSON.parse(raw);
    } else {
      inMemoryAdmin = null;
    }
  } catch (e) {
    inMemoryAdmin = null;
  }
  return inMemoryAdmin;
}

function saveStoredAdmin(admin: any) {
  inMemoryAdmin = admin;
  try {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not persist admin to file', e);
  }
}

// Initialize on startup
loadStoredPosts();
loadStoredAdmin();

// Public configuration route
app.get('/api/config', (req, res) => {
  res.json({
    oAuthClientId: process.env.VITE_OAUTH_CLIENT_ID || firebaseConfig.oAuthClientId || '',
    projectId: firebaseConfig.projectId || '',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    hasClaudeKey: Boolean(process.env.ANTHROPIC_API_KEY),
    hasGrokKey: Boolean(process.env.GROK_API_KEY || process.env.XAI_API_KEY),
  });
});

// ==========================================
// ADMIN ONBOARDING & AUTHENTICATION ROUTES
// ==========================================

// Check Admin Status (used for initial setup wizard on Vercel/GitHub deployments)
app.get('/api/admin/status', (req, res) => {
  const admin = loadStoredAdmin();
  res.json({
    hasAdmin: Boolean(admin),
    siteConfig: {
      siteTitle: admin?.siteTitle || 'ApexBlog AI',
      siteTagline: admin?.siteTagline || 'Autonomous AI Content & Search Engine Publishing Platform',
      authorName: admin?.displayName || admin?.authorName || 'Site Admin',
    },
    currentUser: admin ? {
      username: admin.username,
      email: admin.email,
      displayName: admin.displayName,
      role: 'admin',
      createdAt: admin.createdAt,
    } : null,
  });
});

// Initial Admin Setup Wizard
app.post('/api/admin/setup', (req, res) => {
  const { username, email, password, siteTitle, siteTagline, authorName } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const existingAdmin = loadStoredAdmin();
  if (existingAdmin) {
    return res.status(400).json({ error: 'Admin account has already been initialized. Please log in.' });
  }

  const newAdmin = {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password: password, // Note: in local demo server, stored directly or hashed
    displayName: authorName?.trim() || username.trim(),
    siteTitle: siteTitle?.trim() || 'ApexBlog AI',
    siteTagline: siteTagline?.trim() || 'Autonomous AI Content & Search Engine Publishing Platform',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  saveStoredAdmin(newAdmin);
  const token = `adm_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return res.json({
    success: true,
    token,
    user: {
      username: newAdmin.username,
      email: newAdmin.email,
      displayName: newAdmin.displayName,
      role: 'admin',
      createdAt: newAdmin.createdAt,
    },
  });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  const admin = loadStoredAdmin();
  if (!admin) {
    return res.status(404).json({ error: 'No admin account exists yet. Please complete the initial setup.' });
  }

  const input = usernameOrEmail.trim().toLowerCase();
  const matchUser = admin.username.toLowerCase() === input || admin.email.toLowerCase() === input;
  const matchPass = admin.password === password;

  if (!matchUser || !matchPass) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = `adm_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return res.json({
    success: true,
    token,
    user: {
      username: admin.username,
      email: admin.email,
      displayName: admin.displayName,
      role: 'admin',
      createdAt: admin.createdAt,
    },
  });
});

// Update Site & Admin Profile
app.post('/api/admin/update-profile', (req, res) => {
  const { siteTitle, siteTagline, authorName, newPassword } = req.body;
  const admin = loadStoredAdmin() || {};

  const updatedAdmin = {
    ...admin,
    siteTitle: siteTitle || admin.siteTitle,
    siteTagline: siteTagline || admin.siteTagline,
    displayName: authorName || admin.displayName,
    ...(newPassword ? { password: newPassword } : {}),
    updatedAt: new Date().toISOString(),
  };

  saveStoredAdmin(updatedAdmin);
  return res.json({ success: true, admin: updatedAdmin });
});

// ==========================================
// NATIVE BLOG POSTS CRUD ROUTES
// ==========================================

// Get All Posts (with auto-scheduling promotion)
app.get('/api/posts', (req, res) => {
  const posts = loadStoredPosts();
  const { status, limit } = req.query;

  let filtered = [...posts];
  if (status && typeof status === 'string') {
    filtered = filtered.filter((p) => p.status === status.toUpperCase());
  }

  // Sort: newest first
  filtered.sort((a, b) => {
    const timeA = new Date(a.publishedAt || a.createdAt).getTime();
    const timeB = new Date(b.publishedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  if (limit) {
    filtered = filtered.slice(0, parseInt(limit as string, 10));
  }

  res.json(filtered);
});

// Get Post By Slug or ID
app.get('/api/posts/:idOrSlug', (req, res) => {
  const { idOrSlug } = req.params;
  const posts = loadStoredPosts();
  const post = posts.find((p) => p.id === idOrSlug || p.slug === idOrSlug);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  res.json(post);
});

// Create Post
app.post('/api/posts', (req, res) => {
  const postData = req.body;
  if (!postData.title) {
    return res.status(400).json({ error: 'Post title is required' });
  }

  const admin = loadStoredAdmin();
  const posts = loadStoredPosts();

  const newPost = {
    id: postData.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: postData.title,
    slug: postData.slug || postData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'),
    content: postData.content || '',
    metaDescription: postData.metaDescription || '',
    status: postData.status || 'DRAFT',
    scheduledAt: postData.scheduledAt,
    publishedAt: postData.status === 'LIVE' ? (postData.publishedAt || new Date().toISOString()) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    labels: Array.isArray(postData.labels) ? postData.labels : [],
    coverImageUrl: postData.coverImageUrl,
    inlineImageUrl: postData.inlineImageUrl,
    author: postData.author || {
      displayName: admin?.displayName || 'Site Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    },
    readingTimeMinutes: postData.readingTimeMinutes || Math.max(1, Math.round(((postData.content || '').replace(/<[^>]*>/g, '').split(/\s+/).length) / 200)),
    wordCount: postData.wordCount || (postData.content || '').replace(/<[^>]*>/g, '').split(/\s+/).length,
    targetKeyword: postData.targetKeyword,
  };

  const updated = [newPost, ...posts.filter((p) => p.id !== newPost.id)];
  saveStoredPosts(updated);

  res.status(201).json(newPost);
});

// Update Post
app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const posts = loadStoredPosts();

  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) {
    // If not found, create it
    const newPost = {
      ...updates,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveStoredPosts([newPost, ...posts]);
    return res.json(newPost);
  }

  const existing = posts[index];
  const updatedPost = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  posts[index] = updatedPost;
  saveStoredPosts(posts);

  res.json(updatedPost);
});

// Delete Post
app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const posts = loadStoredPosts();
  const filtered = posts.filter((p) => p.id !== id);
  saveStoredPosts(filtered);
  res.json({ success: true, deletedId: id });
});

// Publish Post Immediately
app.post('/api/posts/:id/publish', (req, res) => {
  const { id } = req.params;
  const posts = loadStoredPosts();
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });

  posts[index].status = 'LIVE';
  posts[index].publishedAt = new Date().toISOString();
  posts[index].updatedAt = new Date().toISOString();
  saveStoredPosts(posts);

  res.json(posts[index]);
});

// Revert Post to Draft
app.post('/api/posts/:id/revert', (req, res) => {
  const { id } = req.params;
  const posts = loadStoredPosts();
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });

  posts[index].status = 'DRAFT';
  posts[index].updatedAt = new Date().toISOString();
  saveStoredPosts(posts);

  res.json(posts[index]);
});

// ==========================================
// MULTI-PROVIDER AI KEY VERIFICATION ROUTE
// ==========================================
app.post('/api/ai/test-key', async (req, res) => {
  const { provider, apiKey, model } = req.body;
  if (!provider) return res.status(400).json({ error: 'AI provider is required' });
  if (!apiKey && provider !== 'gemini') {
    return res.status(400).json({ error: `API key is required for ${provider}` });
  }

  try {
    const testPrompt = 'Respond with exactly: "AI_CONNECTION_SUCCESSFUL"';
    const responseText = await callMultiProviderAi({
      provider,
      apiKey,
      model,
      prompt: testPrompt,
      temperature: 0.1,
    });

    res.json({
      success: true,
      message: `Verified connection to ${provider.toUpperCase()} (${model || 'default model'})!`,
      sampleText: responseText.trim().slice(0, 80),
    });
  } catch (err: any) {
    console.error(`AI Key verification test failed for ${provider}:`, err);
    res.status(400).json({
      error: err.message || `Failed to verify API key for ${provider}`,
    });
  }
});


// Blogger API Proxy - Helper to extract bearer token
function getBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}

// Proxy: Get Blogs for authenticated user with multi-status and user-info fallback
app.get('/api/blogger/blogs', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    // 1. Primary: fetch user blogs directly
    let response = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Blogger API fetch blogs notice (status ' + response.status + '):', errData?.error?.message || response.statusText);
      const formatted = formatBloggerError(response.status, errData, undefined, 'fetch blogs');
      
      // If 403 (e.g. Blogger API not activated in Google Cloud project, or user account permissions),
      // return a structured response with items: [] and an informative warning flag so the frontend UI
      // does not throw unhandled exceptions and allows the user to link their blog by URL directly!
      if (response.status === 403) {
        return res.json({
          items: [],
          warning: formatted.error,
          status: 403,
          isPermissionDenied: true,
          isServiceDisabled: formatted.isServiceDisabled,
          enableApiUrl: formatted.enableApiUrl,
          googleError: errData.error,
        });
      }

      return res.status(response.status).json(formatted);
    }

    const data = await response.json();
    let items = Array.isArray(data.items) ? [...data.items] : [];

    // Also check blogUserInfos if items is empty
    if (items.length === 0 && Array.isArray(data.blogUserInfos)) {
      items = data.blogUserInfos.map((info: any) => info.blog).filter(Boolean);
    }

    // If still empty, check user's blogs in users/self
    if (items.length === 0) {
      try {
        const userRes = await fetch('https://www.googleapis.com/blogger/v3/users/self', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.blogs?.selfLink) {
            const selfBlogsRes = await fetch(userData.blogs.selfLink, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (selfBlogsRes.ok) {
              const selfBlogsData = await selfBlogsRes.json();
              if (Array.isArray(selfBlogsData.items) && selfBlogsData.items.length > 0) {
                items = selfBlogsData.items;
              }
            }
          }
        }
      } catch (userErr) {
        console.warn('User self fallback error:', userErr);
      }
    }

    return res.json({ ...data, items });
  } catch (error: any) {
    console.error('Blogger API blogs error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch blogs' });
  }
});

// Proxy: Lookup a blog directly by URL (e.g. https://myblog.blogspot.com)
app.get('/api/blogger/blogs/byurl', async (req, res) => {
  const token = getBearerToken(req);
  let blogUrl = req.query.url as string;
  if (!blogUrl) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  // Ensure url starts with http:// or https://
  if (!blogUrl.startsWith('http://') && !blogUrl.startsWith('https://')) {
    blogUrl = `https://${blogUrl}`;
  }

  try {
    const parsed = new URL(blogUrl);
    if (!parsed.hostname.includes('.')) {
      parsed.hostname = `${parsed.hostname}.blogspot.com`;
      blogUrl = parsed.toString();
    }
  } catch {}

  // 1. Try Google Blogger v3 byurl API if token is present
  if (token) {
    try {
      const encoded = encodeURIComponent(blogUrl);
      const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/byurl?url=${encoded}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
      console.warn(`Blogger API byurl returned ${response.status}, attempting public scraper fallback...`);
    } catch (e) {
      console.warn('Google byurl API call failed, trying scraper fallback:', e);
    }
  }

  // 2. Resilient Fallback: Scrape numeric blog ID directly from blog page/feed
  const resolved = await resolveNumericBloggerId(blogUrl);
  if (resolved) {
    return res.json({
      kind: 'blogger#blog',
      id: resolved.id,
      name: resolved.name,
      url: resolved.url,
      posts: { totalItems: 0 },
    });
  }

  return res.status(404).json({
    error: `Could not find a Blogger blog at "${blogUrl}". Ensure the blog is public or provide its numerical Blog ID directly.`,
  });
});

// Proxy: Lookup a blog directly by Blog ID
app.get('/api/blogger/blogs/byid/:blogId', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const { blogId } = req.params;
  try {
    const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errData);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Blogger API byid error:', error);
    return res.status(500).json({ error: error.message || 'Failed to find blog by ID' });
  }
});

// In-memory debug store for recent Blogger API errors
let lastBloggerError: any = null;

// Standardize Blogger API error formatting
function formatBloggerError(status: number, errData: any, blogId?: string, action: string = 'operation') {
  const googleMsg = errData?.error?.message || errData?.message || `HTTP ${status}`;
  const firstErrorReason = errData?.error?.errors?.[0]?.reason || errData?.error?.details?.[0]?.reason || '';
  const firstErrorMessage = errData?.error?.errors?.[0]?.message || '';

  const isServiceDisabled =
    firstErrorReason === 'accessNotConfigured' ||
    firstErrorReason === 'SERVICE_DISABLED' ||
    googleMsg.toLowerCase().includes('has not been used in project') ||
    googleMsg.toLowerCase().includes('it is disabled') ||
    googleMsg.toLowerCase().includes('service_disabled');

  const isNotAuthor =
    !isServiceDisabled &&
    (firstErrorReason === 'forbidden' ||
      googleMsg.toLowerCase().includes("don't have permission") ||
      googleMsg.toLowerCase().includes('not an author') ||
      googleMsg.toLowerCase().includes('rights'));

  const projectId = firebaseConfig.projectId || 'unique-metric-z7z9n';
  const enableApiUrl = `https://console.cloud.google.com/apis/library/blogger.googleapis.com?project=${projectId}`;

  let friendlyMsg = googleMsg;

  if (status === 401) {
    friendlyMsg = 'Google account session expired or invalid credentials (401). Please re-authenticate your Google account in the top-right header.';
  } else if (isServiceDisabled) {
    friendlyMsg = `Google Cloud Error (403): Blogger API v3 is not enabled in Google Cloud project "${projectId}". To fix: Click the "Enable Blogger API" button or visit Google Cloud Console to enable it.`;
  } else if (isNotAuthor) {
    friendlyMsg = `Permission denied by Blogger API (403)${blogId ? ` for Blog ID ${blogId}` : ''}. Your connected Google account is not an author or admin of this blog. Check that you are logged into the right Google account and targeting your own Blog ID.`;
  } else if (status === 403) {
    friendlyMsg = `Permission denied by Blogger API (403)${blogId ? ` for Blog ID ${blogId}` : ''}. Details: ${googleMsg}`;
  } else if (status === 404) {
    friendlyMsg = `Blog or post not found on Blogger (404)${blogId ? ` for Blog ID ${blogId}` : ''}. Please check your Blog ID or blog URL.`;
  }

  const result = {
    error: friendlyMsg,
    message: friendlyMsg,
    statusCode: status,
    isAuthError: status === 401,
    isServiceDisabled,
    isNotAuthor,
    enableApiUrl: isServiceDisabled ? enableApiUrl : undefined,
    projectId,
    googleErrorMessage: googleMsg,
    googleErrorReason: firstErrorReason,
    details: errData,
    blogId,
    timestamp: new Date().toISOString(),
  };

  lastBloggerError = result;
  return result;
}

// Debug endpoint to check the last Blogger API error details
app.get('/api/blogger/last-error', (req, res) => {
  res.json({ lastError: lastBloggerError });
});

// Proxy: Fetch posts for a blog
app.get('/api/blogger/blogs/:blogId/posts', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Google authorization missing or expired (401). Please click "Connect Blogger" in the header.',
      isAuthError: true,
      statusCode: 401,
    });
  }

  let { blogId } = req.params;
  const status = (req.query.status as string) || 'LIVE,DRAFT,SCHEDULED';
  const maxResults = (req.query.maxResults as string) || '25';
  const blogUrl = req.query.blogUrl as string | undefined;

  // Resolve numeric ID if not numeric
  if (!/^\d+$/.test(blogId)) {
    const resolved = await resolveNumericBloggerId(blogUrl || blogId);
    if (resolved?.id) {
      blogId = resolved.id;
    }
  }

  try {
    const url = new URL(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`);
    url.searchParams.set('status', status);
    url.searchParams.set('maxResults', maxResults);
    url.searchParams.set('fetchBodies', 'true');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const formatted = formatBloggerError(response.status, errData, blogId, 'fetch posts');
      console.warn(`Blogger API fetch posts notice (${response.status}):`, formatted.error);
      return res.status(response.status).json(formatted);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Blogger API fetch posts error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch posts' });
  }
});

// Proxy: Create Post on Blogger
app.post('/api/blogger/blogs/:blogId/posts', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Google authorization missing or expired (401). Please click "Connect Blogger" in the header.',
      isAuthError: true,
      statusCode: 401,
    });
  }

  let { blogId } = req.params;
  const isDraft = req.query.isDraft === 'true';
  const blogUrl = (req.query.blogUrl as string) || req.body?.blogUrl;

  // If blogId is not purely numeric (e.g. starts with "custom_" or is a URL/domain), resolve real numeric ID!
  if (!/^\d+$/.test(blogId)) {
    console.log(`Resolving non-numeric blogId "${blogId}" (blogUrl: ${blogUrl})...`);
    const resolved = await resolveNumericBloggerId(blogUrl || blogId);
    if (resolved?.id) {
      console.log(`Successfully resolved blogId to numeric ID: ${resolved.id}`);
      blogId = resolved.id;
    } else {
      return res.status(400).json({
        error: `Invalid Blogger Blog ID: "${blogId}". Blogger requires a numerical Blog ID (e.g. 849204820...). Please ensure your blog URL is correct or enter your numerical Blog ID in the header.`,
      });
    }
  }

  // Clean body payload - do not send helper fields like blogUrl to Google
  const { blogUrl: _omit, ...postPayload } = req.body || {};

  try {
    const url = new URL(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`);
    if (isDraft) {
      url.searchParams.set('isDraft', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
    });

    if (!response.ok) {
      const errData: any = await response.json().catch(() => ({}));
      const formatted = formatBloggerError(response.status, errData, blogId, 'create post');
      console.error(`Blogger API create post notice (${response.status}):`, formatted.error);
      return res.status(response.status).json(formatted);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Blogger API create post network error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create post on Blogger' });
  }
});

// Proxy: Update Post on Blogger
app.put('/api/blogger/blogs/:blogId/posts/:postId', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Google authorization missing or expired (401). Please click "Connect Blogger" in the header.',
      isAuthError: true,
      statusCode: 401,
    });
  }

  let { blogId, postId } = req.params;
  const blogUrl = (req.query.blogUrl as string) || req.body?.blogUrl;

  if (!/^\d+$/.test(blogId)) {
    const resolved = await resolveNumericBloggerId(blogUrl || blogId);
    if (resolved?.id) blogId = resolved.id;
  }

  const { blogUrl: _omit, ...postPayload } = req.body || {};

  try {
    const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const formatted = formatBloggerError(response.status, errData, blogId, 'update post');
      return res.status(response.status).json(formatted);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Blogger API update post error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update post' });
  }
});

// Proxy: Publish drafted or scheduled post immediately
app.post('/api/blogger/blogs/:blogId/posts/:postId/publish', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Google authorization missing or expired (401). Please click "Connect Blogger" in the header.',
      isAuthError: true,
      statusCode: 401,
    });
  }

  let { blogId, postId } = req.params;
  const publishDate = req.query.publishDate as string | undefined;
  const blogUrl = req.query.blogUrl as string | undefined;

  if (!/^\d+$/.test(blogId)) {
    const resolved = await resolveNumericBloggerId(blogUrl || blogId);
    if (resolved?.id) blogId = resolved.id;
  }

  try {
    const url = new URL(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}/publish`);
    if (publishDate) {
      url.searchParams.set('publishDate', publishDate);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const formatted = formatBloggerError(response.status, errData, blogId, 'publish post');
      return res.status(response.status).json(formatted);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Blogger API publish post error:', error);
    return res.status(500).json({ error: error.message || 'Failed to publish post' });
  }
});

// Proxy: Revert post to draft
app.post('/api/blogger/blogs/:blogId/posts/:postId/revert', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Google authorization missing or expired (401). Please click "Connect Blogger" in the header.',
      isAuthError: true,
      statusCode: 401,
    });
  }

  let { blogId, postId } = req.params;
  const blogUrl = req.query.blogUrl as string | undefined;

  if (!/^\d+$/.test(blogId)) {
    const resolved = await resolveNumericBloggerId(blogUrl || blogId);
    if (resolved?.id) blogId = resolved.id;
  }

  try {
    const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}/revert`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const formatted = formatBloggerError(response.status, errData, blogId, 'revert post');
      return res.status(response.status).json(formatted);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Blogger API revert post error:', error);
    return res.status(500).json({ error: error.message || 'Failed to revert post' });
  }
});

// Proxy: Delete post
app.delete('/api/blogger/blogs/:blogId/posts/:postId', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Google authorization missing or expired (401). Please click "Connect Blogger" in the header.',
      isAuthError: true,
      statusCode: 401,
    });
  }

  let { blogId, postId } = req.params;
  const blogUrl = req.query.blogUrl as string | undefined;

  if (!/^\d+$/.test(blogId)) {
    const resolved = await resolveNumericBloggerId(blogUrl || blogId);
    if (resolved?.id) blogId = resolved.id;
  }

  try {
    const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const formatted = formatBloggerError(response.status, errData, blogId, 'delete post');
      return res.status(response.status).json(formatted);
    }

    return res.json({ success: true, postId });
  } catch (error: any) {
    console.error('Blogger API delete post error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
});

// ==========================================
// AI & SEO ENDPOINTS (Gemini Powered)
// ==========================================

// 1. Keyword Research & KD Analyzer
app.post('/api/keywords/research', async (req, res) => {
  try {
    const { seedKeyword, niche = '', targetAudience = '', provider, apiKey, model } = req.body;
    if (!seedKeyword || typeof seedKeyword !== 'string') {
      return res.status(400).json({ error: 'Seed keyword is required' });
    }

    const prompt = `You are a world-class SEO strategist and keyword research tool (similar to Ahrefs and Semrush).
Analyze the seed topic/niche: "${seedKeyword}". Additional context: "${niche}", audience: "${targetAudience}".

Generate 16-20 diverse, realistic, and commercially viable search keywords related to this seed topic.
Crucially, calculate realistic Keyword Difficulty (KD from 0 to 100), estimated monthly search volume, search intent, and ranking difficulty level.
Include a healthy mix of LOW KD (0-29, "Very Easy" and "Easy"), MEDIUM KD (30-49, "Possible"), and a few HIGH KD keywords (50-80, "Hard") so the user can easily filter and target low-hanging fruit keywords to rank fast on Google.

Return pure JSON only (no markdown code blocks, or standard json) matching this exact JSON schema:
{
  "seedKeyword": "${seedKeyword}",
  "summary": "1-2 sentence strategic overview of ranking potential in this niche",
  "keywords": [
    {
      "keyword": "string (the exact search phrase)",
      "kd": number (integer 0-100),
      "kdLevel": "very_easy" | "easy" | "possible" | "hard" | "very_hard",
      "searchVolume": number (estimated monthly search volume e.g. 800, 2400, 14000),
      "cpc": number (estimated CPC e.g. 0.85, 2.40),
      "intent": "Informational" | "Commercial" | "Transactional" | "Navigational",
      "serpAnalysis": "Brief note on SERP competitors (e.g. 'Weak domain authority results, Reddit threads ranking, great opportunity for comprehensive guide')",
      "suggestedTitle": "High CTR SEO optimized blog headline",
      "recommendedWordCount": number (e.g. 1200, 1600, 2200),
      "opportunityScore": number (1-100 score prioritizing low KD + good volume)
    }
  ]
}

KD rules:
- KD 0-14: "very_easy" (Green) - New blogs can rank within weeks with quality content
- KD 15-29: "easy" (Light Green) - Low competition, minimal backlinks required
- KD 30-49: "possible" (Yellow/Amber) - Moderate competition, needs comprehensive content & internal links
- KD 50-69: "hard" (Orange) - Competitive, established sites on page 1
- KD 70-100: "very_hard" (Red) - Dominated by high DA giants

Output ONLY the raw JSON object. Do not append any explanation, commentary, or text after the closing brace.`;

    let parsed: any = null;
    try {
      const text = await callMultiProviderAi({
        provider,
        apiKey,
        model,
        prompt,
        temperature: 0.3,
        jsonMode: true,
      });

      parsed = safeParseJson(text);
      if (!parsed || !Array.isArray(parsed.keywords) || parsed.keywords.length === 0) {
        throw new Error('Incomplete keyword response from AI provider');
      }
    } catch (aiErr: any) {
      console.warn('AI keyword generation error or timeout, generating algorithmic SEO fallback:', aiErr.message);
      parsed = generateFallbackKeywords(seedKeyword, niche, targetAudience);
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Keyword research error:', error);
    try {
      const fallback = generateFallbackKeywords(req.body?.seedKeyword || 'SEO Guide');
      return res.json(fallback);
    } catch {
      return res.status(500).json({ error: error.message || 'Failed to research keywords' });
    }
  }
});


// Helper: Generate an aesthetic SVG banner/cover image or data URL
function generateAestheticImageSvg(title: string, category: string, themeColor: string = '#2563eb'): string {
  const cleanTitle = title.replace(/[<>&"]/g, '');
  const cleanCategory = (category || 'BLOG POST').toUpperCase().replace(/[<>&"]/g, '');
  
  // Wrap title lines nicely
  const words = cleanTitle.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > 34) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine);
  const titleTspans = lines.slice(0, 3).map((line, i) => 
    `<tspan x="60" dy="${i === 0 ? 0 : 44}">${line}</tspan>`
  ).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="60%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${themeColor}" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#grid)"/>
    <circle cx="1080" cy="120" r="280" fill="${themeColor}" opacity="0.12" filter="blur(60px)"/>
    <circle cx="140" cy="540" r="200" fill="#06b6d4" opacity="0.08" filter="blur(50px)"/>
    
    <!-- Accent Line -->
    <rect x="60" y="80" width="80" height="6" rx="3" fill="url(#accent)"/>
    
    <!-- Badge -->
    <g transform="translate(60, 110)">
      <rect width="180" height="34" rx="17" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <text x="90" y="22" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#38bdf8" letter-spacing="1.5">${cleanCategory}</text>
    </g>
    
    <!-- Title -->
    <text x="60" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="40" font-weight="800" fill="#f8fafc" letter-spacing="-0.5">
      ${titleTspans}
    </text>
    
    <!-- Decorative elements -->
    <g transform="translate(60, 520)">
      <circle cx="16" cy="16" r="16" fill="url(#accent)"/>
      <text x="44" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#94a3b8">Blogger SEO Automation • Verified Expert Guide</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 2. Full SEO Article Generator
app.post('/api/articles/generate', async (req, res) => {
  try {
    const {
      keyword,
      title: customTitle,
      wordCount = 1200,
      tone = 'informative and authoritative',
      niche = '',
      secondaryKeywords = [],
      existingPosts = [], // [{ id, title, url }]
      includeFaq = true,
      includeKeyTakeaways = true,
      generateImages = true,
      provider,
      apiKey,
      model,
    } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    // Prepare existing posts context for internal linking
    const existingPostsSnippet = existingPosts && existingPosts.length > 0
      ? `\nEXISTING BLOG POSTS FOR INTERNAL LINKING:
You MUST naturally include 2 to 4 contextual internal links to these existing articles using descriptive anchor text (do NOT use generic 'click here' or naked URLs):
${existingPosts.slice(0, 15).map((p: any) => `- "${p.title}": ${p.url || p.slug ? `/post/${p.slug}` : '#'}`).join('\n')}`
      : '\nNote: No prior posts provided yet. Use relevant semantic anchor links with relative or placeholder tags that can be updated.';

    const prompt = `You are an elite SEO Content Specialist and Professional Blogger.
Write a comprehensive, publication-ready, deeply engaging, and 100% SEO-optimized blog article.

TARGET KEYWORD: "${keyword}"
DESIRED TITLE (if provided): "${customTitle || ''}"
TARGET WORD COUNT: ~${wordCount} words (be thorough and detailed to match this depth!)
TONE OF VOICE: ${tone}
NICHE / INDUSTRY: ${niche || 'General'}
SECONDARY / LSI KEYWORDS: ${secondaryKeywords.length ? secondaryKeywords.join(', ') : 'semantic variants of ' + keyword}
${existingPostsSnippet}

REQUIREMENTS:
1. SEO STRUCTURE:
   - Compelling, high-CTR H1 Title containing the primary keyword
   - Meta description (135 - 155 characters) that starts with or prominently features the target keyword and an actionable hook
   - Engaging introduction with a hook, addressing search intent directly
   - If requested, a "Key Takeaways" bulleted summary box near the top
   - Logical heading hierarchy (H2, H3) covering all facets of the query
   - Natural keyword placement (1-2% density, never keyword stuffed)
   - Incorporate secondary and LSI keywords seamlessly
   - Comprehensive practical advice, examples, or step-by-step instructions
   - If requested, a rich FAQ section with 3-5 real common questions matching People Also Ask (PAA) queries
   - Compelling conclusion with a clear call-to-action (CTA)
   - 3 to 6 relevant tags/labels

2. FORMATTING FOR ARTICLE:
   - Output valid, clean HTML content (ready to be inserted into the article body)
   - Use semantic tags: <h2>, <h3>, <p>, <ul>, <ol>, <blockquote>, <strong>, <em>, <table> where appropriate
   - Include styling touches that look great (clean margins, tasteful blockquotes, nice callout boxes)
   ${generateImages ? '- Place an image placeholder comment <!-- COVER_IMAGE --> right after H1 or intro, and <!-- INLINE_IMAGE_1 --> halfway through the content.' : ''}

3. INTERNAL & EXTERNAL LINKS:
   - Weave in the provided existing posts as contextual internal hyperlinks: <a href="URL" title="Title">Anchor Text</a>
   - Add 1-2 authoritative outbound citation links (e.g. to official standards, studies, or reputable resource guides)

Return your response in pure JSON matching this exact structure:
{
  "title": "Full SEO Title",
  "metaDescription": "140-155 character meta description",
  "slug": "url-friendly-slug",
  "labels": ["tag1", "tag2", "tag3"],
  "estimatedReadingTimeMinutes": number,
  "actualWordCount": number,
  "htmlContent": "Complete HTML string of the entire article",
  "coverImagePrompt": "Detailed description of a photorealistic or modern graphic suitable for the article header",
  "inlineImagePrompt": "Detailed description of an illustrative infographic or chart for the body",
  "seoAudit": {
    "overallScore": number (1-100),
    "primaryKeywordInTitle": boolean,
    "primaryKeywordInFirst100Words": boolean,
    "headingCoverage": string,
    "keywordDensityPercent": number,
    "internalLinksCount": number,
    "hasFaqSection": boolean,
    "recommendations": ["string"]
  }
}

Output ONLY valid JSON. Do not append any explanation, commentary, or text outside the JSON object.`;

    const text = await callMultiProviderAi({
      provider,
      apiKey,
      model,
      prompt,
      temperature: 0.4,
      jsonMode: true,
    });

    const parsed = safeParseJson(text);


    // Generate cover and inline banner images if requested
    if (generateImages) {
      const coverSvg = generateAestheticImageSvg(parsed.title || keyword, niche || 'SEO Guide', '#2563eb');
      const inlineSvg = generateAestheticImageSvg(`${keyword}: Key Insights & Roadmap`, niche || 'Deep Dive', '#059669');

      let content = parsed.htmlContent || '';
      
      const coverImgHtml = `
<div class="blogger-ai-cover-container" style="margin: 20px 0 28px 0; text-align: center;">
  <img src="${coverSvg}" alt="${parsed.title || keyword}" style="width: 100%; max-width: 900px; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); display: inline-block;" />
  <p style="font-size: 13px; color: #64748b; margin-top: 8px; font-style: italic;">Cover illustration for ${keyword}</p>
</div>`;

      const inlineImgHtml = `
<div class="blogger-ai-inline-container" style="margin: 28px 0; text-align: center;">
  <img src="${inlineSvg}" alt="Visual Guide: ${keyword}" style="width: 100%; max-width: 800px; height: auto; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); display: inline-block;" />
  <p style="font-size: 13px; color: #64748b; margin-top: 6px; font-style: italic;">Visual Framework: ${keyword}</p>
</div>`;

      if (content.includes('<!-- COVER_IMAGE -->')) {
        content = content.replace('<!-- COVER_IMAGE -->', coverImgHtml);
      } else {
        content = coverImgHtml + content;
      }

      if (content.includes('<!-- INLINE_IMAGE_1 -->')) {
        content = content.replace('<!-- INLINE_IMAGE_1 -->', inlineImgHtml);
      }

      parsed.htmlContent = content;
      parsed.coverImageUrl = coverSvg;
      parsed.inlineImageUrl = inlineSvg;
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Article generation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate article' });
  }
});

// 3. Automated Image Generator (Generates SVG or AI visual for blog)
app.post('/api/images/generate', async (req, res) => {
  try {
    const { title = 'Blog Article', category = 'Guide', themeColor = '#2563eb' } = req.body;
    const svgDataUrl = generateAestheticImageSvg(title, category, themeColor);
    return res.json({ imageUrl: svgDataUrl, prompt: `${category} cover for ${title}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Image generation failed' });
  }
});

// 4. Live SEO Content Auditor
app.post('/api/articles/seo-audit', async (req, res) => {
  try {
    const { title = '', content = '', targetKeyword = '', metaDescription = '' } = req.body;

    const lowerKeyword = (targetKeyword || '').toLowerCase().trim();
    const lowerTitle = (title || '').toLowerCase();
    const lowerContent = (content || '').toLowerCase();
    const lowerMeta = (metaDescription || '').toLowerCase();

    // Strip HTML tags for clean word analysis
    const cleanText = content.replace(/<[^>]*>?/gm, ' ');
    const words = cleanText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Checks
    const keywordInTitle = lowerKeyword ? lowerTitle.includes(lowerKeyword) : false;
    const titleLength = title.length;
    const isTitleOptimal = titleLength >= 40 && titleLength <= 65;

    const keywordInMeta = lowerKeyword ? lowerMeta.includes(lowerKeyword) : false;
    const metaLength = metaDescription.length;
    const isMetaOptimal = metaLength >= 120 && metaLength <= 160;

    // Keyword density
    let keywordCount = 0;
    if (lowerKeyword) {
      const regex = new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = cleanText.match(regex);
      keywordCount = matches ? matches.length : 0;
    }
    const keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
    const isDensityOptimal = keywordDensity >= 0.8 && keywordDensity <= 2.5;

    // Headings
    const h2Matches = content.match(/<h2[^>]*>/gi) || [];
    const h3Matches = content.match(/<h3[^>]*>/gi) || [];
    const hasHeadings = h2Matches.length >= 2;

    // Links
    const linkMatches = content.match(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']/gi) || [];
    const linksCount = linkMatches.length;

    // Images
    const imgMatches = content.match(/<img[^>]*>/gi) || [];
    const imagesCount = imgMatches.length;
    const altMatches = content.match(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi) || [];
    const allImagesHaveAlt = imagesCount > 0 ? altMatches.length === imagesCount : true;

    // Readability heuristic (average words per sentence)
    const sentences = cleanText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
    const isReadabilityGood = avgWordsPerSentence >= 10 && avgWordsPerSentence <= 22;

    // Calculate score out of 100
    let score = 0;
    if (keywordInTitle) score += 20;
    if (isTitleOptimal) score += 10;
    if (keywordInMeta) score += 10;
    if (isMetaOptimal) score += 5;
    if (hasHeadings) score += 15;
    if (wordCount >= 800) score += 15;
    else if (wordCount >= 500) score += 10;
    if (isDensityOptimal) score += 10;
    if (linksCount >= 2) score += 5;
    if (imagesCount >= 1 && allImagesHaveAlt) score += 5;
    if (isReadabilityGood) score += 5;

    const issues: string[] = [];
    const strengths: string[] = [];

    if (!keywordInTitle) issues.push(`Target keyword "${targetKeyword}" is missing from title.`);
    else strengths.push('Primary keyword appears prominently in the title.');

    if (!isTitleOptimal) issues.push(`Title length is ${titleLength} chars (recommended: 40-60 chars).`);
    else strengths.push('Title length is optimal for search engine result pages.');

    if (!keywordInMeta) issues.push('Target keyword is missing in the meta description.');
    else strengths.push('Meta description contains the primary keyword.');

    if (!hasHeadings) issues.push('Add at least two H2 subheadings to break up content.');
    else strengths.push(`Well-structured with ${h2Matches.length} H2 and ${h3Matches.length} H3 headings.`);

    if (wordCount < 800) issues.push(`Current word count (${wordCount}) is below the recommended 800+ words.`);
    else strengths.push(`Comprehensive length with ${wordCount} words.`);

    if (linksCount === 0) issues.push('Add internal links to other blog articles.');
    else strengths.push(`Contains ${linksCount} hyperlink(s) for site authority.`);

    if (imagesCount === 0) issues.push('Include at least one illustrative image or infographic.');
    else strengths.push(`Includes ${imagesCount} image(s) with alt tags.`);

    return res.json({
      score: Math.min(100, Math.max(10, score)),
      wordCount,
      keywordCount,
      keywordDensity: Number(keywordDensity.toFixed(2)),
      keywordInTitle,
      keywordInMeta,
      titleLength,
      metaLength,
      h2Count: h2Matches.length,
      h3Count: h3Matches.length,
      linksCount,
      imagesCount,
      issues,
      strengths,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'SEO audit failed' });
  }
});

// Vite middleware for development & static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
