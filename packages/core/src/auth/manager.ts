import type {
  PlatformId,
  PlatformAdapter,
  AuthTokens,
  StoredPlatformAuth,
  AppCredentials,
} from '@cast/types';
import { XAdapter, LinkedInAdapter } from '@cast/adapters';
import { PKCEHelper } from './pkce.js';
import { EphemeralAuthServer } from './server.js';
import { SecureCredentialStore } from './keyring.js';

export class AuthManager {
  private readonly store: SecureCredentialStore;

  constructor(store?: SecureCredentialStore) {
    this.store = store || new SecureCredentialStore();
  }

  getStore(): SecureCredentialStore {
    return this.store;
  }

  getAdapter(platform: PlatformId): PlatformAdapter {
    const auth = this.store.getPlatformAuth(platform);
    const credentials: AppCredentials = auth?.credentials || {
      clientId: process.env[`CAST_${platform.toUpperCase()}_CLIENT_ID`] || 'unconfigured',
      clientSecret: process.env[`CAST_${platform.toUpperCase()}_CLIENT_SECRET`] || undefined,
    };

    if (platform === 'x') {
      return new XAdapter({ credentials });
    } else if (platform === 'linkedin') {
      return new LinkedInAdapter({ credentials });
    }

    throw new Error(`Unsupported platform: ${platform}`);
  }

  async login(platform: PlatformId, options?: { port?: number; openBrowser?: boolean }): Promise<{ handle: string; displayName?: string }> {
    const auth = this.store.getPlatformAuth(platform);
    const credentials = auth?.credentials;
    if (!credentials?.clientId || credentials.clientId === 'unconfigured') {
      throw new Error(`Missing credentials for ${platform.toUpperCase()}. Run \`cast auth setup ${platform}\` first.`);
    }

    const adapter = this.getAdapter(platform);
    const pkce = PKCEHelper.generatePair();
    const port = options?.port || 3391;

    const authUrl = adapter.generateAuthUrl(pkce.state, pkce.codeChallenge);
    const server = new EphemeralAuthServer({
      port,
      expectedState: pkce.state,
    });

    console.log(`\nInitiating authentication for ${adapter.displayName}...`);
    console.log(`If your browser does not open automatically, visit this URL:\n\n${authUrl}\n`);

    // Attempt to open browser automatically
    if (options?.openBrowser !== false) {
      try {
        const { spawn } = await import('node:child_process');
        const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        spawn(opener, [authUrl], { stdio: 'ignore', detached: true }).unref();
      } catch {
        // Fallback to manual URL visit
      }
    }

    const callback = await server.waitForCallback();

    const tokens = await adapter.exchangeCodeForTokens(
      callback.code,
      pkce.codeVerifier
    );

    let userInfo = { platformUserId: '', handle: '', displayName: '' };
    if (adapter.fetchUserProfile) {
      try {
        const profile = await adapter.fetchUserProfile(tokens);
        userInfo = {
          platformUserId: profile.platformUserId,
          handle: profile.handle,
          displayName: profile.displayName || '',
        };
      } catch (err) {
        console.warn(`Could not fetch profile details: ${err}`);
      }
    }

    this.store.saveTokens(platform, tokens, userInfo);

    return {
      handle: userInfo.handle,
      displayName: userInfo.displayName,
    };
  }

  async getValidTokens(platform: PlatformId): Promise<AuthTokens> {
    const auth = this.store.getPlatformAuth(platform);
    if (!auth?.tokens) {
      throw new Error(`Not authenticated for ${platform.toUpperCase()}. Run \`cast auth login ${platform}\` first.`);
    }

    const tokens = auth.tokens;

    // Check if token is expired or expiring within 5 minutes
    if (tokens.expiresAt) {
      const expiresAtMs = new Date(tokens.expiresAt).getTime();
      const nowMs = Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;

      if (nowMs + fiveMinutesMs >= expiresAtMs) {
        if (tokens.refreshToken && platform === 'x') {
          // Silent refresh
          const adapter = this.getAdapter(platform);
          try {
            const newTokens = await adapter.refreshAuthTokens(tokens.refreshToken);
            this.store.saveTokens(platform, newTokens);
            return newTokens;
          } catch (err) {
            throw new Error(`Token refresh failed for ${platform}: ${err}. Please run \`cast auth login ${platform}\`.`);
          }
        } else {
          throw new Error(`Authentication token for ${platform} has expired. Please run \`cast auth login ${platform}\`.`);
        }
      }
    }

    return tokens;
  }

  getStatus(): Record<PlatformId, { configured: boolean; authenticated: boolean; handle?: string; expiresAt?: string }> {
    const platforms: PlatformId[] = ['x', 'linkedin'];
    const result: Record<PlatformId, { configured: boolean; authenticated: boolean; handle?: string; expiresAt?: string }> = {
      x: { configured: false, authenticated: false },
      linkedin: { configured: false, authenticated: false },
    };

    for (const p of platforms) {
      const auth = this.store.getPlatformAuth(p);
      const configured = Boolean(auth?.credentials?.clientId && auth.credentials.clientId !== 'unconfigured');
      const authenticated = Boolean(auth?.tokens?.accessToken);
      const expiresAt = auth?.tokens?.expiresAt
        ? new Date(auth.tokens.expiresAt).toISOString()
        : undefined;

      result[p] = {
        configured,
        authenticated,
        handle: auth?.accountHandle,
        expiresAt,
      };
    }

    return result;
  }
}
