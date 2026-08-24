# Cast: Intentional Social Media CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-f472b6.svg)](https://bun.sh)
[![Platforms](https://img.shields.io/badge/Platforms-X%20%7C%20LinkedIn-black.svg)]()

> **"Use social media as an output and intentional-information channel, not as a place to consume an infinite feed."**

**Cast** is an open-source, terminal-first, local-first CLI built with TypeScript and Bun that lets you publish and retrieve high-signal information on **X (Twitter)** and **LinkedIn** without browser tabs, distraction feeds, or algorithmic dopamine loops.

---

## Key Features

* **Unified & Single-Target Publishing**: Publish to X, LinkedIn, or both simultaneously (`cast post --both "..."`).
* **Distraction-Free**: Zero home feeds, algorithmic timelines, follower counters, or notification spam.
* **Local-First Draft Vault**: Compose markdown drafts in your favorite `$EDITOR` (nano, vim, neovim) with frontmatter support (`cast draft new`).
* **Offline Bookmarks Vault**: Synchronize X bookmarks into a local SQLite database with full-text search (`cast bookmarks search <query>`).
* **Direct Feedback & Mentions**: Check direct replies without getting sucked into a feed (`cast mentions`).
* **Secure Credential Vault**: OAuth 2.0 PKCE with AES-256-GCM encrypted local storage; zero centralized servers.
* **Single Standalone Executable**: Compiles into a fast native binary with sub-80ms execution times.

---

## Installation & Quick Start

### 1. One-Line Install (macOS & Linux)
Install the standalone binary directly without needing Bun or Node installed:
```bash
curl -fsSL https://raw.githubusercontent.com/RobinsKarani/cast/main/install.sh | bash
```

### 2. Windows
Download the latest `cast-windows-x64.exe` from the [GitHub Releases](https://github.com/RobinsKarani/cast/releases) page.

### 3. Build from Source (Any Platform)
```bash
git clone https://github.com/RobinsKarani/cast.git
cd cast
bun install
bun run build
```
This produces the standalone binary at `./dist/cast`. You can symlink it to your `PATH`:
```bash
sudo ln -s $(pwd)/dist/cast /usr/local/bin/cast
```

> **Detailed Guide**: See [guide.md](guide.md) for the complete user guide and command cheat sheet.

---

## Developer Account Setup

Cast uses a **Bring Your Own App (BYOA)** model to keep credentials strictly private on your machine.

### Step 1: Set Up X (Twitter) App
1. Go to the [X Developer Portal](https://developer.x.com/) (or [console.x.com](https://console.x.com/)).
2. Create a Project and add an App.
3. Under **User Authentication Settings**:
   * App Permissions: **Read and write**
   * Type of App: **Web App, Automated App or Bot** (or Native App)
   * Callback URI: `http://127.0.0.1:3391/callback`
   * Website URL: `https://github.com/RobinsKarani/cast`
4. Copy your **OAuth 2.0 Client ID** and **Client Secret**.

### Step 2: Set Up LinkedIn App
1. Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Create an App and associate it with a LinkedIn page.
3. Under **Products**, request access to:
   * **Share on LinkedIn** (Instantly approved)
   * **Sign In with LinkedIn using OpenID Connect** (Instantly approved)
4. Under **Auth**:
   * Add Authorized Redirect URL: `http://127.0.0.1:3391/callback`
   * Copy **Client ID** and **Primary Client Secret**.

### Step 3: Configure Cast
```bash
# Save credentials
cast x auth setup
cast l auth setup

# Authenticate via browser
cast x auth login
cast l auth login

# Check status
cast x auth status
cast l auth status
```

---

## Command Reference

### 1. Platform Commands (X & LinkedIn)
```bash
# Post to X (Twitter)
cast x "Shipped our update today!"
cast x "Architecture screenshots" -m ./shot1.png,./shot2.png
cast x "Long breakdown of our pipeline..." -t   # Auto-splits thread
cast x bookmarks sync                           # Sync X bookmarks to local SQLite
cast x bookmarks search "distributed"          # Search bookmarks offline
cast x mentions                                 # View direct replies/feedback
cast x search "Bun 1.3"                         # Search X without a feed

# Post to LinkedIn
cast l "Excited to share our latest project milestone!"
cast l "System architecture diagram" -m ./diagram.png

# Post to Both (Explicit)
cast both "Major version v1.0 is live!" -m ./banner.png
```

### 2. Local Draft Vault ($EDITOR Writing)
```bash
cast draft new "v1-launch"    # Create draft in nano/vim ($EDITOR)
cast draft list               # List saved local drafts
cast draft edit 1             # Re-open draft in $EDITOR
cast draft publish 1          # Publish draft to target(s)
```

### 3. Diagnostics & History
```bash
cast history                  # View published post history & live URLs
cast doctor                   # Health check for SQLite DB, tokens & network
```

---

## Architecture & Security Model

```text
┌─────────────────────────────────────────────────────────────┐
│                          CLI Layer                          │
│               (citty / picocolors / prompts)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                         Core Layer                          │
│  - Publishing Orchestrator   - Markdown Draft Parser        │
│  - SQLite Repository         - PKCE & Ephemeral Server      │
│  - Secure Keyring Store      - Token Refresh Lifecycle      │
└──────────────────────┬──────────────────────┬───────────────┘
                       │                      │
┌──────────────────────▼───────┐      ┌───────▼───────────────┐
│       Platform Adapters      │      │     Storage & DB      │
│  - XAdapter (v2 API / PKCE)  │      │  - bun:sqlite (WAL)   │
│  - LinkedInAdapter (REST)    │      │  - AES-256-GCM Vault  │
└──────────────────────────────┘      └───────────────────────┘
```

* **Zero Telemetry**: All network calls go directly to official API endpoints.
* **Encrypted Vault**: Credentials and tokens are stored in `~/.config/cast/credentials.enc` using AES-256-GCM with PBKDF2 key derivation and `0600` file permissions.
* **Local Database**: All drafts, bookmarks, and history are stored locally at `~/.local/share/cast/cast.db`.

---

## Running Tests
```bash
bun test
```

---

## License
MIT License. See [LICENSE](LICENSE) for details.
