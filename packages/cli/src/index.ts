#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty';
import { authCommand } from './commands/auth.js';
import { postCommand } from './commands/post.js';
import { draftCommand } from './commands/draft.js';
import { bookmarksCommand } from './commands/bookmarks.js';
import { mentionsCommand } from './commands/mentions.js';
import { historyCommand } from './commands/history.js';
import { doctorCommand } from './commands/doctor.js';
import { searchCommand } from './commands/search.js';
import { UI } from './ui/formatters.js';

const knownSubcommands = new Set([
  'post',
  'draft',
  'auth',
  'bookmarks',
  'mentions',
  'history',
  'doctor',
  'search',
  '--help',
  '-h',
  'help',
  '--version',
  '-v',
  'version',
]);

// If first CLI arg is not a known subcommand and there are args, default to 'post'
const userArgs = process.argv.slice(2);
if (userArgs.length > 0 && !knownSubcommands.has(userArgs[0])) {
  process.argv.splice(2, 0, 'post');
}

const main = defineCommand({
  meta: {
    name: 'cast',
    version: '0.1.0',
    description: 'An open-source, terminal-first CLI for intentional social media use on X and LinkedIn.',
  },
  subCommands: {
    post: postCommand,
    draft: draftCommand,
    auth: authCommand,
    bookmarks: bookmarksCommand,
    mentions: mentionsCommand,
    history: historyCommand,
    doctor: doctorCommand,
    search: searchCommand,
  },
  run({ rawArgs }) {
    if (rawArgs.length === 0) {
      UI.banner();
      console.log('Run `cast --help` for available commands.\n');
    }
  },
});

runMain(main);
