import { BasePlatformAdapter } from '../base.js';
import type {
  PlatformCapabilities,
  PostPayload,
  PlatformPostResult,
  AuthTokens,
  AppCredentials,
} from '@cast/types';
import { readFileSync } from 'node:fs';

export interface LinkedInAdapterOptions {
  credentials: AppCredentials;
  redirectUri?: string;
}

export class LinkedInAdapter extends BasePlatformAdapter {
  readonly platformId = 'linkedin' as const;
  readonly displayName = 'LinkedIn';

  private readonly credentials: AppCredentials;
  private readonly redirectUri: string;
  private readonly apiVersion = '202608';

  constructor(options: LinkedInAdapterOptions) {
    super();
    this.credentials = options.credentials;
    this.redirectUri = options.redirectUri || 'http://127.0.0.1:3391/callback';
  }

  getCapabilities(): PlatformCapabilities {
    return {
      maxTextLength: 3000,
      supportsThreads: false,
      supportsMedia: true,
      maxMediaCount: 1,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif'],
      supportsBookmarks: false,
      supportsMentions: false,
      supportsSearch: false,
    };
  }

  generateAuthUrl(state: string): string {
    const scopes = ['openid', 'profile', 'w_member_social'].join(' ');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.credentials.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      state,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    _codeVerifier?: string,
    redirectUri?: string
  ): Promise<AuthTokens> {
    if (!this.credentials.clientSecret) {
      throw new Error('LinkedIn OAuth requires a Client Secret.');
    }

    const targetRedirectUri = redirectUri || this.redirectUri;
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: targetRedirectUri,
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LinkedIn OAuth token exchange failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      scope?: string;
    };

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      expiresAt,
      scope: data.scope,
      tokenType: 'Bearer',
    };
  }

  async refreshAuthTokens(_refreshToken: string): Promise<AuthTokens> {
    throw new Error(
      'LinkedIn self-serve member tokens must be renewed by running `cast auth login linkedin`.'
    );
  }

  async fetchUserProfile(
    tokens: AuthTokens
  ): Promise<{ platformUserId: string; handle: string; displayName?: string }> {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to fetch LinkedIn user info: ${err}`);
    }

    const data = (await response.json()) as {
      sub: string;
      name?: string;
      email?: string;
      given_name?: string;
    };

    return {
      platformUserId: data.sub,
      handle: data.name || data.email || data.sub,
      displayName: data.name,
    };
  }

  async uploadMedia(filePath: string, mimeType: string, tokens: AuthTokens): Promise<string> {
    const user = await this.fetchUserProfile(tokens);
    const authorUrn = `urn:li:person:${user.platformUserId}`;
    const fileBuffer = readFileSync(filePath);

    // Step 1: Initialize Upload
    const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'LinkedIn-Version': this.apiVersion,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: authorUrn,
        },
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      throw new Error(`LinkedIn Image Initialize Upload failed: ${err}`);
    }

    const initData = (await initRes.json()) as {
      value: {
        uploadUrl: string;
        image: string;
      };
    };

    const uploadUrl = initData.value.uploadUrl;
    const imageUrn = initData.value.image;

    // Step 2: Upload Binary
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': mimeType,
      },
      body: fileBuffer,
    });

    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error(`LinkedIn Image Binary Upload failed: ${err}`);
    }

    return imageUrn;
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

      const user = await this.fetchUserProfile(tokens);
      const authorUrn = `urn:li:person:${user.platformUserId}`;

      let imageUrn: string | undefined;
      if (payload.mediaPaths && payload.mediaPaths.length > 0) {
        const filePath = payload.mediaPaths[0];
        const mime = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        imageUrn = await this.uploadMedia(filePath, mime, tokens);
      }

      const postBody: Record<string, any> = {
        author: authorUrn,
        commentary: payload.text,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      };

      if (imageUrn) {
        postBody.content = {
          media: {
            id: imageUrn,
          },
        };
      }

      const res = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'LinkedIn-Version': this.apiVersion,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      });

      if (!res.ok) {
        const err = await res.text();
        return {
          success: false,
          platform: this.platformId,
          error: `LinkedIn API returned ${res.status}: ${err}`,
          publishedAt: new Date(),
        };
      }

      const postId = res.headers.get('x-restli-id') || undefined;

      return {
        success: true,
        platform: this.platformId,
        externalPostId: postId,
        externalUrl: postId ? `https://www.linkedin.com/feed/update/${postId}/` : undefined,
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
}
