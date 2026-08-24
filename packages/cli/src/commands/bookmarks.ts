import { defineCommand } from 'citty';
import { AuthManager, CastRepository } from '@cast/core';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';

export const bookmarksSyncCommand = defineCommand({
  meta: {
    name: 'sync',
    description: 'Pull recent bookmarks from X into your local vault',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Maximum bookmarks to fetch (default: 50)',
      default: '50',
    },
  },
  async run({ args }) {
    const authManager = new AuthManager();
    const repo = new CastRepository();

    UI.info('Syncing bookmarks from X...');
    try {
      const adapter = authManager.getAdapter('x');
      const tokens = await authManager.getValidTokens('x');

      if (!adapter.fetchBookmarks) {
        UI.error('X adapter does not support bookmarks.');
        return;
      }

      const bookmarks = await adapter.fetchBookmarks(tokens, parseInt(args.limit, 10));
      const count = repo.upsertBookmarks(bookmarks);

      UI.success(`Synced ${count} bookmarks to local vault!`);
    } catch (err: any) {
      UI.error(`Bookmarks sync failed: ${err?.message || String(err)}`);
    }
  },
});

export const bookmarksListCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List saved bookmarks in local vault',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Number of items to show',
      default: '20',
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const bookmarks = repo.listBookmarks(parseInt(args.limit, 10));

    UI.heading('Cast Bookmarks Vault');

    if (bookmarks.length === 0) {
      console.log(pc.dim('No bookmarks saved. Run `cast bookmarks sync` to pull from X.\n'));
      return;
    }

    for (const b of bookmarks) {
      console.log(`${pc.cyan(b.author_name || b.author_handle)} ${pc.dim(`(@${b.author_handle})`)}`);
      console.log(`  ${b.content}`);
      console.log(`  ${pc.dim('URL:')} ${pc.blue(b.source_url)}`);
      if (b.notes) {
        console.log(`  ${pc.yellow('Notes:')} ${b.notes}`);
      }
      console.log();
    }
  },
});

export const bookmarksSearchCommand = defineCommand({
  meta: {
    name: 'search',
    description: 'Search local bookmark vault offline',
  },
  args: {
    query: {
      type: 'positional',
      description: 'Search query keyword',
      required: true,
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const results = repo.searchBookmarks(args.query);

    UI.heading(`Bookmark Search Results for "${args.query}" (${results.length} found)`);

    if (results.length === 0) {
      console.log(pc.dim('No matching bookmarks found.\n'));
      return;
    }

    for (const b of results) {
      console.log(`${pc.cyan(b.author_name || b.author_handle)} ${pc.dim(`(@${b.author_handle})`)}`);
      console.log(`  ${b.content}`);
      console.log(`  ${pc.dim('URL:')} ${pc.blue(b.source_url)}`);
      console.log();
    }
  },
});

export const bookmarksCommand = defineCommand({
  meta: {
    name: 'bookmarks',
    description: 'Synchronize and search your bookmark vault offline',
  },
  subCommands: {
    sync: bookmarksSyncCommand,
    list: bookmarksListCommand,
    search: bookmarksSearchCommand,
  },
});
