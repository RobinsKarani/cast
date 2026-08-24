import { describe, it, expect } from 'bun:test';
import { CastRepository, DbClient } from '@cast/core';

describe('CastRepository (In-Memory SQLite)', () => {
  const dbClient = new DbClient(':memory:');
  const repo = new CastRepository(dbClient);

  it('should create and retrieve drafts', () => {
    const draft = repo.createDraft({
      title: 'Release Announcement',
      targetPlatform: 'both',
      rawContent: 'Cast v0.1 is here!',
      mediaPaths: ['/tmp/image.png'],
    });

    expect(draft.id).toBeGreaterThan(0);
    expect(draft.title).toBe('Release Announcement');
    expect(draft.target_platform).toBe('both');
    expect(draft.media_paths).toEqual(['/tmp/image.png']);

    const retrieved = repo.getDraft(draft.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.raw_content).toBe('Cast v0.1 is here!');
  });

  it('should update and list drafts', () => {
    const draft = repo.createDraft({
      title: 'Draft 2',
      targetPlatform: 'x',
      rawContent: 'Work in progress',
    });

    const updated = repo.updateDraft(draft.id, {
      raw_content: 'Updated content',
      status: 'published',
    });
    expect(updated).toBe(true);

    const check = repo.getDraft(draft.id);
    expect(check?.raw_content).toBe('Updated content');
    expect(check?.status).toBe('published');
  });

  it('should record published posts and query history', () => {
    const postId = repo.recordPublishedPost({
      content: 'Hello World',
      results: [
        {
          success: true,
          platform: 'x',
          externalPostId: 'tweet-123',
          externalUrl: 'https://x.com/status/123',
          publishedAt: new Date(),
        },
        {
          success: true,
          platform: 'linkedin',
          externalPostId: 'urn:li:share:456',
          externalUrl: 'https://linkedin.com/feed/update/456',
          publishedAt: new Date(),
        },
      ],
    });

    expect(postId).toBeGreaterThan(0);

    const history = repo.listPosts();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].targets.length).toBe(2);
  });

  it('should upsert and search bookmarks', () => {
    repo.upsertBookmarks([
      {
        id: 'x:999',
        platform: 'x',
        externalId: '999',
        authorHandle: 'antigravity',
        authorName: 'Antigravity AI',
        text: 'Autonomous AI coding agents in production environments',
        url: 'https://x.com/antigravity/status/999',
        createdAt: new Date(),
      },
    ]);

    const results = repo.searchBookmarks('Autonomous');
    expect(results.length).toBe(1);
    expect(results[0].author_handle).toBe('antigravity');
  });
});
