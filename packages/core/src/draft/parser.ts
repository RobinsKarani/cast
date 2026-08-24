import type { DraftTarget } from '@cast/types';

export interface ParsedDraftContent {
  title?: string;
  target: DraftTarget;
  mediaPaths?: string[];
  tags?: string[];
  body: string;
}

export class DraftParser {
  /**
   * Parses markdown frontmatter and content body.
   */
  static parse(raw: string): ParsedDraftContent {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('---')) {
      return {
        target: 'both',
        body: trimmed,
      };
    }

    const endOfFrontmatter = trimmed.indexOf('\n---', 3);
    if (endOfFrontmatter === -1) {
      return {
        target: 'both',
        body: trimmed,
      };
    }

    const frontmatterText = trimmed.slice(3, endOfFrontmatter).trim();
    const body = trimmed.slice(endOfFrontmatter + 4).trim();

    let target: DraftTarget = 'both';
    let title: string | undefined;
    const mediaPaths: string[] = [];
    const tags: string[] = [];

    const lines = frontmatterText.split('\n');
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();

      if (key === 'target') {
        const cleaned = val.replace(/['"]/g, '').toLowerCase();
        if (cleaned === 'x' || cleaned === 'linkedin' || cleaned === 'both') {
          target = cleaned as DraftTarget;
        }
      } else if (key === 'title') {
        title = val.replace(/['"]/g, '');
      } else if (key === 'media') {
        // Parse array format e.g. [path1, path2] or comma separated
        const cleaned = val.replace(/[\[\]'"]/g, '');
        const items = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
        mediaPaths.push(...items);
      } else if (key === 'tags') {
        const cleaned = val.replace(/[\[\]'"]/g, '');
        const items = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
        tags.push(...items);
      }
    }

    return {
      title,
      target,
      mediaPaths: mediaPaths.length > 0 ? mediaPaths : undefined,
      tags: tags.length > 0 ? tags : undefined,
      body,
    };
  }

  /**
   * Generates formatted markdown draft content.
   */
  static serialize(draft: {
    title?: string;
    target?: DraftTarget;
    mediaPaths?: string[];
    tags?: string[];
    body: string;
  }): string {
    const lines = ['---'];
    if (draft.title) lines.push(`title: "${draft.title}"`);
    lines.push(`target: ${draft.target || 'both'}`);
    if (draft.mediaPaths && draft.mediaPaths.length > 0) {
      lines.push(`media: [${draft.mediaPaths.map((p) => `"${p}"`).join(', ')}]`);
    }
    if (draft.tags && draft.tags.length > 0) {
      lines.push(`tags: [${draft.tags.map((t) => `"${t}"`).join(', ')}]`);
    }
    lines.push('---', '');
    lines.push(draft.body);
    return lines.join('\n');
  }
}
