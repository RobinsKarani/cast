import pc from 'picocolors';

export class UI {
  static banner(): void {
    console.log(pc.cyan(`
   ██████╗ █████╗ ███████╗████████╗
  ██╔════╝██╔══██╗██╔════╝╚══██╔══╝
  ██║     ███████║███████╗   ██║   
  ██║     ██╔══██║╚════██║   ██║   
  ╚██████╗██║  ██║███████║   ██║   
   ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   
    ${pc.dim('Intentional Terminal Social Media CLI')}
`));
  }

  static success(msg: string): void {
    console.log(`${pc.green('✔')} ${msg}`);
  }

  static info(msg: string): void {
    console.log(`${pc.blue('ℹ')} ${msg}`);
  }

  static warn(msg: string): void {
    console.log(`${pc.yellow('⚠')} ${msg}`);
  }

  static error(msg: string): void {
    console.error(`${pc.red('✖')} ${pc.red(msg)}`);
  }

  static heading(title: string): void {
    console.log(`\n${pc.bold(pc.underline(title))}\n`);
  }

  static table(headers: string[], rows: string[][]): void {
    if (rows.length === 0) {
      console.log(pc.dim('  (No entries)'));
      return;
    }

    // Calculate column widths
    const colWidths = headers.map((h, i) => {
      const maxRow = Math.max(...rows.map((r) => (r[i] || '').length));
      return Math.max(h.length, maxRow) + 2;
    });

    // Render header
    const headerRow = headers
      .map((h, i) => pc.bold(h.padEnd(colWidths[i])))
      .join(' ');
    console.log(`  ${headerRow}`);
    console.log(`  ${colWidths.map((w) => '─'.repeat(w)).join(' ')}`);

    // Render rows
    for (const row of rows) {
      const formatted = row
        .map((cell, i) => (cell || '').padEnd(colWidths[i]))
        .join(' ');
      console.log(`  ${formatted}`);
    }
    console.log();
  }

  static divider(): void {
    console.log(pc.dim('─'.repeat(60)));
  }
}
