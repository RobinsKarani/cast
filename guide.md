# Cast User Guide

A complete, distraction-free guide to using **Cast**.

---

## 1. Initial Setup & Authentication

Run these commands once to connect your accounts:

```bash
# Configure Developer Credentials
cast auth setup x
cast auth setup linkedin

# Authenticate via Browser
cast auth login x
cast auth login linkedin

# Check Account & Token Health
cast auth status
```

---

## 2. Instant Publishing (Output Channel)

Cast defaults to broadcasting to both platforms, or you can use concise `-x` and `-l` flags.

### Quick Post
```bash
# Post to LinkedIn only
cast -l "Shipped our new update today!"

# Post to X only
cast -x "Shipped our new update today!"

# Post to both X and LinkedIn
cast -b "Shipped our new update today!"
cast "Shipped our new update today!"
```

### Media Attachments
```bash
# Attach an image to LinkedIn
cast -l "Architecture diagram of our pipeline" -m ./diagram.png

# Attach up to 4 images to X
cast -x "New UI screenshots" -m ./shot1.png,./shot2.png
```

### Threads (X)
```bash
# Automatically split long text into an ordered multi-tweet thread
cast -x "A long breakdown of how we optimized our database queries..." -t
```

### Unix Pipes & Scripting
```bash
# Pipe any command output or file directly to Cast
cat release-notes.md | cast -l
git log -n 5 --oneline | cast -x
cat announcement.md | cast -b
```

### Dry Run Previews (Safe Test)
```bash
# Validate characters, payload format, and thread splits without posting
cast -l "Preview text check" -d
cast -x "Long text to preview as a thread..." -t -d
cast -b "Preview broadcast" -d
```

---

## 3. Markdown Draft Vault (Distraction-Free Writing)

Write and polish your thoughts in your favorite editor (`nano`, `vim`, `neovim`, `code`) before publishing.

### Draft Lifecycle
```bash
# 1. Create a new draft (opens $EDITOR with frontmatter)
cast draft new "v1-launch"

# 2. List all saved local drafts
cast draft list

# 3. Re-edit an existing draft in $EDITOR
cast draft edit 1

# 4. View draft contents in the terminal
cast draft show 1

# 5. Publish draft to its target platform(s)
cast draft publish 1

# 6. Delete a draft
cast draft delete 1
```

### Draft Frontmatter Format
When editing drafts in `cast draft new`, you can customize targets and attachments:
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

## 4. Bookmarks Vault (Offline Knowledge Base)

Sync and search your X bookmarks without opening the web feed.

```bash
# Sync your bookmarks from X to local SQLite database
cast bookmarks sync

# View saved bookmarks in the terminal
cast bookmarks list

# Offline full-text search across all saved bookmarks
cast bookmarks search "distributed systems"
```

---

## 5. Mentions & Intentional Search

Stay informed on direct feedback and search specific topics without algorithmic distractions.

```bash
# View recent direct mentions and replies to your posts
cast mentions

# Search X for a specific topic (without opening the feed)
cast search "Bun 1.3 release"

# Search your local offline bookmark vault
cast search "query" --local
```

---

## 6. Audit, Diagnostics & System Control

```bash
# View history of all posts published through Cast (with live URLs)
cast history

# Run health diagnostics on SQLite database, credentials, and API reachability
cast doctor

# Clear stored credentials for a platform
cast auth logout x
cast auth logout linkedin
```

---

## 7. Command Cheat Sheet Summary

| Action | Command |
| :--- | :--- |
| **Post to LinkedIn** | `cast -l "..."` |
| **Post to X** | `cast -x "..."` |
| **Post to Both** | `cast -b "..."` *(or `cast "..."`)* |
| **Attach Image** | `cast -l "..." -m <path>` |
| **Create Thread (X)** | `cast -x "..." -t` |
| **Dry Run Preview** | `cast -l "..." -d` |
| **New Markdown Draft** | `cast draft new [title]` |
| **List Drafts** | `cast draft list` |
| **Publish Draft** | `cast draft publish <id>` |
| **Sync Bookmarks** | `cast bookmarks sync` |
| **Search Bookmarks** | `cast bookmarks search "<query>"` |
| **View Mentions** | `cast mentions` |
| **Intentional Search** | `cast search "<query>"` |
| **View Post History** | `cast history` |
| **System Diagnostics** | `cast doctor` |
