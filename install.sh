#!/usr/bin/env bash
set -e

# ==============================================================================
# Cast CLI Installer (macOS & Linux)
# ==============================================================================

REPO="RobinsKarani/cast"
INSTALL_DIR="${HOME}/.local/bin"
BIN_NAME="cast"

echo "==> Detecting OS and architecture..."

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "${OS}" in
  linux)
    case "${ARCH}" in
      x86_64|amd64)
        TARGET="cast-linux-x64"
        ;;
      aarch64|arm64)
        TARGET="cast-linux-arm64"
        ;;
      *)
        echo "Error: Unsupported architecture ${ARCH} for Linux." >&2
        exit 1
        ;;
    esac
    ;;
  darwin)
    case "${ARCH}" in
      x86_64)
        TARGET="cast-darwin-x64"
        ;;
      arm64|aarch64)
        TARGET="cast-darwin-arm64"
        ;;
      *)
        echo "Error: Unsupported architecture ${ARCH} for macOS." >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Error: Unsupported operating system ${OS}. On Windows, download cast-windows-x64.exe from GitHub Releases." >&2
    exit 1
    ;;
esac

echo "==> Target binary: ${TARGET}"

# Fetch latest release URL
LATEST_URL=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep "browser_download_url.*${TARGET}" | cut -d : -f 2,3 | tr -d '\"' | xargs)

if [ -z "${LATEST_URL}" ]; then
  # Fallback to direct tag URL if API rate limit or no release yet
  LATEST_URL="https://github.com/${REPO}/releases/download/v0.1.0/${TARGET}"
fi

echo "==> Downloading Cast binary from ${LATEST_URL}..."

mkdir -p "${INSTALL_DIR}"
TMP_FILE="$(mktemp)"

if curl -fLo "${TMP_FILE}" "${LATEST_URL}"; then
  mv "${TMP_FILE}" "${INSTALL_DIR}/${BIN_NAME}"
  chmod +x "${INSTALL_DIR}/${BIN_NAME}"
  echo "==> Successfully installed Cast to ${INSTALL_DIR}/${BIN_NAME}"
else
  echo "Error: Failed to download binary. Please ensure release exists at https://github.com/${REPO}/releases" >&2
  rm -f "${TMP_FILE}"
  exit 1
fi

# Ensure INSTALL_DIR is in PATH
if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
  echo ""
  echo "Note: ${INSTALL_DIR} is not in your PATH."
  echo "Add it to your shell configuration:"
  echo ""
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

echo ""
echo "Cast is ready! Run: cast --help"
echo ""
