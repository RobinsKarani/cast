import type { PlatformId, AuthTokens } from './platform.js';

export interface AppCredentials {
  readonly clientId: string;
  readonly clientSecret?: string;
}

export interface StoredPlatformAuth {
  readonly platform: PlatformId;
  readonly credentials?: AppCredentials;
  readonly tokens?: AuthTokens;
  readonly accountHandle?: string;
  readonly displayName?: string;
  readonly platformUserId?: string;
  readonly updatedAt: string;
}

export interface StoredCredentialsFile {
  readonly version: number;
  readonly platforms: {
    readonly x?: StoredPlatformAuth;
    readonly linkedin?: StoredPlatformAuth;
  };
}

export interface PKCEPair {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly state: string;
}
