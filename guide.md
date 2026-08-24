# Cast User Guide

Cast is designed as a **clean, hierarchical command tree** organized by platform. You only need to know **4 main verbs**: `x`, `l`, `both`, and `draft`.

---

## 1. The Command Tree at a Glance

```text
cast
├── x                 # Everything X (Twitter)
│   ├── [message]     # Post a tweet or thread (cast x "...")
│   ├── bookmarks     # List, search, or sync bookmarks (cast x bookmarks)
│   ├── mentions      # View direct replies & feedback (cast x mentions)
│   ├── search <q>    # Targeted search without a feed (cast x search "...")
│   └── auth          # Setup, login, status, logout (cast x auth login)
│
├── l (or linkedin)   # Everything LinkedIn
│   ├── [message]     # Post an update (cast l "...")
│   └── auth          # Setup, login, status, logout (cast l auth login)
│
├── both              # Broadcast to both platforms explicitly
│   └── [message]     # (cast both "...")
│
├── draft             # Local markdown drafts ($EDITOR writing vault)
│   ├── new [title]   # Open $EDITOR to compose draft
│   ├── list          # View all saved drafts
│   ├── edit <id>     # Re-open draft in $EDITOR
│   └── publish <id>  # Publish draft to target platform(s)
│
├── history           # Log of published posts & live permalinks
└── doctor            # Local SQLite, keyring & network diagnostics
```

---

## 2. Platform Commands: X (Twitter)

### A. Publishing Tweets & Threads
```bash
# Post a single tweet
cast x "Shipped the new update today!"

# Attach images (up to 4)
cast x "New UI screenshots" -m ./shot1.png,./shot2.png

# Split long text into an ordered thread automatically
cast x "Detailed breakdown of our architecture..." -t

# Dry run preview (test characters & thread splits without posting)
cast x "Preview text" -d
```

### B. Signal Intake (Bookmarks, Mentions & Search)
```bash
# Browse your bookmarks offline
cast x bookmarks list

# Sync bookmarks from X to local SQLite database
cast x bookmarks sync

# Search your offline bookmarks vault
cast x bookmarks search "distributed systems"

# View direct replies/mentions without seeing a feed
cast x mentions

# Search X for a specific topic (without opening the feed)
cast x search "Bun 1.3 release"
```

### C. Account & Auth for X
```bash
cast x auth setup    # Save OAuth 2.0 Client ID
cast x auth login    # Authenticate via browser PKCE
cast x auth status   # Check token expiration & account handle
cast x auth logout   # Clear stored credentials
```

---

## 3. Platform Commands: LinkedIn

### A. Publishing Updates
```bash
# Post an update to LinkedIn
cast l "Excited to share our latest milestone!"

# Attach an image
cast l "Architecture diagram of our pipeline" -m ./diagram.png

# Dry run preview
cast l "Preview LinkedIn post" -d
```

### B. Account & Auth for LinkedIn
```bash
cast l auth setup    # Save OAuth Client ID & Secret
cast l auth login    # Authenticate via browser
cast l auth status   # Check token expiration & account handle
cast l auth logout   # Clear stored credentials
```

---

## 4. Cross-Platform & Safety Guardrails

### Dual Posting (Explicit)
```bash
# Broadcast to both X and LinkedIn simultaneously
cast both "Major version v1.0 is now live!" -m ./banner.png
```

### Accidental Cross-Post Protection
If you run `cast post "message"` or `cast "message"` without specifying a platform, Cast will **never** post to both silently. 

In interactive mode, Cast will prompt you:
```text
Where would you like to publish this post?
  1) X (Twitter) only
  2) LinkedIn only
  3) Both platforms (X & LinkedIn)
  4) Cancel
Select destination [1/2/3/4]:
```

---

## 5. Markdown Draft Vault (Distraction-Free Writing)

Write and edit your thoughts in your terminal editor (`nano`, `vim`, `neovim`, `code`) before publishing.

```bash
# 1. Create a draft (opens $EDITOR with frontmatter)
cast draft new "v1-launch"

# 2. List all local drafts
cast draft list

# 3. Edit draft #1 in $EDITOR
cast draft edit 1

# 4. View draft contents in terminal
cast draft show 1

# 5. Publish draft #1
cast draft publish 1

# 6. Delete draft #1
cast draft delete 1
```

### Draft Template Format
```markdown
---
title: "Product Launch"
target: linkedin # Options: linkedin | x | both
media: [./assets/hero.png]
tags: [oss, typescript]
---

Cast v0.1 is live! A terminal-first tool for intentional publishing.
```

---

## 6. Unix Pipes & Scripting

```bash
# Pipe git commits directly to X
git log -n 3 --oneline | cast x

# Pipe release notes to LinkedIn
cat release-notes.md | cast l

# Pipe announcements to both
cat announcement.md | cast both
```

---

## 7. Diagnostics & Audit History

```bash
# View all published posts and live URLs
cast history

# Run health diagnostics on database, credentials, and API connections
cast doctor
```

---

## 8. Summary of Every Command You Need

| Command | Action |
| :--- | :--- |
| `cast x "..."` | Post to X (Twitter) |
| `cast x -m <path>` | Post to X with images |
| `cast x -t "..."` | Post multi-tweet thread to X |
| `cast x bookmarks` | View offline bookmarks vault |
| `cast x bookmarks sync` | Sync bookmarks from X |
| `cast x mentions` | View direct replies/mentions |
| `cast x search "<q>"` | Search X intentionally |
| `cast l "..."` | Post to LinkedIn |
| `cast l -m <path>` | Post to LinkedIn with image |
| `cast both "..."` | Post to both X & LinkedIn |
| `cast draft new` | Create markdown draft in `$EDITOR` |
| `cast draft list` | List all saved drafts |
| `cast draft publish <id>` | Publish saved draft |
| `cast history` | View published post log & URLs |
| `cast doctor` | Check system & API health |
