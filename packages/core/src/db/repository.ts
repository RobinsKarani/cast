import type {
  DbDraft,
  DbPost,
  DbPostTarget,
  DbBookmark,
  DbMention,
  DraftTarget,
  PlatformId,
  PlatformPostResult,
  BookmarkItem,
  MentionItem,
} from '@cast/types';
import { DbClient } from './client.js';

export class CastRepository {
  private readonly client: DbClient;

  constructor(client?: DbClient) {
    this.client = client || new DbClient();
  }

  // --- Drafts ---
  createDraft(params: {
    title?: string;
    targetPlatform: DraftTarget;
    rawContent: string;
    mediaPaths?: string[];
  }): DbDraft {
    const db = this.client.getDatabase();
    const mediaPathsJson = params.mediaPaths ? JSON.stringify(params.mediaPaths) : null;

    const query = db.query(`
      INSERT INTO drafts (title, target_platform, raw_content, media_paths)
      VALUES ($title, $target_platform, $raw_content, $media_paths)
      RETURNING *
    `);

    const row = query.get({
      $title: params.title || null,
      $target_platform: params.targetPlatform,
      $raw_content: params.rawContent,
      $media_paths: mediaPathsJson,
    }) as any;

    return {
      ...row,
      media_paths: row.media_paths ? JSON.parse(row.media_paths) : undefined,
    };
  }

