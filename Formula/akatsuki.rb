# Homebrew Formula for Akatsuki CLI
# Usage: brew tap ynishi/akatsuki && brew install akatsuki
#
# To update after a new release:
# 1. Get the new SHA256: curl -sL <url> | shasum -a 256
# 2. Update version and sha256 values below

class Akatsuki < Formula
  desc "VibeCoding Development CLI for Akatsuki projects"
  homepage "https://github.com/ynishi/akatsuki"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/ynishi/akatsuki/releases/download/cli-v#{version}/akatsuki-aarch64-apple-darwin.tar.gz"
      sha256 "PLACEHOLDER_SHA256_ARM64"
    end
    on_intel do
      url "https://github.com/ynishi/akatsuki/releases/download/cli-v#{version}/akatsuki-x86_64-apple-darwin.tar.gz"
      sha256 "PLACEHOLDER_SHA256_X64"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/ynishi/akatsuki/releases/download/cli-v#{version}/akatsuki-x86_64-unknown-linux-gnu.tar.gz"
      sha256 "PLACEHOLDER_SHA256_LINUX"
    end
  end

  def install
    bin.install "akatsuki"
  end

  test do
    system "#{bin}/akatsuki", "--version"
  end
end
