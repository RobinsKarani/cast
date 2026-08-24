import { defineCommand } from 'citty';
import { PublishingOrchestrator, DraftParser } from '@cast/core';
import type { PlatformId, PostPayload } from '@cast/types';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';
import { existsSync, readFileSync } from 'node:fs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export interface PostExecutionOptions {
  content?: string;
  targets?: PlatformId[];
  media?: string;
  thread?: boolean;
  dryRun?: boolean;
}

export async function executePost(opts: PostExecutionOptions): Promise<void> {
  const isDryRun = Boolean(opts.dryRun);
  let rawContent = opts.content || '';

  // Check if piped from stdin
  if (!rawContent && !process.stdin.isTTY) {
    try {
      rawContent = await Bun.stdin.text();
    } catch {
      // Fallback
    }
  }

  // Interactive prompt if content is empty in TTY
  if (!rawContent.trim()) {
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({ input, output });
      const promptLabel = opts.targets && opts.targets.length === 1
        ? `Enter post content for ${opts.targets[0].toUpperCase()}: `
        : 'Enter post content: ';
      rawContent = await rl.question(pc.bold(promptLabel));
      rl.close();
    }
  }

  if (!rawContent.trim()) {
    UI.error('No content provided. Post cancelled.');
    return;
  }

  let textToPost = rawContent.trim();
  const mediaPaths: string[] = [];

  if (opts.media) {
    const paths = opts.media.split(',').map((s) => s.trim());
    for (const p of paths) {
      if (!existsSync(p)) {
        UI.error(`Media file not found: ${p}`);
        return;
      }
      mediaPaths.push(p);
    }
  }

  let targets: PlatformId[] = opts.targets || [];

  // If it's a file path, parse frontmatter
  if (existsSync(textToPost)) {
    const fileContent = readFileSync(textToPost, 'utf8');
    const parsed = DraftParser.parse(fileContent);
    textToPost = parsed.body;

    if (targets.length === 0) {
      if (parsed.target === 'both') {
        targets = ['x', 'linkedin'];
      } else {
        targets = [parsed.target];
      }
    }

    if (parsed.mediaPaths) {
      for (const p of parsed.mediaPaths) {
        if (!existsSync(p)) {
          UI.error(`Draft media file not found: ${p}`);
          return;
        }
        mediaPaths.push(p);
      }
    }
  }

  // If targets are still unspecified, NEVER assume both silently!
  if (targets.length === 0) {
    if (process.stdin.isTTY) {
      console.log(pc.bold('\nWhere would you like to publish this post?'));
      console.log(`  ${pc.cyan('1')} X only`);
      console.log(`  ${pc.cyan('2')} LinkedIn only`);
      console.log(`  ${pc.cyan('3')} Both platforms (X & LinkedIn)`);
      console.log(`  ${pc.cyan('4')} Cancel\n`);

      const rl = readline.createInterface({ input, output });
      const choice = (await rl.question(pc.bold('Select destination [1/2/3/4]: '))).trim();
      rl.close();

      if (choice === '1' || choice.toLowerCase() === 'x') {
        targets = ['x'];
      } else if (choice === '2' || choice.toLowerCase() === 'l' || choice.toLowerCase() === 'linkedin') {
        targets = ['linkedin'];
      } else if (choice === '3' || choice.toLowerCase() === 'b' || choice.toLowerCase() === 'both') {
        targets = ['x', 'linkedin'];
      } else {
        console.log(pc.dim('Post cancelled.\n'));
        return;
      }
    } else {
      UI.error('No destination specified. Please specify -x (X), -l (LinkedIn), or -b (Both).');
      return;
    }
  }

  // Prepare thread items if needed
  let threadItems: string[] | undefined;
  if (opts.thread && targets.includes('x') && textToPost.length > 280) {
    threadItems = splitIntoThread(textToPost, 270);
  }

  const payload: PostPayload = {
    text: textToPost,
    mediaPaths: mediaPaths.length > 0 ? mediaPaths : undefined,
    threadItems,
  };

  if (isDryRun) {
    UI.heading('Cast Dry Run: Preview');
    console.log(pc.bold('Targets:'), targets.map((t) => t.toUpperCase()).join(', '));
    console.log(pc.bold('Character count:'), textToPost.length);
    if (mediaPaths.length > 0) {
      console.log(pc.bold('Media attachments:'), mediaPaths.join(', '));
    }
    if (threadItems) {
      console.log(pc.bold(`Thread chunks (${threadItems.length} tweets):`));
      threadItems.forEach((chunk, i) => {
        console.log(`\n  ${pc.cyan(`[Tweet ${i + 1}/${threadItems!.length}]`)}`);
        console.log(`  ${chunk}`);
      });
    } else {
      console.log(`\n${pc.dim('--- Post Content ---')}\n${textToPost}\n${pc.dim('--------------------')}`);
    }
    console.log();
  }

  const orchestrator = new PublishingOrchestrator();
  const report = await orchestrator.publish({
    targets,
    payload,
    dryRun: isDryRun,
  });

  if (!report.success) {
    if (report.validationErrors.length > 0) {
      UI.error('Validation errors prevented publishing:');
      for (const v of report.validationErrors) {
        console.log(`  ${pc.bold(v.platform.toUpperCase())}: ${v.errors.join('; ')}`);
      }
      return;
    }

    UI.warn('Publishing completed with partial errors:');
    for (const res of report.results) {
      if (res.success) {
        UI.success(`${res.platform.toUpperCase()}: Published successfully (${res.externalUrl || res.externalPostId})`);
      } else {
        UI.error(`${res.platform.toUpperCase()}: Failed - ${res.error}`);
      }
    }
    return;
  }

  if (isDryRun) {
    UI.success('Dry run completed! Payload is valid for all target platforms.');
    return;
  }

  UI.success('Published successfully!');
  for (const res of report.results) {
    console.log(`  ${pc.green('✔')} ${pc.bold(res.platform.toUpperCase())}: ${res.externalUrl || res.externalPostId}`);
  }
}

