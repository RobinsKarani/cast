import { defineCommand } from 'citty';
import { AuthManager, DbClient } from '@cast/core';
import { UI } from '../ui/formatters.js';
import pc from 'picocolors';

export const doctorCommand = defineCommand({
  meta: {
    name: 'doctor',
    description: 'Diagnose Cast installation, credentials, database, and network connectivity',
  },
  async run() {
    UI.heading('Cast Diagnostics & Health Check');

    // 1. Runtime
    console.log(pc.bold('Runtime Environment:'));
    console.log(`  ${pc.green('✔')} Bun version: ${Bun.version}`);
    console.log(`  ${pc.green('✔')} Platform: ${process.platform} (${process.arch})`);

    // 2. Database
    console.log(`\n${pc.bold('Local Storage & Database:')}`);
    try {
      const dbClient = new DbClient();
      console.log(`  ${pc.green('✔')} SQLite database: ${dbClient.getPath()}`);
      dbClient.close();
    } catch (err: any) {
      console.log(`  ${pc.red('✖')} SQLite initialization error: ${err.message}`);
    }

    // 3. Credentials & Keyring
    console.log(`\n${pc.bold('Authentication Health:')}`);
    const authManager = new AuthManager();
    const status = authManager.getStatus();

    for (const [platform, s] of Object.entries(status)) {
      const name = platform.toUpperCase();
      if (!s.configured) {
        console.log(`  ${pc.yellow('⚠')} ${name}: Not configured (run \`cast auth setup ${platform}\`)`);
      } else if (!s.authenticated) {
        console.log(`  ${pc.yellow('⚠')} ${name}: Configured but not logged in (run \`cast auth login ${platform}\`)`);
      } else {
        console.log(`  ${pc.green('✔')} ${name}: Authenticated as @${s.handle} (Expires: ${s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'N/A'})`);
      }
    }

    // 4. Network Reachability
    console.log(`\n${pc.bold('Network Connectivity:')}`);
    await checkEndpoint('X API (api.x.com)', 'https://api.x.com/2/openapi.json');
    await checkEndpoint('LinkedIn API (api.linkedin.com)', 'https://api.linkedin.com');

    console.log(`\n${pc.green('Diagnostics complete.')}\n`);
  },
});

async function checkEndpoint(name: string, url: string): Promise<void> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
    console.log(`  ${pc.green('✔')} ${name}: Reachable (Status ${res.status})`);
  } catch (err: any) {
    console.log(`  ${pc.yellow('⚠')} ${name}: Reachability check returned: ${err.message}`);
  }
}
