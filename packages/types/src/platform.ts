export type PlatformId = 'x' | 'linkedin';

export interface PlatformCapabilities {
  readonly maxTextLength: number;
  readonly supportsThreads: boolean;
  readonly supportsMedia: boolean;
  readonly maxMediaCount: number;
  readonly supportedMediaTypes: readonly string[];
  readonly supportsBookmarks: boolean;
  readonly supportsMentions: boolean;
  readonly supportsSearch: boolean;
}

export interface PostPayload {
  readonly text: string;
  readonly mediaPaths?: string[];
  readonly threadItems?: string[];
  readonly replyToId?: string;
}

export interface PlatformPostResult {
  readonly success: boolean;
  readonly platform: PlatformId;
  readonly externalPostId?: string;
  readonly externalUrl?: string;
  readonly error?: string;
  readonly publishedAt: Date;
}

export interface BookmarkItem {
  readonly id: string; // e.g. "x:18273645"
  readonly platform: PlatformId;
  readonly externalId: string;
  readonly authorHandle: string;
  readonly authorName: string;
  readonly text: string;
  readonly url: string;
  readonly createdAt: Date;
  readonly mediaUrls?: string[];
}

export interface MentionItem {
  readonly id: string;
  readonly platform: PlatformId;
  readonly externalId: string;
  readonly authorHandle: string;
  readonly authorName?: string;
  readonly text: string;
  readonly inReplyToPostId?: string;
  readonly createdAt: Date;
  readonly url: string;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt?: Date;
  readonly scope?: string;
  readonly tokenType?: string;
}

export interface PlatformAdapter {
  readonly platformId: PlatformId;
  readonly displayName: string;

  getCapabilities(): PlatformCapabilities;

  generateAuthUrl(state: string, codeChallenge?: string): string;

  exchangeCodeForTokens(
    code: string,
    codeVerifier?: string,
    redirectUri?: string
  ): Promise<AuthTokens>;

  refreshAuthTokens(refreshToken: string): Promise<AuthTokens>;

  validatePayload(payload: PostPayload): { valid: boolean; errors: string[] };

  publishPost(payload: PostPayload, tokens: AuthTokens): Promise<PlatformPostResult>;

  uploadMedia?(filePath: string, mimeType: string, tokens: AuthTokens): Promise<string>;

  fetchUserProfile?(tokens: AuthTokens): Promise<{ platformUserId: string; handle: string; displayName?: string }>;

  fetchBookmarks?(tokens: AuthTokens, limit?: number): Promise<BookmarkItem[]>;

  fetchMentions?(tokens: AuthTokens, limit?: number): Promise<MentionItem[]>;
}
