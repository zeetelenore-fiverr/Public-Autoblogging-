import { BloggerBlog, BloggerPost } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

const TOKEN_KEY = 'blogger_oauth_token';
const EXPIRY_KEY = 'blogger_oauth_token_expiry';
const ACTIVE_BLOG_KEY = 'blogger_active_blog_id';
const CLIENT_ID_KEY = 'blogger_oauth_client_id';

export class BloggerService {
  private token: string | null = null;
  private defaultClientId: string = '';

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  public setDefaultClientId(clientId: string) {
    if (clientId) {
      this.defaultClientId = clientId.trim();
    }
  }

  public getOAuthClientId(): string {
    const saved = localStorage.getItem(CLIENT_ID_KEY);
    if (saved && saved.trim()) return saved.trim();
    return this.defaultClientId;
  }

  public setOAuthClientId(clientId: string) {
    if (clientId && clientId.trim()) {
      localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(CLIENT_ID_KEY);
    }
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  public setToken(token: string, expiresInSeconds: number = 3600) {
    this.token = token.trim();
    localStorage.setItem(TOKEN_KEY, this.token);
    const expiry = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(EXPIRY_KEY, expiry.toString());
  }

  public clearToken() {
    this.token = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }

  public isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      this.clearToken();
      return false;
    }
    return true;
  }

  public getActiveBlogId(): string | null {
    return localStorage.getItem(ACTIVE_BLOG_KEY);
  }

  public setActiveBlogId(blogId: string) {
    localStorage.setItem(ACTIVE_BLOG_KEY, blogId);
  }

  // Centralized response check for Blogger API responses
  private async handleResponse<T = any>(res: Response, defaultMessage: string): Promise<T> {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      
      // Robustly extract error message whether string or nested object
      let msg = '';
      if (typeof data.error === 'string') {
        msg = data.error;
      } else if (data.error?.message) {
        msg = data.error.message;
      } else if (data.details?.error?.message) {
        msg = data.details.error.message;
      } else if (data.message && typeof data.message === 'string') {
        msg = data.message;
      } else if (data.error?.errors?.[0]?.message) {
        msg = data.error.errors[0].message;
      } else {
        msg = `${defaultMessage} (${res.status})`;
      }

      if (res.status === 401) {
        console.warn('Blogger OAuth token invalid or expired (401). Clearing stored token.');
        this.clearToken();
        // Emit global event so all components react and offer reconnection
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('blogger_auth_error', {
              detail: {
                status: 401,
                message: msg || 'Your Google Blogger session has expired or credentials are invalid. Please re-authenticate.',
              },
            })
          );
        }
      } else if (res.status === 403) {
        console.warn('Blogger API permission denied (403):', msg);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('blogger_permission_error', {
              detail: {
                status: 403,
                message: msg,
                blogId: data.blogId,
                isServiceDisabled: !!data.isServiceDisabled,
                isNotAuthor: !!data.isNotAuthor,
                enableApiUrl: data.enableApiUrl,
                rawError: data.details || data,
              },
            })
          );
        }
      }

      const richError: any = new Error(msg);
      richError.status = res.status;
      richError.isServiceDisabled = !!data.isServiceDisabled;
      richError.isNotAuthor = !!data.isNotAuthor;
      richError.enableApiUrl = data.enableApiUrl;
      richError.blogId = data.blogId;
      richError.details = data.details || data;
      throw richError;
    }

    return await res.json();
  }

  public requestOAuthLogin(customClientId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services script not loaded. Check internet connection or refresh.'));
        return;
      }

      const activeClientId = customClientId || this.getOAuthClientId();
      if (!activeClientId) {
        reject(
          new Error(
            'Google OAuth Client ID is required to initiate connection. Please configure your Client ID in the Authentication settings or enter an access token directly.'
          )
        );
        return;
      }

      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'https://www.googleapis.com/auth/blogger',
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error || 'OAuth authorization failed'));
              return;
            }
            if (response.access_token) {
              const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3600;
              this.setToken(response.access_token, expiresIn);
              resolve(response.access_token);
            } else {
              reject(new Error('No access token received from Google'));
            }
          },
        });

        // Prompt the user for consent
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  // Fetch blogs for authenticated user, merging with any manually connected blogs
  public async getBlogs(): Promise<BloggerBlog[]> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not connected to Blogger. Please connect your Google account.');
    }

    const res = await fetch('/api/blogger/blogs', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await this.handleResponse<{
      items?: BloggerBlog[];
      warning?: string;
      isServiceDisabled?: boolean;
      enableApiUrl?: string;
    }>(res, 'Failed to fetch blogs');

    if (data.warning && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('blogger_blogs_warning', {
          detail: {
            warning: data.warning,
            isServiceDisabled: !!data.isServiceDisabled,
            enableApiUrl: data.enableApiUrl,
          },
        })
      );
    }

    const fetchedItems: BloggerBlog[] = data.items || [];

    // Merge with any custom blogs saved by URL/ID
    const savedCustom = this.getCustomBlogs();
    const mergedMap = new Map<string, BloggerBlog>();
    
    for (const b of fetchedItems) {
      if (b && b.id) mergedMap.set(b.id, b);
    }
    for (const b of savedCustom) {
      if (b && b.id && !mergedMap.has(b.id)) {
        mergedMap.set(b.id, b);
      }
    }

    return Array.from(mergedMap.values());
  }

  // Get custom/manually added blogs from localStorage
  public getCustomBlogs(): BloggerBlog[] {
    try {
      const raw = localStorage.getItem('blogger_custom_blogs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveCustomBlog(blog: BloggerBlog) {
    const list = this.getCustomBlogs();
    const filtered = list.filter((b) => b.id !== blog.id);
    filtered.unshift(blog);
    localStorage.setItem('blogger_custom_blogs', JSON.stringify(filtered));
  }

  public removeCustomBlog(blogId: string) {
    const list = this.getCustomBlogs();
    const filtered = list.filter((b) => b.id !== blogId);
    localStorage.setItem('blogger_custom_blogs', JSON.stringify(filtered));
  }

  // Lookup a blog by URL (e.g. https://myblog.blogspot.com or https://www.blogger.com/blog/posts/123456789)
  public async getBlogByUrl(url: string): Promise<BloggerBlog> {
    const token = this.getToken();
    let cleaned = url.trim();

    // Check if user pasted a Blogger Dashboard / Admin URL with numeric blog ID
    // Examples: https://www.blogger.com/blog/posts/8492048204928492
    //           https://www.blogger.com/u/1/blog/posts/8492048204928492
    //           https://www.blogger.com/blog/settings/basic/8492048204928492
    const dashboardMatch = cleaned.match(/blogger\.com\/(?:u\/\d+\/)?blog\/(?:posts|settings|stats|comments|pages|layout|theme|earnings)(?:\/[a-z]+)*\/(\d{6,30})/i);
    if (dashboardMatch && dashboardMatch[1]) {
      const extractedId = dashboardMatch[1];
      console.log(`Detected Blogger Dashboard URL with Blog ID ${extractedId}. Fetching blog by ID...`);
      return await this.getBlogById(extractedId);
    }

    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `https://${cleaned}`;
    }

    try {
      const parsed = new URL(cleaned);
      if (!parsed.hostname.includes('.')) {
        cleaned = `https://${parsed.hostname}.blogspot.com/`;
      }
    } catch {}

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/blogger/blogs/byurl?url=${encodeURIComponent(cleaned)}`, {
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error?.message || data.error || 'Failed to find blog by URL. Ensure the URL is public and correct.');
    }

    const blog: BloggerBlog = await res.json();
    this.saveCustomBlog(blog);
    return blog;
  }

  // Lookup a blog directly by numerical Blog ID
  public async getBlogById(blogId: string): Promise<BloggerBlog> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/blogger/blogs/byid/${encodeURIComponent(blogId.trim())}`, {
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error?.message || data.error || 'Failed to find blog by ID. Ensure the ID is valid.');
    }

    const blog: BloggerBlog = await res.json();
    this.saveCustomBlog(blog);
    return blog;
  }

  // Fetch posts for active blog
  public async getPosts(blogId: string, status: string = 'LIVE,DRAFT,SCHEDULED', blogUrl?: string): Promise<BloggerPost[]> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not connected to Blogger');
    }

    let queryUrl = `/api/blogger/blogs/${blogId}/posts?status=${encodeURIComponent(status)}&maxResults=50`;
    if (blogUrl) {
      queryUrl += `&blogUrl=${encodeURIComponent(blogUrl)}`;
    }

    const res = await fetch(queryUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await this.handleResponse<{ items?: BloggerPost[] }>(res, 'Failed to fetch blog posts');
    return data.items || [];
  }

  // Create Post (Draft, Scheduled, or Published)
  public async createPost(
    blogId: string,
    postData: {
      title: string;
      content: string;
      labels?: string[];
      published?: string; // ISO string for scheduled publish
      isDraft?: boolean;
      blogUrl?: string;
    }
  ): Promise<BloggerPost> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not connected to Blogger. Please click "Connect Blogger" in the header.');
    }

    // Auto-resolve real numeric blog ID if current ID is a custom string
    let targetBlogId = blogId;
    if ((!/^\d+$/.test(targetBlogId) || targetBlogId.startsWith('custom_')) && postData.blogUrl) {
      try {
        const resolved = await this.getBlogByUrl(postData.blogUrl);
        if (resolved?.id && /^\d+$/.test(resolved.id)) {
          targetBlogId = resolved.id;
          this.setActiveBlogId(targetBlogId);
        }
      } catch (e) {
        console.warn('Could not pre-resolve numeric blog ID:', e);
      }
    }

    const isDraft = postData.isDraft ?? false;
    const bodyPayload: any = {
      title: postData.title,
      content: postData.content,
      labels: postData.labels || [],
      blogUrl: postData.blogUrl,
    };

    if (postData.published) {
      bodyPayload.published = postData.published;
    }

    let reqUrl = `/api/blogger/blogs/${targetBlogId}/posts?isDraft=${isDraft}`;
    if (postData.blogUrl) {
      reqUrl += `&blogUrl=${encodeURIComponent(postData.blogUrl)}`;
    }

    const res = await fetch(reqUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    return await this.handleResponse<BloggerPost>(res, 'Failed to create post on Blogger');
  }

  // Update existing post
  public async updatePost(
    blogId: string,
    postId: string,
    postData: {
      title: string;
      content: string;
      labels?: string[];
      blogUrl?: string;
    }
  ): Promise<BloggerPost> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not connected to Blogger');
    }

    let reqUrl = `/api/blogger/blogs/${blogId}/posts/${postId}`;
    if (postData.blogUrl) {
      reqUrl += `?blogUrl=${encodeURIComponent(postData.blogUrl)}`;
    }

    const res = await fetch(reqUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    return await this.handleResponse<BloggerPost>(res, 'Failed to update post on Blogger');
  }

  // Publish drafted post
  public async publishPost(blogId: string, postId: string, publishDate?: string, blogUrl?: string): Promise<BloggerPost> {
    const token = this.getToken();
    if (!token) throw new Error('Not connected to Blogger');

    let url = `/api/blogger/blogs/${blogId}/posts/${postId}/publish`;
    const params = new URLSearchParams();
    if (publishDate) params.set('publishDate', publishDate);
    if (blogUrl) params.set('blogUrl', blogUrl);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await this.handleResponse<BloggerPost>(res, 'Failed to publish post on Blogger');
  }

  // Revert published/scheduled post to draft
  public async revertToDraft(blogId: string, postId: string): Promise<BloggerPost> {
    const token = this.getToken();
    if (!token) throw new Error('Not connected to Blogger');

    const res = await fetch(`/api/blogger/blogs/${blogId}/posts/${postId}/revert`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await this.handleResponse<BloggerPost>(res, 'Failed to revert post to draft');
  }

  // Delete post
  public async deletePost(blogId: string, postId: string): Promise<void> {
    const token = this.getToken();
    if (!token) throw new Error('Not connected to Blogger');

    const res = await fetch(`/api/blogger/blogs/${blogId}/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await this.handleResponse<any>(res, 'Failed to delete post');
  }
}

export const bloggerService = new BloggerService();
