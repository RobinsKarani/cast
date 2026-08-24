import { defineCommand } from 'citty';
import { CastRepository } from '@cast/core';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';

export const historyCommand = defineCommand({
  meta: {
    name: 'history',
    description: 'View log of posts published through Cast',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Number of posts to display',
      default: '20',
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const posts = repo.listPosts(parseInt(args.limit, 10));

    UI.heading('Cast Published Post History');

    if (posts.length === 0) {
      console.log(pc.dim('No published posts found. Publish with `cast post`.\n'));
      return;
    }

    for (const p of posts) {
      console.log(`${pc.bold(`Post #${p.id}`)} ${pc.dim(`(${new Date(p.created_at).toLocaleString()})`)}`);
      console.log(`  ${p.content}`);
      if (p.targets && p.targets.length > 0) {
        console.log(`  ${pc.dim('Platforms:')}`);
        for (const t of p.targets) {
          const statusIcon = t.status === 'success' ? pc.green('✔') : pc.red('✖');
          console.log(`    ${statusIcon} ${t.platform.toUpperCase()}: ${t.external_url || t.external_post_id || t.error_message}`);
        }
      }
      console.log();
    }
  },
});
