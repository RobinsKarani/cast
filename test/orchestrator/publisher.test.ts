import { describe, it, expect } from 'bun:test';
import { PublishingOrchestrator, CastRepository, DbClient } from '@cast/core';

describe('PublishingOrchestrator', () => {
  const repo = new CastRepository(new DbClient(':memory:'));
  const orchestrator = new PublishingOrchestrator({ repository: repo });

  it('should validate single platform payload in dry-run mode', async () => {
    const report = await orchestrator.publish({
      targets: ['x'],
      payload: { text: 'Valid single tweet' },
      dryRun: true,
    });

    expect(report.success).toBe(true);
    expect(report.dryRun).toBe(true);
    expect(report.validationErrors.length).toBe(0);
  });

  it('should detect character limit violations in dry-run mode for X', async () => {
    const longText = 'A'.repeat(290);
    const report = await orchestrator.publish({
      targets: ['x'],
      payload: { text: longText },
      dryRun: true,
    });

    expect(report.success).toBe(false);
    expect(report.validationErrors.length).toBe(1);
    expect(report.validationErrors[0].platform).toBe('x');
    expect(report.validationErrors[0].errors[0]).toContain('exceeds maximum length');
  });

  it('should allow longer text on LinkedIn than X', async () => {
    const mediumText = 'A'.repeat(500); // Exceeds X (280) but within LinkedIn (3000)
    const report = await orchestrator.publish({
      targets: ['linkedin'],
      payload: { text: mediumText },
      dryRun: true,
    });

    expect(report.success).toBe(true);
    expect(report.validationErrors.length).toBe(0);
  });

  it('should validate thread payloads correctly', async () => {
    const report = await orchestrator.publish({
      targets: ['x'],
      payload: {
        text: 'Main thread opener',
        threadItems: ['Tweet 1/2', 'Tweet 2/2'],
      },
      dryRun: true,
    });

    expect(report.success).toBe(true);
  });

  it('should reject empty post text and media', async () => {
    const report = await orchestrator.publish({
      targets: ['x', 'linkedin'],
      payload: { text: '' },
      dryRun: true,
    });

    expect(report.success).toBe(false);
    expect(report.validationErrors.length).toBe(2);
  });
});
