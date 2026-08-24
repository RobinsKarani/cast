import { defineCommand } from 'citty';
import { executePost } from './post.js';
import { AuthManager } from '@cast/core';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const linkedinAuthCommand = defineCommand({
  meta: {
    name: 'auth',
    description: 'Manage LinkedIn authentication and developer credentials',
  },
  subCommands: {
    login: defineCommand({
      meta: { name: 'login', description: 'Log in to LinkedIn via browser OAuth' },
      async run() {
        const manager = new AuthManager();
        try {
          const result = await manager.login('linkedin', { port: 3391 });
          UI.success(`Successfully authenticated as @${result.handle} on LinkedIn!`);
        } catch (err: any) {
          UI.error(`Login failed: ${err?.message || String(err)}`);
        }
      },
    }),
    setup: defineCommand({
      meta: { name: 'setup', description: 'Configure LinkedIn OAuth Client ID and Secret' },
      args: {
        clientId: { type: 'string', description: 'OAuth 2.0 Client ID' },
        clientSecret: { type: 'string', description: 'OAuth 2.0 Client Secret' },
      },
      async run({ args }) {
        const manager = new AuthManager();
        const store = manager.getStore();

        if (args.clientId) {
          store.saveAppCredentials('linkedin', {
            clientId: args.clientId as string,
            clientSecret: args.clientSecret as string | undefined,
          });
          UI.success('Saved credentials for LinkedIn');
          return;
        }

        UI.heading('Cast Auth Setup: LinkedIn');
        console.log(pc.dim('Enter your LinkedIn Developer OAuth 2.0 Client ID & Secret.\n'));

        const rl = readline.createInterface({ input, output });
        try {
          const clientId = await rl.question(pc.bold('Enter LinkedIn Client ID: '));
          const clientSecret = await rl.question(pc.bold('Enter LinkedIn Primary Client Secret: '));

          if (!clientId.trim()) {
            UI.error('Client ID cannot be empty.');
            return;
          }

          store.saveAppCredentials('linkedin', {
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim() || undefined,
          });

          UI.success('Credentials securely saved for LinkedIn!');
          console.log(`\nNext, authenticate by running: ${pc.cyan('cast l auth login')}\n`);
        } finally {
          rl.close();
        }
      },
    }),
    logout: defineCommand({
      meta: { name: 'logout', description: 'Log out and remove LinkedIn credentials' },
      async run() {
        const manager = new AuthManager();
        manager.getStore().clearPlatform('linkedin');
        UI.success('Logged out of LinkedIn.');
      },
    }),
    status: defineCommand({
      meta: { name: 'status', description: 'Check LinkedIn authentication status' },
      async run() {
        const manager = new AuthManager();
        const s = manager.getStatus().linkedin;
        UI.heading('LinkedIn Authentication Status');
        console.log(`  ${pc.bold('Configured:')}    ${s.configured ? pc.green('Yes') : pc.red('No')}`);
        console.log(`  ${pc.bold('Authenticated:')} ${s.authenticated ? pc.green('Yes') : pc.red('No')}`);
        console.log(`  ${pc.bold('Handle:')}        ${s.handle ? pc.cyan(`@${s.handle}`) : pc.dim('Not logged in')}`);
        console.log(`  ${pc.bold('Token Expires:')} ${s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : pc.dim('-')}\n`);
      },
    }),
  },
});

export const linkedinCommand = defineCommand({
  meta: {
    name: 'linkedin',
    description: 'LinkedIn commands: post and auth',
  },
  subCommands: {
    post: defineCommand({
      meta: { name: 'post', description: 'Publish an update to LinkedIn' },
      args: {
        content: { type: 'positional', description: 'Text to post or markdown path', required: false },
        media: { type: 'string', alias: 'm', description: 'Image path' },
        'dry-run': { type: 'boolean', alias: 'd', description: 'Dry run preview' },
      },
      async run({ args }) {
        await executePost({
          content: args.content as string | undefined,
          targets: ['linkedin'],
          media: args.media as string | undefined,
          dryRun: Boolean(args['dry-run']),
        });
      },
    }),
    auth: linkedinAuthCommand,
  },
});
