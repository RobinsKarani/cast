import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class EditorLauncher {
  /**
   * Opens content in the system $EDITOR (or nano/vim fallback) and returns the edited content.
   */
  static openInEditor(initialContent: string, filenameSuffix = 'draft.md'): string {
    const editor = process.env.VISUAL || process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'nano');
    const tempFile = join(tmpdir(), `cast-${Date.now()}-${filenameSuffix}`);

    writeFileSync(tempFile, initialContent, 'utf8');

    try {
      const parts = editor.split(' ');
      const command = parts[0];
      const args = [...parts.slice(1), tempFile];

      const result = spawnSync(command, args, {
        stdio: 'inherit',
      });

      if (result.error) {
        throw new Error(`Failed to launch editor (${editor}): ${result.error.message}`);
      }

      return readFileSync(tempFile, 'utf8');
    } finally {
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore deletion error
      }
    }
  }
}
