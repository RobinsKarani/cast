import type {
  PlatformId,
  PostPayload,
  PlatformPostResult,
} from '@cast/types';
import { AuthManager } from '../auth/manager.js';
import { CastRepository } from '../db/repository.js';

export interface PublishOptions {
  targets: PlatformId[];
  payload: PostPayload;
  dryRun?: boolean;
  draftId?: number;
}

export interface PublishReport {
  readonly success: boolean;
  readonly dryRun: boolean;
  readonly results: PlatformPostResult[];
  readonly validationErrors: Array<{ platform: PlatformId; errors: string[] }>;
  readonly recordedPostId?: number;
}

export class PublishingOrchestrator {
  private readonly authManager: AuthManager;
  private readonly repository: CastRepository;

  constructor(
    authManagerOrOptions?: AuthManager | { authManager?: AuthManager; repository?: CastRepository },
    repository?: CastRepository
  ) {
    if (authManagerOrOptions && ('authManager' in authManagerOrOptions || 'repository' in authManagerOrOptions)) {
      const opts = authManagerOrOptions as { authManager?: AuthManager; repository?: CastRepository };
      this.authManager = opts.authManager || new AuthManager();
      this.repository = opts.repository || new CastRepository();
    } else {
      this.authManager = (authManagerOrOptions as AuthManager) || new AuthManager();
      this.repository = repository || new CastRepository();
    }
  }

  async publish(options: PublishOptions): Promise<PublishReport> {
    const { targets, payload, dryRun, draftId } = options;
    const validationErrors: Array<{ platform: PlatformId; errors: string[] }> = [];

    // Step 1: Validate payload against all targets
    for (const target of targets) {
      const adapter = this.authManager.getAdapter(target);
      const validation = adapter.validatePayload(payload);
      if (!validation.valid) {
        validationErrors.push({
          platform: target,
          errors: validation.errors,
        });
      }
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        dryRun: Boolean(dryRun),
        results: [],
        validationErrors,
      };
    }

    // Step 2: Handle dry-run
    if (dryRun) {
      const simulatedResults: PlatformPostResult[] = targets.map((t) => ({
        success: true,
        platform: t,
        externalPostId: 'dry-run-preview-id',
        externalUrl: `https://${t}.com/preview`,
        publishedAt: new Date(),
      }));

      return {
        success: true,
        dryRun: true,
        results: simulatedResults,
        validationErrors: [],
      };
    }

    // Step 3: Execute live publications
    const executionPromises = targets.map(async (target): Promise<PlatformPostResult> => {
      try {
        const adapter = this.authManager.getAdapter(target);
        const tokens = await this.authManager.getValidTokens(target);
        return await adapter.publishPost(payload, tokens);
      } catch (err: any) {
        return {
          success: false,
          platform: target,
          error: err?.message || String(err),
          publishedAt: new Date(),
        };
      }
    });

    const results = await Promise.all(executionPromises);

    // Step 4: Record in local repository
    const recordedPostId = this.repository.recordPublishedPost({
      content: payload.text,
      mediaPaths: payload.mediaPaths,
      draftId,
      results,
    });

    const allSucceeded = results.every((r) => r.success);

    return {
      success: allSucceeded,
      dryRun: false,
      results,
      validationErrors: [],
      recordedPostId,
    };
  }
}