  getDraft(id: number): DbDraft | null {
    const db = this.client.getDatabase();
    const row = db.query(`SELECT * FROM drafts WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return {
      ...row,
      media_paths: row.media_paths ? JSON.parse(row.media_paths) : undefined,
    };
  }

  listDrafts(status: 'draft' | 'published' | 'all' = 'draft'): DbDraft[] {
    const db = this.client.getDatabase();
    let rows: any[];
    if (status === 'all') {
      rows = db.query(`SELECT * FROM drafts ORDER BY updated_at DESC`).all();
    } else {
      rows = db.query(`SELECT * FROM drafts WHERE status = ? ORDER BY updated_at DESC`).all(status);
    }

    return rows.map((r) => ({
      ...r,
      media_paths: r.media_paths ? JSON.parse(r.media_paths) : undefined,
    }));
  }

  updateDraft(id: number, updates: Partial<Pick<DbDraft, 'title' | 'raw_content' | 'target_platform' | 'media_paths' | 'status'>>): boolean {
    const db = this.client.getDatabase();
    const current = this.getDraft(id);
    if (!current) return false;

    const mediaPathsJson = updates.mediaPaths !== undefined
      ? JSON.stringify(updates.mediaPaths)
      : (current.media_paths ? JSON.stringify(current.media_paths) : null);

    db.query(`
      UPDATE drafts
      SET title = $title,
          raw_content = $raw_content,
          target_platform = $target_platform,
          media_paths = $media_paths,
          status = $status,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $id
    `).run({
      $id: id,
      $title: updates.title !== undefined ? updates.title : current.title || null,
      $raw_content: updates.raw_content !== undefined ? updates.raw_content : current.raw_content,
      $target_platform: updates.target_platform !== undefined ? updates.target_platform : current.target_platform,
      $media_paths: mediaPathsJson,
      $status: updates.status !== undefined ? updates.status : current.status,
    });

    return true;
  }

  deleteDraft(id: number): boolean {
    const db = this.client.getDatabase();
    const res = db.query(`DELETE FROM drafts WHERE id = ?`).run(id);
    return res.changes > 0;
  }

  // --- Posts & History ---
  recordPublishedPost(params: {
    content: string;
    mediaPaths?: string[];
    draftId?: number;
    results: PlatformPostResult[];
  }): number {
    const db = this.client.getDatabase();
    const mediaPathsJson = params.mediaPaths ? JSON.stringify(params.mediaPaths) : null;

    const postInsert = db.query(`
      INSERT INTO posts (draft_id, content, media_paths)
      VALUES ($draft_id, $content, $media_paths)
      RETURNING id
    `).get({
      $draft_id: params.draftId || null,
      $content: params.content,
      $media_paths: mediaPathsJson,
    }) as { id: number };

    const postId = postInsert.id;

    const targetInsert = db.query(`
      INSERT INTO post_targets (post_id, platform, external_post_id, external_url, status, error_message, published_at)
      VALUES ($post_id, $platform, $external_post_id, $external_url, $status, $error_message, $published_at)
    `);

    for (const res of params.results) {
      targetInsert.run({
        $post_id: postId,
        $platform: res.platform,
        $external_post_id: res.externalPostId || null,
        $external_url: res.externalUrl || null,
        $status: res.success ? 'success' : 'failed',
        $error_message: res.error || null,
        $published_at: res.publishedAt.toISOString(),
      });
    }

    if (params.draftId) {
      this.updateDraft(params.draftId, { status: 'published' });
    }

    return postId;
  }

  listPosts(limit = 20): Array<DbPost & { targets: DbPostTarget[] }> {
    const db = this.client.getDatabase();
    const posts = db.query(`SELECT * FROM posts ORDER BY created_at DESC LIMIT ?`).all(limit) as any[];

    return posts.map((p) => {
      const targets = db.query(`SELECT * FROM post_targets WHERE post_id = ?`).all(p.id) as DbPostTarget[];
      return {
        ...p,
        media_paths: p.media_paths ? JSON.parse(p.media_paths) : undefined,
        targets,
      };
    });
  }

  // --- Bookmarks ---
  upsertBookmarks(items: BookmarkItem[]): number {
    const db = this.client.getDatabase();
    let count = 0;

    const insert = db.query(`
      INSERT INTO bookmarks (id, platform, author_handle, author_name, content, source_url, media_urls, created_at, synced_at)
      VALUES ($id, $platform, $author_handle, $author_name, $content, $source_url, $media_urls, $created_at, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        author_name = excluded.author_name,
        synced_at = CURRENT_TIMESTAMP
    `);

    for (const item of items) {
      insert.run({
        $id: item.id,
        $platform: item.platform,
        $author_handle: item.authorHandle,
        $author_name: item.authorName || null,
        $content: item.text,
        $source_url: item.url,
        $media_urls: item.mediaUrls ? JSON.stringify(item.mediaUrls) : null,
        $created_at: item.createdAt.toISOString(),
      });
      count++;
    }

    return count;
  }

  listBookmarks(limit = 50): DbBookmark[] {
    const db = this.client.getDatabase();
    const rows = db.query(`SELECT * FROM bookmarks ORDER BY synced_at DESC LIMIT ?`).all(limit) as any[];

    return rows.map((r) => ({
      ...r,
      media_urls: r.media_urls ? JSON.parse(r.media_urls) : undefined,
    }));
  }

  searchBookmarks(query: string, limit = 50): DbBookmark[] {
    const db = this.client.getDatabase();
    const pattern = `%${query}%`;
    const rows = db.query(`
      SELECT * FROM bookmarks
      WHERE content LIKE ? OR author_handle LIKE ? OR notes LIKE ?
      ORDER BY synced_at DESC
      LIMIT ?
    `).all(pattern, pattern, pattern, limit) as any[];

    return rows.map((r) => ({
      ...r,
      media_urls: r.media_urls ? JSON.parse(r.media_urls) : undefined,
    }));
  }

  updateBookmarkNotes(id: string, notes: string): boolean {
    const db = this.client.getDatabase();
    const res = db.query(`UPDATE bookmarks SET notes = ? WHERE id = ?`).run(notes, id);
    return res.changes > 0;
  }

  // --- Mentions ---
  upsertMentions(items: MentionItem[]): number {
    const db = this.client.getDatabase();
    let count = 0;

    const insert = db.query(`
      INSERT INTO mentions (id, platform, author_handle, content, in_reply_to_post_id, source_url, created_at)
      VALUES ($id, $platform, $author_handle, $content, $in_reply_to_post_id, $source_url, $created_at)
      ON CONFLICT(id) DO NOTHING
    `);

    for (const item of items) {
      insert.run({
        $id: item.id,
        $platform: item.platform,
        $author_handle: item.authorHandle,
        $content: item.text,
        $in_reply_to_post_id: item.inReplyToPostId || null,
        $source_url: item.url,
        $created_at: item.createdAt.toISOString(),
      });
      count++;
    }

    return count;
  }

  listMentions(limit = 50): DbMention[] {
    const db = this.client.getDatabase();
    return db.query(`SELECT * FROM mentions ORDER BY created_at DESC LIMIT ?`).all(limit) as DbMention[];
  }
}
