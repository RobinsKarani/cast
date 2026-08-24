PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK(platform IN ('x', 'linkedin')),
    account_handle TEXT NOT NULL,
    display_name TEXT,
    platform_user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, platform_user_id)
);

-- Drafts
CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    target_platform TEXT NOT NULL CHECK(target_platform IN ('x', 'linkedin', 'both')),
    raw_content TEXT NOT NULL,
    media_paths TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Published Posts History
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER REFERENCES drafts(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    media_paths TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Post Publications per Target
CREATE TABLE IF NOT EXISTS post_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK(platform IN ('x', 'linkedin')),
    external_post_id TEXT,
    external_url TEXT,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    published_at DATETIME
);

-- Bookmarks Vault
CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    author_handle TEXT NOT NULL,
    author_name TEXT,
    content TEXT NOT NULL,
    source_url TEXT NOT NULL,
    media_urls TEXT,
    notes TEXT,
    created_at DATETIME,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-Text Search Virtual Table for Bookmarks
CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
    content,
    author_handle,
    notes,
    content='bookmarks',
    content_rowid='rowid'
);

-- Mentions & Feedback
CREATE TABLE IF NOT EXISTS mentions (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    author_handle TEXT NOT NULL,
    content TEXT NOT NULL,
    in_reply_to_post_id TEXT,
    source_url TEXT NOT NULL,
    created_at DATETIME,
    is_read INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_synced ON bookmarks(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_created ON mentions(created_at DESC);
