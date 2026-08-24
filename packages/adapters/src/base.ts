import type {
  PlatformAdapter,
  PlatformCapabilities,
  PlatformId,
  PostPayload,
  PlatformPostResult,
  AuthTokens,
  BookmarkItem,
  MentionItem,
} from '@cast/types';

export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly platformId: PlatformId;
  abstract readonly displayName: string;

  abstract getCapabilities(): PlatformCapabilities;
  abstract generateAuthUrl(state: string, codeChallenge?: string): string;
  abstract exchangeCodeForTokens(
    code: string,
    codeVerifier?: string,
    redirectUri?: string
  ): Promise<AuthTokens>;
  abstract refreshAuthTokens(refreshToken: string): Promise<AuthTokens>;
  abstract publishPost(payload: PostPayload, tokens: AuthTokens): Promise<PlatformPostResult>;

  validatePayload(payload: PostPayload): { valid: boolean; errors: string[] } {
    const caps = this.getCapabilities();
    const errors: string[] = [];

    if (!payload.text && (!payload.mediaPaths || payload.mediaPaths.length === 0)) {
      errors.push(`${this.displayName}: Post content or media must not be empty.`);
    }

    if (payload.text && payload.text.length > caps.maxTextLength) {
      if (!caps.supportsThreads || !payload.threadItems) {
        errors.push(
          `${this.displayName}: Text exceeds maximum length of ${caps.maxTextLength} characters (got ${payload.text.length}).`
        );
      }
    }

    if (payload.mediaPaths && payload.mediaPaths.length > 0) {
      if (!caps.supportsMedia) {
        errors.push(`${this.displayName}: Media attachments are not supported.`);
      } else if (payload.mediaPaths.length > caps.maxMediaCount) {
        errors.push(
          `${this.displayName}: Too many media items (max: ${caps.maxMediaCount}, got: ${payload.mediaPaths.length}).`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async uploadMedia?(filePath: string, mimeType: string, tokens: AuthTokens): Promise<string>;
  async fetchUserProfile?(tokens: AuthTokens): Promise<{ platformUserId: string; handle: string; displayName?: string }>;
  async fetchBookmarks?(tokens: AuthTokens, limit?: number): Promise<BookmarkItem[]>;
  async fetchMentions?(tokens: AuthTokens, limit?: number): Promise<MentionItem[]>;
}
