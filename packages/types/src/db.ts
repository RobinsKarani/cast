import type { PlatformId } from './platform.js';

export interface DbAccount {
  id: string;
  platform: PlatformId;
  account_handle: string;
  display_name?: string;
  platform_user_id: string;
  created_at: string;
  updated_at: string;
}

export type DraftTarget = 'x' | 'linkedin' | 'both';
export type DraftStatus = 'draft' | 'published' | 'archived';

export interface DbDraft {
  id: number;
  title?: string;
  target_platform: DraftTarget;
  raw_content: string;
  media_paths?: string[]; // JSON array parsed
  status: DraftStatus;
  created_at: string;
  updated_at: string;
}

export interface DbPost {
  id: number;
  draft_id?: number;
  content: string;
  media_paths?: string[];
  created_at: string;
}

export interface DbPostTarget {
  id: number;
  post_id: number;
  platform: PlatformId;
  external_post_id?: string;
  external_url?: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  published_at?: string;
}

export interface DbBookmark {
  id: string;
  platform: PlatformId;
  author_handle: string;
  author_name?: string;
  content: string;
  source_url: string;
  media_urls?: string[];
  notes?: string;
  created_at?: string;
  synced_at: string;
}

export interface DbMention {
  id: string;
  platform: PlatformId;
  author_handle: string;
  content: string;
  in_reply_to_post_id?: string;
  source_url: string;
  created_at?: string;
  is_read: number;
}
