#!/bin/sh
set -e

# Akatsuki CLI Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/user/akatsuki/main/scripts/install-cli.sh | sh

echo "Installing Akatsuki CLI..."

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    if [ "$ARCH" = "arm64" ]; then
      BINARY="akatsuki-macos-aarch64"
    else
      BINARY="akatsuki-macos-x86_64"
    fi
    ;;
  Linux)
    BINARY="akatsuki-linux-x86_64"
    ;;
  MINGW* | MSYS* | CYGWIN*)
    BINARY="akatsuki-windows-x86_64.exe"
    ;;
  *)
    echo "❌ Unsupported OS: $OS"
    echo ""
    echo "Please install from source:"
    echo "  cargo install --path packages/akatsuki-cli"
    exit 1
    ;;
esac

# Set GitHub repository (update with actual repo)
GITHUB_REPO="user/akatsuki"
LATEST_URL="https://github.com/${GITHUB_REPO}/releases/latest/download/${BINARY}"
INSTALL_DIR="$HOME/.akatsuki/bin"

# Create install directory
mkdir -p "$INSTALL_DIR"

echo "Downloading ${BINARY}..."
if command -v curl > /dev/null 2>&1; then
  curl -fsSL "$LATEST_URL" -o "$INSTALL_DIR/akatsuki"
elif command -v wget > /dev/null 2>&1; then
  wget -q "$LATEST_URL" -O "$INSTALL_DIR/akatsuki"
else
  echo "❌ Error: curl or wget is required"
  exit 1
fi

# Make executable
chmod +x "$INSTALL_DIR/akatsuki"

echo "✅ Akatsuki CLI installed successfully!"
echo ""
echo "📍 Installed to: $INSTALL_DIR/akatsuki"
echo ""

# Add to PATH
PROFILE=""
if [ -f "$HOME/.zshrc" ]; then
  PROFILE="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
  PROFILE="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
  PROFILE="$HOME/.bash_profile"
fi

if [ -n "$PROFILE" ]; then
  if ! grep -q ".akatsuki/bin" "$PROFILE"; then
    echo "" >> "$PROFILE"
    echo '# Akatsuki CLI' >> "$PROFILE"
    echo 'export PATH="$HOME/.akatsuki/bin:$PATH"' >> "$PROFILE"
    echo "✅ Added akatsuki to PATH in $PROFILE"
    echo ""
    echo "🚀 Run the following to activate in current shell:"
    echo "   source $PROFILE"
  else
    echo "✅ PATH already configured in $PROFILE"
  fi
else
  echo "⚠️  Could not detect shell profile (.bashrc/.zshrc)"
  echo "   Please add the following to your shell profile:"
  echo '   export PATH="$HOME/.akatsuki/bin:$PATH"'
fi

echo ""
echo "🎉 Installation complete! Run 'akatsuki --version' to verify."
echo ""
echo "📚 Next steps:"
echo "   akatsuki --help              # Show all commands"
echo "   akatsuki design new <name>   # Create new design document"
echo "   akatsuki design list         # List design examples"
