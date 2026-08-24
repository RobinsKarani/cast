#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty';
import { xCommand } from './commands/x.js';
import { linkedinCommand } from './commands/linkedin.js';
import { bothPostCommand, postCommand } from './commands/post.js';
import { draftCommand } from './commands/draft.js';
import { bookmarksCommand } from './commands/bookmarks.js';
import { mentionsCommand } from './commands/mentions.js';
import { historyCommand } from './commands/history.js';
import { doctorCommand } from './commands/doctor.js';
import { searchCommand } from './commands/search.js';
import { authCommand } from './commands/auth.js';
import { UI } from './ui/formatters.js';
import pc from 'picocolors';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const xKnownSubcommands = new Set(['post', 'bookmarks', 'mentions', 'search', 'auth', '--help', '-h']);
const linkedinKnownSubcommands = new Set(['post', 'auth', '--help', '-h']);

const knownSubcommands = new Set([
  'x',
  'l',
  'linkedin',
  'both',
  'draft',
  'history',
  'doctor',
  'post',
  'auth',
  'bookmarks',
  'mentions',
  'search',
  '--help',
  '-h',
  'help',
  '--version',
  '-v',
  'version',
]);

// Map flag shorthands and direct strings to proper tree commands
const userArgs = process.argv.slice(2);
if (userArgs.length > 0) {
  let first = userArgs[0];
  if (first === '-x' || first === '--x') {
    process.argv[2] = 'x';
    first = 'x';
  } else if (first === '-l' || first === '--l' || first === '--linkedin' || first === '--li') {
    process.argv[2] = 'l';
    first = 'l';
  } else if (first === '-b' || first === '--b' || first === '--both') {
    process.argv[2] = 'both';
    first = 'both';
  }

  if (first === 'x' && userArgs.length > 1 && !xKnownSubcommands.has(userArgs[1])) {
    process.argv.splice(3, 0, 'post');
  } else if (first === 'x' && userArgs.length === 2 && userArgs[1] === 'auth') {
    process.argv.splice(4, 0, 'status');
  } else if ((first === 'l' || first === 'linkedin') && userArgs.length > 1 && !linkedinKnownSubcommands.has(userArgs[1])) {
    process.argv.splice(3, 0, 'post');
  } else if ((first === 'l' || first === 'linkedin') && userArgs.length === 2 && userArgs[1] === 'auth') {
    process.argv.splice(4, 0, 'status');
  } else if (!knownSubcommands.has(first)) {
    // If text or file without subcommand, route to post command
    process.argv.splice(2, 0, 'post');
  }
}

const main = defineCommand({
  meta: {
    name: 'cast',
    version: '0.1.0',
    description: 'Use X and LinkedIn via CLI.',
  },
  subCommands: {
    // Platform Command Trees
    x: xCommand,
    l: linkedinCommand,
    linkedin: linkedinCommand,
    both: bothPostCommand,

    // Core Workflows
    draft: draftCommand,
    history: historyCommand,
    doctor: doctorCommand,

    // Backward-compatible Top-Level Aliases
    post: postCommand,
    auth: authCommand,
    bookmarks: bookmarksCommand,
    mentions: mentionsCommand,
    search: searchCommand,
  },
  async run({ rawArgs }) {
    if (rawArgs.length === 0) {
      if (process.stdin.isTTY) {
        UI.banner();
        console.log(pc.bold('Core Command Tree:'));
        console.log(`  ${pc.cyan('1')} ${pc.bold('x')}        All X features (post, bookmarks, mentions, search, auth)`);
        console.log(`  ${pc.cyan('2')} ${pc.bold('l')}        All LinkedIn features (post, auth)`);
        console.log(`  ${pc.cyan('3')} ${pc.bold('both')}     Broadcast to both X & LinkedIn simultaneously`);
        console.log(`  ${pc.cyan('4')} ${pc.bold('draft')}    Markdown drafts & $EDITOR writing vault`);
        console.log(`  ${pc.cyan('5')} ${pc.bold('history')}  Log of published posts & live URLs`);
        console.log(`  ${pc.cyan('6')} ${pc.bold('doctor')}   System & configuration diagnostics`);
        console.log(`  ${pc.cyan('q')} Exit\n`);

        const rl = readline.createInterface({ input, output });
        const action = (await rl.question(pc.bold('Select [1-6 / q]: '))).trim();
        rl.close();

        if (action === '1') {
          process.argv = [process.argv[0], process.argv[1], 'x'];
          await runMain(main);
        } else if (action === '2') {
          process.argv = [process.argv[0], process.argv[1], 'l'];
          await runMain(main);
        } else if (action === '3') {
          process.argv = [process.argv[0], process.argv[1], 'both'];
          await runMain(main);
        } else if (action === '4') {
          process.argv = [process.argv[0], process.argv[1], 'draft', 'list'];
          await runMain(main);
        } else if (action === '5') {
          process.argv = [process.argv[0], process.argv[1], 'history'];
          await runMain(main);
        } else if (action === '6') {
          process.argv = [process.argv[0], process.argv[1], 'doctor'];
          await runMain(main);
        }
      } else {
        UI.banner();
        console.log('Run `cast --help` for available commands.\n');
      }
    }
  },
});

runMain(main);
