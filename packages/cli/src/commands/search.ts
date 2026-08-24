import { defineCommand } from 'citty';
import { AuthManager, CastRepository } from '@cast/core';
import type { XAdapter } from '@cast/adapters';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';

export const searchCommand = defineCommand({
  meta: {
    name: 'search',
    description: 'Search X or local bookmarks for specific information without a feed',
  },
  args: {
    query: {
      type: 'positional',
      description: 'Search keyword query',
      required: true,
    },
    local: {
      type: 'boolean',
      description: 'Search only local bookmark vault',
      default: false,
    },
    limit: {
      type: 'string',
      description: 'Maximum results to display (default: 10)',
      default: '10',
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const query = args.query.trim();

    if (args.local) {
      const localResults = repo.searchBookmarks(query, parseInt(args.limit, 10));
      UI.heading(`Local Bookmark Search for "${query}" (${localResults.length} results)`);

      if (localResults.length === 0) {
        console.log(pc.dim('No local bookmarks found matching query.\n'));
        return;
      }

      for (const item of localResults) {
        console.log(`${pc.cyan(item.author_name || item.author_handle)} ${pc.dim(`(@${item.author_handle})`)}`);
        console.log(`  ${item.content}`);
        console.log(`  ${pc.dim('URL:')} ${pc.blue(item.source_url)}`);
        console.log();
      }
      return;
    }

    // Live X Search
    const authManager = new AuthManager();
    UI.info(`Searching X for "${query}"...`);

    try {
      const adapter = authManager.getAdapter('x') as XAdapter;
      const tokens = await authManager.getValidTokens('x');

      const results = await adapter.searchRecent(tokens, query, parseInt(args.limit, 10));
      UI.heading(`X Search Results for "${query}" (${results.length} results)`);

      if (results.length === 0) {
        console.log(pc.dim('No recent posts found matching query.\n'));
        return;
      }

      for (const item of results) {
        console.log(`${pc.cyan(item.authorName || item.authorHandle)} ${pc.dim(`(@${item.authorHandle})`)} ${pc.dim(`· ${item.createdAt.toLocaleDateString()}`)}`);
        console.log(`  ${item.text}`);
        console.log(`  ${pc.dim('URL:')} ${pc.blue(item.url)}`);
        console.log();
      }
    } catch (err: any) {
      UI.warn(`Live X search failed: ${err?.message || String(err)}`);
      console.log(pc.dim('Falling back to searching local offline bookmarks...\n'));
      const localResults = repo.searchBookmarks(query, parseInt(args.limit, 10));
      if (localResults.length > 0) {
        UI.heading(`Local Bookmark Matches (${localResults.length})`);
        for (const item of localResults) {
          console.log(`${pc.cyan(item.author_name || item.author_handle)} ${pc.dim(`(@${item.author_handle})`)}`);
          console.log(`  ${item.content}`);
          console.log(`  ${pc.dim('URL:')} ${pc.blue(item.source_url)}`);
          console.log();
        }
      }
    }
  },
});
