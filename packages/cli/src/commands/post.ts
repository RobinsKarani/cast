import { defineCommand } from 'citty';
import { PublishingOrchestrator, DraftParser } from '@cast/core';
import type { PlatformId, PostPayload } from '@cast/types';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';
import { existsSync, readFileSync } from 'node:fs';

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
    const isDryRun = Boolean(args['dry-run']);
    let rawContent = args.content || '';

    // Check if piped from stdin
    if (!rawContent && !process.stdin.isTTY) {
      try {
        rawContent = await Bun.stdin.text();
      } catch {
        // Fallback
      }
    }

    if (!rawContent.trim()) {
      UI.error('No content provided. Specify text, a file path, or pipe text via stdin.');
      return;
    }

    let textToPost = rawContent.trim();
    const mediaPaths: string[] = [];

    if (args.media) {
      const paths = args.media.split(',').map((s) => s.trim());
      for (const p of paths) {
        if (!existsSync(p)) {
          UI.error(`Media file not found: ${p}`);
          return;
        }
        mediaPaths.push(p);
      }
    }

    // Determine target platform
    let targets: PlatformId[] = [];
    if (args.both) {
      targets = ['x', 'linkedin'];
    } else if (args.x && !args.linkedin) {
      targets = ['x'];
    } else if (args.linkedin && !args.x) {
      targets = ['linkedin'];
    } else if (args.x && args.linkedin) {
      targets = ['x', 'linkedin'];
    }

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

    // Default to both if no flags specified
    if (targets.length === 0) {
      targets = ['x', 'linkedin'];
    }

    // Prepare thread items if needed
    let threadItems: string[] | undefined;
    if (args.thread && targets.includes('x') && textToPost.length > 280) {
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
