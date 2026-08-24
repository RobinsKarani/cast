import { defineCommand } from 'citty';
import { AuthManager, CastRepository } from '@cast/core';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';

export const mentionsCommand = defineCommand({
  meta: {
    name: 'mentions',
    description: 'Fetch and view recent replies and mentions without a feed',
  },
  args: {
    sync: {
      type: 'boolean',
      description: 'Fetch latest mentions from X',
      default: true,
    },
    limit: {
      type: 'string',
      description: 'Number of mentions to display',
      default: '20',
    },
  },
  async run({ args }) {
    const authManager = new AuthManager();
    const repo = new CastRepository();

    if (args.sync) {
      try {
        const adapter = authManager.getAdapter('x');
        const tokens = await authManager.getValidTokens('x');

        if (adapter.fetchMentions) {
          const mentions = await adapter.fetchMentions(tokens, parseInt(args.limit, 10));
          repo.upsertMentions(mentions);
        }
      } catch (err: any) {
        UI.warn(`Could not sync live mentions: ${err?.message || String(err)}`);
      }
    }

    const mentions = repo.listMentions(parseInt(args.limit, 10));

    UI.heading('Cast Mentions & Direct Feedback');

    if (mentions.length === 0) {
      console.log(pc.dim('No recent mentions found.\n'));
      return;
    }

    for (const m of mentions) {
      console.log(`${pc.cyan(`@${m.author_handle}`)} ${m.created_at ? pc.dim(`(${new Date(m.created_at).toLocaleString()})`) : ''}`);
      console.log(`  ${m.content}`);
      console.log(`  ${pc.dim('Reply URL:')} ${pc.blue(m.source_url)}`);
      console.log();
    }
  },
});