export const postCommand = defineCommand({
  meta: {
    name: 'post',
    description: 'Publish content to X, LinkedIn, or both',
  },
  args: {
    content: {
      type: 'positional',
      description: 'Text to post or path to a markdown file (or read from stdin)',
      required: false,
    },
    x: {
      type: 'boolean',
      alias: 'x',
      description: 'Post to X only',
      default: false,
    },
    linkedin: {
      type: 'boolean',
      alias: 'l',
      description: 'Post to LinkedIn only',
      default: false,
    },
    both: {
      type: 'boolean',
      alias: 'b',
      description: 'Post to both X and LinkedIn',
      default: false,
    },
    media: {
      type: 'string',
      alias: 'm',
      description: 'Comma-separated paths to media images',
    },
    thread: {
      type: 'boolean',
      alias: 't',
      description: 'Split long text into an X thread',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      alias: 'd',
      description: 'Validate and preview post without sending',
      default: false,
    },
  },
  async run({ args }) {
    let targets: PlatformId[] | undefined;
    if (args.both) {
      targets = ['x', 'linkedin'];
    } else if (args.x && !args.linkedin) {
      targets = ['x'];
    } else if (args.linkedin && !args.x) {
      targets = ['linkedin'];
    } else if (args.x && args.linkedin) {
      targets = ['x', 'linkedin'];
    }

    await executePost({
      content: args.content,
      targets,
      media: args.media,
      thread: Boolean(args.thread),
      dryRun: Boolean(args['dry-run']),
    });
  },
});

export const xPostCommand = defineCommand({
  meta: {
    name: 'x',
    description: 'Quickly publish directly to X (Twitter)',
  },
  args: {
    content: {
      type: 'positional',
      description: 'Text to post or file path (or read from stdin)',
      required: false,
    },
    media: {
      type: 'string',
      alias: 'm',
      description: 'Comma-separated paths to media images (up to 4)',
    },
    thread: {
      type: 'boolean',
      alias: 't',
      description: 'Split long text into an X thread',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      alias: 'd',
      description: 'Validate and preview post without sending',
      default: false,
    },
  },
  async run({ args }) {
    await executePost({
      content: args.content,
      targets: ['x'],
      media: args.media,
      thread: Boolean(args.thread),
      dryRun: Boolean(args['dry-run']),
    });
  },
});

export const linkedinPostCommand = defineCommand({
  meta: {
    name: 'l',
    description: 'Quickly publish directly to LinkedIn',
  },
  args: {
    content: {
      type: 'positional',
      description: 'Text to post or file path (or read from stdin)',
      required: false,
    },
    media: {
      type: 'string',
      alias: 'm',
      description: 'Path to media image',
    },
    'dry-run': {
      type: 'boolean',
      alias: 'd',
      description: 'Validate and preview post without sending',
      default: false,
    },
  },
  async run({ args }) {
    await executePost({
      content: args.content,
      targets: ['linkedin'],
      media: args.media,
      dryRun: Boolean(args['dry-run']),
    });
  },
});

export const bothPostCommand = defineCommand({
  meta: {
    name: 'both',
    description: 'Explicitly publish to both X and LinkedIn simultaneously',
  },
  args: {
    content: {
      type: 'positional',
      description: 'Text to post or file path (or read from stdin)',
      required: false,
    },
    media: {
      type: 'string',
      alias: 'm',
      description: 'Comma-separated paths to media images',
    },
    thread: {
      type: 'boolean',
      alias: 't',
      description: 'Split long text into an X thread',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      alias: 'd',
      description: 'Validate and preview post without sending',
      default: false,
    },
  },
  async run({ args }) {
    await executePost({
      content: args.content,
      targets: ['x', 'linkedin'],
      media: args.media,
      thread: Boolean(args.thread),
      dryRun: Boolean(args['dry-run']),
    });
  },
});

function splitIntoThread(text: string, maxChunkLen: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChunkLen) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);

  return chunks.map((c, i) => `${c} (${i + 1}/${chunks.length})`);
}
