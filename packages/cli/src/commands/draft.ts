import { defineCommand } from 'citty';
import { CastRepository, DraftParser, EditorLauncher, PublishingOrchestrator } from '@cast/core';
import type { PlatformId, PostPayload } from '@cast/types';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';

export const draftNewCommand = defineCommand({
  meta: {
    name: 'new',
    description: 'Create a new markdown draft in your $EDITOR',
  },
  args: {
    title: {
      type: 'positional',
      description: 'Optional draft title',
      required: false,
    },
  },
  async run({ args }) {
    const template = DraftParser.serialize({
      title: args.title || 'Untitled Draft',
      target: 'both',
      mediaPaths: [],
      tags: [],
      body: '\nWrite your post here...',
    });

    const editedContent = EditorLauncher.openInEditor(template, 'new-draft.md');
    const parsed = DraftParser.parse(editedContent);

    if (!parsed.body || parsed.body === 'Write your post here...') {
      UI.warn('Draft discarded (empty body).');
      return;
    }

    const repo = new CastRepository();
    const draft = repo.createDraft({
      title: parsed.title || args.title,
      targetPlatform: parsed.target,
      rawContent: editedContent,
      mediaPaths: parsed.mediaPaths,
    });

    UI.success(`Draft saved [ID: ${draft.id}]: "${draft.title || 'Untitled'}"`);
    console.log(`\nTo publish: ${pc.cyan(`cast draft publish ${draft.id}`)}\n`);
  },
});

export const draftListCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List all local drafts',
  },
  args: {
    all: {
      type: 'boolean',
      description: 'Show all drafts including published and archived',
      default: false,
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const drafts = repo.listDrafts(args.all ? 'all' : 'draft');

    UI.heading('Cast Drafts');

    const headers = ['ID', 'Title', 'Target', 'Status', 'Updated'];
    const rows = drafts.map((d) => [
      d.id.toString(),
      d.title || pc.dim('Untitled'),
      d.target_platform.toUpperCase(),
      d.status === 'published' ? pc.green('published') : pc.yellow(d.status),
      new Date(d.updated_at).toLocaleDateString(),
    ]);

    UI.table(headers, rows);
  },
});

export const draftEditCommand = defineCommand({
  meta: {
    name: 'edit',
    description: 'Edit an existing draft in your $EDITOR',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Draft ID',
      required: true,
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const draftId = parseInt(args.id, 10);
    const draft = repo.getDraft(draftId);

    if (!draft) {
      UI.error(`Draft #${args.id} not found.`);
      return;
    }

    const editedContent = EditorLauncher.openInEditor(draft.raw_content, `draft-${draft.id}.md`);
    const parsed = DraftParser.parse(editedContent);

    repo.updateDraft(draftId, {
      title: parsed.title,
      raw_content: editedContent,
      target_platform: parsed.target,
      media_paths: parsed.mediaPaths,
    });

    UI.success(`Draft #${draftId} updated.`);
  },
});

export const draftShowCommand = defineCommand({
  meta: {
    name: 'show',
    description: 'Display raw contents of a draft',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Draft ID',
      required: true,
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const draft = repo.getDraft(parseInt(args.id, 10));
    if (!draft) {
      UI.error(`Draft #${args.id} not found.`);
      return;
    }

    console.log(draft.raw_content);
  },
});

export const draftPublishCommand = defineCommand({
  meta: {
    name: 'publish',
    description: 'Publish a draft to its targeted platforms',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Draft ID to publish',
      required: true,
    },
    dryRun: {
      type: 'boolean',
      description: 'Dry run validation without posting',
      default: false,
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const draftId = parseInt(args.id, 10);
    const draft = repo.getDraft(draftId);

    if (!draft) {
      UI.error(`Draft #${args.id} not found.`);
      return;
    }

    const parsed = DraftParser.parse(draft.raw_content);
    let targets: PlatformId[] = [];
    if (parsed.target === 'both') {
      targets = ['x', 'linkedin'];
    } else {
      targets = [parsed.target];
    }

    const payload: PostPayload = {
      text: parsed.body,
      mediaPaths: parsed.mediaPaths,
    };

    const orchestrator = new PublishingOrchestrator();
    const report = await orchestrator.publish({
      targets,
      payload,
      dryRun: args.dryRun,
      draftId,
    });

    if (!report.success) {
      UI.error('Draft publishing failed:');
      for (const res of report.results) {
        if (!res.success) {
          console.log(`  ${pc.bold(res.platform.toUpperCase())}: ${res.error}`);
        }
      }
      return;
    }

    if (args.dryRun) {
      UI.success('Dry run passed! Draft is ready for publication.');
      return;
    }

    UI.success(`Draft #${draftId} successfully published!`);
    for (const res of report.results) {
      console.log(`  ${pc.green('✔')} ${pc.bold(res.platform.toUpperCase())}: ${res.externalUrl || res.externalPostId}`);
    }
  },
});

export const draftDeleteCommand = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a draft',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Draft ID',
      required: true,
    },
  },
  async run({ args }) {
    const repo = new CastRepository();
    const success = repo.deleteDraft(parseInt(args.id, 10));
    if (success) {
      UI.success(`Draft #${args.id} deleted.`);
    } else {
      UI.error(`Draft #${args.id} not found.`);
    }
  },
});

export const draftCommand = defineCommand({
  meta: {
    name: 'draft',
    description: 'Create, manage, and publish local markdown drafts',
  },
  subCommands: {
    new: draftNewCommand,
    list: draftListCommand,
    edit: draftEditCommand,
    show: draftShowCommand,
    publish: draftPublishCommand,
    delete: draftDeleteCommand,
  },
});
