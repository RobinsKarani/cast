import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from 'node:crypto';
import type {
  PlatformId,
  StoredCredentialsFile,
  StoredPlatformAuth,
  AppCredentials,
  AuthTokens,
} from '@cast/types';

export class SecureCredentialStore {
  private readonly configDir: string;
  private readonly credPath: string;

  constructor(customDir?: string) {
    if (customDir) {
      this.configDir = customDir;
    } else if (process.platform === 'win32' && process.env.APPDATA) {
      this.configDir = join(process.env.APPDATA, 'cast');
    } else {
      this.configDir = join(homedir(), '.config', 'cast');
    }
    this.credPath = join(this.configDir, 'credentials.enc');
  }

  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  private getMasterKey(salt: Buffer): Buffer {
    // Derive key from user home path and machine attributes across Linux, macOS, and Windows
    const username = process.env.USER || process.env.USERNAME || 'cast-user';
    const seed = `cast-secure-vault:${homedir()}:${username}`;
    return pbkdf2Sync(seed, salt, 100000, 32, 'sha256');
  }

  private encrypt(data: string): Buffer {
    const salt = randomBytes(16);
    const iv = randomBytes(12); // GCM standard 96-bit IV
    const key = this.getMasterKey(salt);

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Payload: [salt:16][iv:12][tag:16][ciphertext:N]
    return Buffer.concat([salt, iv, tag, encrypted]);
  }

  private decrypt(buffer: Buffer): string {
    if (buffer.length < 44) {
      throw new Error('Corrupted credentials file.');
    }

    const salt = buffer.subarray(0, 16);
    const iv = buffer.subarray(16, 28);
    const tag = buffer.subarray(28, 44);
    const ciphertext = buffer.subarray(44);

    const key = this.getMasterKey(salt);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  load(): StoredCredentialsFile {
    if (!existsSync(this.credPath)) {
      return {
        version: 1,
        platforms: {},
      };
    }

    try {
      const buffer = readFileSync(this.credPath);
      const decryptedJson = this.decrypt(buffer);
      return JSON.parse(decryptedJson) as StoredCredentialsFile;
    } catch {
      return {
        version: 1,
        platforms: {},
      };
    }
  }

  save(data: StoredCredentialsFile): void {
    this.ensureConfigDir();
    const jsonStr = JSON.stringify(data, null, 2);
    const encryptedBuffer = this.encrypt(jsonStr);

    writeFileSync(this.credPath, encryptedBuffer, { mode: 0o600 });
    try {
      chmodSync(this.credPath, 0o600);
    } catch {
      // Ignore chmod errors on systems that don't support POSIX modes
    }
  }

  getPlatformAuth(platform: PlatformId): StoredPlatformAuth | undefined {
    const store = this.load();
    return store.platforms[platform];
  }

  saveAppCredentials(platform: PlatformId, credentials: AppCredentials): void {
    const store = this.load();
    const existing = store.platforms[platform] || {
      platform,
      updatedAt: new Date().toISOString(),
    };

    store.platforms[platform] = {
      ...existing,
      credentials,
      updatedAt: new Date().toISOString(),
    };

    this.save(store);
  }

  saveTokens(
    platform: PlatformId,
    tokens: AuthTokens,
    userInfo?: { platformUserId?: string; accountHandle?: string; displayName?: string }
  ): void {
    const store = this.load();
    const existing = store.platforms[platform] || {
      platform,
      updatedAt: new Date().toISOString(),
    };

    store.platforms[platform] = {
      ...existing,
      tokens,
      platformUserId: userInfo?.platformUserId || existing.platformUserId,
      accountHandle: userInfo?.accountHandle || existing.accountHandle,
      displayName: userInfo?.displayName || existing.displayName,
      updatedAt: new Date().toISOString(),
    };

    this.save(store);
  }

  clearPlatform(platform: PlatformId): void {
    const store = this.load();
    delete store.platforms[platform];
    this.save(store);
  }
}
