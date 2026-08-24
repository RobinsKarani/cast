# Cast

Use X and LinkedIn via CLI.

---

## Install

### macOS & Linux (One-Liner)
```bash
curl -fsSL https://raw.githubusercontent.com/RobinsKarani/cast/main/install.sh | bash
```

### Windows
Download `cast-windows-x64.exe` from [Releases](https://github.com/RobinsKarani/cast/releases/latest).

### Build from Source
```bash
git clone https://github.com/RobinsKarani/cast.git
cd cast
bun install
bun run build
sudo ln -sf $(pwd)/dist/cast /usr/local/bin/cast
```

---

## Quick Reference

### 1. Publishing
```bash
# Post to X
cast x "Shipped the update today!"
cast x "New screenshots" -m ./shot1.png,./shot2.png
cast x "Long text..." -t   # Auto-splits thread

# Post to LinkedIn
cast l "Excited to share our latest project milestone!"
cast l "System architecture diagram" -m ./diagram.png

# Post to Both
cast both "Major release v1.0 is now live!"
```

### 2. Signal Intake (X Only)
```bash
cast x bookmarks sync        # Sync X bookmarks to local SQLite
cast x bookmarks search "ai" # Full-text search bookmarks offline
cast x mentions              # View direct replies/feedback
cast x search "Bun 1.3"      # Search X without a feed
```

### 3. Markdown Drafts ($EDITOR)
```bash
cast draft new "v1-launch"   # Compose draft in nano/vim ($EDITOR)
cast draft list              # View saved drafts
cast draft edit 1            # Re-edit draft
cast draft publish 1         # Publish draft
```

### 4. History & Diagnostics
```bash
cast history                 # View published post history & URLs
cast doctor                  # Test SQLite DB, tokens & network health
```

---

## Setup & Authentication

Cast uses a **Bring Your Own App (BYOA)** model. Your credentials stay strictly on your local machine.

### 1. Set Up App Credentials
* **X**: Create an app on [developer.x.com](https://developer.x.com/) with **Read & Write** permissions and callback URL `http://127.0.0.1:3391/callback`.
* **LinkedIn**: Create an app on [linkedin.com/developers](https://www.linkedin.com/developers/) with **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect** enabled, callback URL `http://127.0.0.1:3391/callback`.

### 2. Save & Authenticate
```bash
# Configure Developer Credentials
cast x auth setup
cast l auth setup

# Authenticate via Browser
cast x auth login
cast l auth login

# Check Health
cast x auth status
cast l auth status
```

---

## Detailed Guide

See [guide.md](guide.md) for full workflows, frontmatter schemas, and command cheat sheets.

---

## Testing

```bash
bun test
bun run typecheck
```

---

## License

MIT
