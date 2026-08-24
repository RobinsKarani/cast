import { defineCommand } from 'citty';
import { executePost } from './post.js';
import { bookmarksCommand } from './bookmarks.js';
import { mentionsCommand } from './mentions.js';
import { searchCommand } from './search.js';
import { AuthManager } from '@cast/core';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const xAuthCommand = defineCommand({
  meta: {
    name: 'auth',
    description: 'Manage X authentication and developer credentials',
  },
  subCommands: {
    login: defineCommand({
      meta: { name: 'login', description: 'Log in to X via browser OAuth PKCE' },
      async run() {
        const manager = new AuthManager();
        try {
          const result = await manager.login('x', { port: 3391 });
          UI.success(`Successfully authenticated as @${result.handle} on X!`);
        } catch (err: any) {
          UI.error(`Login failed: ${err?.message || String(err)}`);
        }
      },
    }),
    setup: defineCommand({
      meta: { name: 'setup', description: 'Configure X OAuth Client ID and Secret' },
      args: {
        clientId: { type: 'string', description: 'OAuth 2.0 Client ID' },
        clientSecret: { type: 'string', description: 'OAuth 2.0 Client Secret' },
      },
      async run({ args }) {
        const manager = new AuthManager();
        const store = manager.getStore();

        if (args.clientId) {
          store.saveAppCredentials('x', {
            clientId: args.clientId as string,
            clientSecret: args.clientSecret as string | undefined,
          });
          UI.success('Saved credentials for X');
          return;
        }

        UI.heading('Cast Auth Setup: X');
        console.log(pc.dim('Enter your X Developer OAuth 2.0 Client ID.\n'));

        const rl = readline.createInterface({ input, output });
        try {
          const clientId = await rl.question(pc.bold('Enter X Client ID: '));
          const clientSecret = await rl.question(pc.bold('Enter X Client Secret (press enter to skip if none): '));

          if (!clientId.trim()) {
            UI.error('Client ID cannot be empty.');
            return;
          }

          store.saveAppCredentials('x', {
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim() || undefined,
          });

          UI.success('Credentials securely saved for X!');
          console.log(`\nNext, authenticate by running: ${pc.cyan('cast x auth login')}\n`);
        } finally {
          rl.close();
        }
      },
    }),
    logout: defineCommand({
      meta: { name: 'logout', description: 'Log out and remove X credentials' },
      async run() {
        const manager = new AuthManager();
        manager.getStore().clearPlatform('x');
        UI.success('Logged out of X.');
      },
    }),
    status: defineCommand({
      meta: { name: 'status', description: 'Check X authentication status' },
      async run() {
        const manager = new AuthManager();
        const s = manager.getStatus().x;
        UI.heading('X Authentication Status');
        console.log(`  ${pc.bold('Configured:')}    ${s.configured ? pc.green('Yes') : pc.red('No')}`);
        console.log(`  ${pc.bold('Authenticated:')} ${s.authenticated ? pc.green('Yes') : pc.red('No')}`);
        console.log(`  ${pc.bold('Handle:')}        ${s.handle ? pc.cyan(`@${s.handle}`) : pc.dim('Not logged in')}`);
        console.log(`  ${pc.bold('Token Expires:')} ${s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : pc.dim('-')}\n`);
      },
    }),
  },
});

export const xCommand = defineCommand({
  meta: {
    name: 'x',
    description: 'X (Twitter) commands: post, bookmarks, mentions, search, and auth',
  },
  subCommands: {
    post: defineCommand({
      meta: { name: 'post', description: 'Publish a tweet or thread to X' },
      args: {
        content: { type: 'positional', description: 'Text to tweet or markdown path', required: false },
        media: { type: 'string', alias: 'm', description: 'Comma-separated paths to media images (up to 4)' },
        thread: { type: 'boolean', alias: 't', description: 'Split long text into an X thread' },
        'dry-run': { type: 'boolean', alias: 'd', description: 'Validate and preview tweet without sending' },
      },
      async run({ args }) {
        await executePost({
          content: args.content as string | undefined,
          targets: ['x'],
          media: args.media as string | undefined,
          thread: Boolean(args.thread),
          dryRun: Boolean(args['dry-run']),
        });
      },
    }),
    bookmarks: bookmarksCommand,
    mentions: mentionsCommand,
    search: searchCommand,
    auth: xAuthCommand,
  },
});
