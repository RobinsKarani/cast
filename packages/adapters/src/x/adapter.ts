import { BasePlatformAdapter } from '../base.js';
import type {
  PlatformCapabilities,
  PostPayload,
  PlatformPostResult,
  AuthTokens,
  BookmarkItem,
  MentionItem,
  AppCredentials,
} from '@cast/types';
import { readFileSync, statSync } from 'node:fs';

export interface XAdapterOptions {
  credentials: AppCredentials;
  redirectUri?: string;
}

export class XAdapter extends BasePlatformAdapter {
  readonly platformId = 'x' as const;
  readonly displayName = 'X (Twitter)';

  private readonly credentials: AppCredentials;
  private readonly redirectUri: string;

  constructor(options: XAdapterOptions) {
    super();
    this.credentials = options.credentials;
    this.redirectUri = options.redirectUri || 'http://127.0.0.1:3391/callback';
  }

  getCapabilities(): PlatformCapabilities {
    return {
      maxTextLength: 280,
      supportsThreads: true,
      supportsMedia: true,
      maxMediaCount: 4,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      supportsBookmarks: true,
      supportsMentions: true,
      supportsSearch: true,
    };
  }

  generateAuthUrl(state: string, codeChallenge?: string): string {
    const scopes = [
      'tweet.read',
      'tweet.write',
      'users.read',
      'bookmark.read',
      'bookmark.write',
      'offline.access',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.credentials.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      state,
      code_challenge: codeChallenge || '',
      code_challenge_method: 'S256',
    });

