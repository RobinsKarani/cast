import { defineCommand } from 'citty';
import { AuthManager } from '@cast/core';
import type { PlatformId } from '@cast/types';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';

export const authSetupCommand = defineCommand({
  meta: {
    name: 'setup',
    description: 'Configure OAuth 2.0 Client ID and Secret for X and LinkedIn',
  },
  args: {
    platform: {
      type: 'positional',
      description: 'Platform to setup (x, linkedin, or both)',
      required: false,
    },
    clientId: {
      type: 'string',
      description: 'OAuth 2.0 Client ID',
    },
    clientSecret: {
      type: 'string',
      description: 'OAuth 2.0 Client Secret (optional for X PKCE, required for LinkedIn)',
    },
  },
  async run({ args }) {
    const manager = new AuthManager();
    const store = manager.getStore();

    const targetPlatform = (args.platform || 'x').toLowerCase() as PlatformId;

    if (args.clientId) {
      store.saveAppCredentials(targetPlatform, {
        clientId: args.clientId,
        clientSecret: args.clientSecret,
      });
      UI.success(`Saved credentials for ${targetPlatform.toUpperCase()}`);
      return;
    }

    // Interactive prompt setup
    UI.heading(`Cast Auth Setup: ${targetPlatform.toUpperCase()}`);
    console.log(pc.dim('Enter the developer credentials from your developer portal.\n'));

    const readline = await import('node:readline/promises');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    try {
      const clientId = await rl.question(pc.bold(`Enter ${targetPlatform.toUpperCase()} Client ID: `));
      const clientSecret = await rl.question(pc.bold(`Enter ${targetPlatform.toUpperCase()} Client Secret (press enter to skip if none): `));

      if (!clientId.trim()) {
        UI.error('Client ID cannot be empty.');
        return;
      }

      store.saveAppCredentials(targetPlatform, {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim() || undefined,
      });

      UI.success(`Credentials securely saved for ${targetPlatform.toUpperCase()}!`);
      console.log(`\nNext, authenticate your account by running: ${pc.cyan(`cast auth login ${targetPlatform}`)}\n`);
    } finally {
      rl.close();
    }
  },
});

export const authLoginCommand = defineCommand({
  meta: {
    name: 'login',
    description: 'Authenticate an account via OAuth 2.0 PKCE',
  },
  args: {
    platform: {
      type: 'positional',
      description: 'Platform to login (x or linkedin)',
      required: true,
    },
    port: {
      type: 'string',
      description: 'Local callback port (default: 3391)',
      default: '3391',
    },
  },
  async run({ args }) {
    const platform = args.platform.toLowerCase() as PlatformId;
    if (platform !== 'x' && platform !== 'linkedin') {
      UI.error(`Invalid platform "${args.platform}". Choose "x" or "linkedin".`);
      return;
    }

    const manager = new AuthManager();
    try {
      const result = await manager.login(platform, {
        port: parseInt(args.port, 10),
      });

      UI.success(`Successfully authenticated as @${result.handle} on ${platform.toUpperCase()}!`);
    } catch (err: any) {
      UI.error(`Login failed: ${err?.message || String(err)}`);
    }
  },
});

export const authStatusCommand = defineCommand({
  meta: {
    name: 'status',
    description: 'Check configuration and token health for all platforms',
  },
  async run() {
    const manager = new AuthManager();
    const status = manager.getStatus();

    UI.heading('Cast Authentication Status');

    const headers = ['Platform', 'Configured', 'Authenticated', 'Handle', 'Token Expires'];
    const rows = (['x', 'linkedin'] as PlatformId[]).map((p) => {
      const s = status[p];
      const configuredStr = s.configured ? pc.green('Yes') : pc.red('No');
      const authStr = s.authenticated ? pc.green('Yes') : pc.red('No');
      const handleStr = s.handle ? `@${s.handle}` : pc.dim('-');
      const expiresStr = s.expiresAt
        ? new Date(s.expiresAt).toLocaleDateString()
        : pc.dim('-');

      return [p.toUpperCase(), configuredStr, authStr, handleStr, expiresStr];
    });

    UI.table(headers, rows);
  },
});

export const authLogoutCommand = defineCommand({
  meta: {
    name: 'logout',
    description: 'Log out and clear stored tokens for a platform',
  },
  args: {
    platform: {
      type: 'positional',
      description: 'Platform to logout (x or linkedin)',
      required: true,
    },
  },
  async run({ args }) {
    const platform = args.platform.toLowerCase() as PlatformId;
    const manager = new AuthManager();
    manager.getStore().clearPlatform(platform);
    UI.success(`Logged out of ${platform.toUpperCase()}.`);
  },
});

export const authCommand = defineCommand({
  meta: {
    name: 'auth',
    description: 'Manage platform authentication and credentials',
  },
  subCommands: {
    setup: authSetupCommand,
    login: authLoginCommand,
    status: authStatusCommand,
    logout: authLogoutCommand,
  },
});