    return `https://x.com/i/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string,
    redirectUri?: string
  ): Promise<AuthTokens> {
    const targetRedirectUri = redirectUri || this.redirectUri;
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: targetRedirectUri,
      code_verifier: codeVerifier || '',
      client_id: this.credentials.clientId,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.credentials.clientSecret) {
      const basic = Buffer.from(
        `${this.credentials.clientId}:${this.credentials.clientSecret}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`X OAuth token exchange failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
    };

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scope: data.scope,
      tokenType: data.token_type,
    };
  }

  async refreshAuthTokens(refreshToken: string): Promise<AuthTokens> {
    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.credentials.clientId,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.credentials.clientSecret) {
      const basic = Buffer.from(
        `${this.credentials.clientId}:${this.credentials.clientSecret}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`X Token refresh failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
    };

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
      scope: data.scope,
      tokenType: data.token_type,
    };
  }

  async fetchUserProfile(
    tokens: AuthTokens
  ): Promise<{ platformUserId: string; handle: string; displayName?: string }> {
    const response = await fetch('https://api.x.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to fetch X user profile: ${err}`);
    }

    const data = (await response.json()) as {
      data: { id: string; username: string; name: string };
    };

    return {
      platformUserId: data.data.id,
      handle: data.data.username,
      displayName: data.data.name,
    };
  }

  async uploadMedia(filePath: string, mimeType: string, tokens: AuthTokens): Promise<string> {
    const fileBuffer = readFileSync(filePath);
    const totalBytes = statSync(filePath).size;

    // INIT
    const initParams = new URLSearchParams({
      command: 'INIT',
      total_bytes: totalBytes.toString(),
      media_type: mimeType,
    });

    const initRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: initParams.toString(),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      throw new Error(`X Media Upload INIT failed: ${err}`);
    }

    const initData = (await initRes.json()) as { media_id_string: string };
    const mediaId = initData.media_id_string;

    // APPEND
    const formData = new FormData();
    formData.append('command', 'APPEND');
    formData.append('media_id', mediaId);
    formData.append('segment_index', '0');
    formData.append('media', new Blob([fileBuffer], { type: mimeType }));

    const appendRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: formData,
    });

    if (!appendRes.ok) {
      const err = await appendRes.text();
      throw new Error(`X Media Upload APPEND failed: ${err}`);
    }

    // FINALIZE
    const finalizeParams = new URLSearchParams({
      command: 'FINALIZE',
      media_id: mediaId,
    });

    const finalizeRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: finalizeParams.toString(),
    });

    if (!finalizeRes.ok) {
      const err = await finalizeRes.text();
      throw new Error(`X Media Upload FINALIZE failed: ${err}`);
    }

    return mediaId;
  }

  async publishPost(payload: PostPayload, tokens: AuthTokens): Promise<PlatformPostResult> {
    try {
      const validation = this.validatePayload(payload);
      if (!validation.valid) {
        return {
          success: false,
          platform: this.platformId,
          error: validation.errors.join('; '),
          publishedAt: new Date(),
        };
      }

      // Handle media uploads if present
      const mediaIds: string[] = [];
      if (payload.mediaPaths && payload.mediaPaths.length > 0) {
        for (const p of payload.mediaPaths) {
          const mime = p.endsWith('.png') ? 'image/png' : 'image/jpeg';
          const mid = await this.uploadMedia(p, mime, tokens);
          mediaIds.push(mid);
        }
      }

      // Handle thread items or single post
      const postsToPublish = payload.threadItems && payload.threadItems.length > 0
        ? payload.threadItems
        : [payload.text];

      let lastTweetId: string | undefined = payload.replyToId;
      let firstTweetId: string | undefined;

      for (let i = 0; i < postsToPublish.length; i++) {
        const itemText = postsToPublish[i];
        const body: Record<string, any> = { text: itemText };

        // Attach media to first tweet only in a thread
        if (i === 0 && mediaIds.length > 0) {
          body.media = { media_ids: mediaIds };
        }

        if (lastTweetId) {
          body.reply = { in_reply_to_tweet_id: lastTweetId };
        }

        const res = await fetch('https://api.x.com/2/tweets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          let friendlyError = `X API returned ${res.status}: ${errText}`;
          if (res.status === 402 || errText.includes('credits-depleted') || errText.includes('credits depleted')) {
            friendlyError = `X credits depleted (402 Payment Required). Add API credits at https://console.x.com/ to post to X.`;
          }
          return {
            success: false,
            platform: this.platformId,
            error: friendlyError,
            publishedAt: new Date(),
          };
        }

        const data = (await res.json()) as { data: { id: string; text: string } };
        lastTweetId = data.data.id;
        if (!firstTweetId) {
          firstTweetId = data.data.id;
        }
      }

      return {
        success: true,
        platform: this.platformId,
        externalPostId: firstTweetId,
        externalUrl: firstTweetId ? `https://x.com/i/status/${firstTweetId}` : undefined,
        publishedAt: new Date(),
      };
    } catch (err: any) {
      return {
        success: false,
        platform: this.platformId,
        error: err?.message || String(err),
        publishedAt: new Date(),
      };
    }
  }

  async fetchBookmarks(tokens: AuthTokens, limit = 20): Promise<BookmarkItem[]> {
    const user = await this.fetchUserProfile(tokens);
    const params = new URLSearchParams({
      max_results: Math.min(limit, 100).toString(),
      'tweet.fields': 'created_at,author_id,entities',
      expansions: 'author_id',
      'user.fields': 'username,name',
    });

    const res = await fetch(
      `https://api.x.com/2/users/${user.platformUserId}/bookmarks?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch X bookmarks (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      data?: Array<{ id: string; text: string; created_at?: string; author_id: string }>;
      includes?: { users?: Array<{ id: string; username: string; name: string }> };
    };

    if (!data.data) return [];

    const userMap = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
      for (const u of data.includes.users) {
        userMap.set(u.id, { username: u.username, name: u.name });
      }
    }

    return data.data.map((tweet) => {
      const author = userMap.get(tweet.author_id) || { username: 'unknown', name: 'Unknown' };
      return {
        id: `x:${tweet.id}`,
        platform: 'x' as const,
        externalId: tweet.id,
        authorHandle: author.username,
        authorName: author.name,
        text: tweet.text,
        url: `https://x.com/${author.username}/status/${tweet.id}`,
        createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      };
    });
  }

  async fetchMentions(tokens: AuthTokens, limit = 20): Promise<MentionItem[]> {
    const user = await this.fetchUserProfile(tokens);
    const params = new URLSearchParams({
      max_results: Math.min(limit, 100).toString(),
      'tweet.fields': 'created_at,author_id,conversation_id',
      expansions: 'author_id',
      'user.fields': 'username,name',
    });

    const res = await fetch(
      `https://api.x.com/2/users/${user.platformUserId}/mentions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch X mentions (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      data?: Array<{ id: string; text: string; created_at?: string; author_id: string; conversation_id?: string }>;
      includes?: { users?: Array<{ id: string; username: string; name: string }> };
    };

    if (!data.data) return [];

    const userMap = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
      for (const u of data.includes.users) {
        userMap.set(u.id, { username: u.username, name: u.name });
      }
    }

    return data.data.map((tweet) => {
      const author = userMap.get(tweet.author_id) || { username: 'unknown', name: 'Unknown' };
      return {
        id: `x:${tweet.id}`,
        platform: 'x' as const,
        externalId: tweet.id,
        authorHandle: author.username,
        authorName: author.name,
        text: tweet.text,
        inReplyToPostId: tweet.conversation_id,
        createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        url: `https://x.com/${author.username}/status/${tweet.id}`,
      };
    });
  }

  async searchRecent(tokens: AuthTokens, query: string, limit = 10): Promise<BookmarkItem[]> {
    const params = new URLSearchParams({
      query,
      max_results: Math.min(Math.max(limit, 10), 100).toString(),
      'tweet.fields': 'created_at,author_id',
      expansions: 'author_id',
      'user.fields': 'username,name',
    });

    const res = await fetch(
      `https://api.x.com/2/tweets/search/recent?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      let friendlyError = `Failed to search X (${res.status}): ${err}`;
      if (res.status === 402 || err.includes('credits-depleted')) {
        friendlyError = `X credits depleted (402). Add API credits at https://console.x.com/ to use search.`;
      }
      throw new Error(friendlyError);
    }

    const data = (await res.json()) as {
      data?: Array<{ id: string; text: string; created_at?: string; author_id: string }>;
      includes?: { users?: Array<{ id: string; username: string; name: string }> };
    };

    if (!data.data) return [];

    const userMap = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
      for (const u of data.includes.users) {
        userMap.set(u.id, { username: u.username, name: u.name });
      }
    }

    return data.data.map((tweet) => {
      const author = userMap.get(tweet.author_id) || { username: 'unknown', name: 'Unknown' };
      return {
        id: `x:${tweet.id}`,
        platform: 'x' as const,
        externalId: tweet.id,
        authorHandle: author.username,
        authorName: author.name,
        text: tweet.text,
        url: `https://x.com/${author.username}/status/${tweet.id}`,
        createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      };
    });
  }
}
