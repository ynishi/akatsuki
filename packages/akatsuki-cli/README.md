# Akatsuki CLI

Fast Rust-powered CLI tools for Akatsuki development.

## Features

- **VibeCoding Design Framework** - Manage design documents
  - `akatsuki design new <feature-name>` - Create new design document
  - `akatsuki design list` - List all design examples
  - `akatsuki design use` - Copy an example design interactively
  - `akatsuki design publish <feature-name>` - Publish design to examples

## Installation

### From GitHub Releases (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/user/akatsuki/main/scripts/install-cli.sh | sh
```

### From Source (Requires Rust)

```bash
cargo install --path packages/akatsuki-cli
```

### Development

```bash
cargo run --manifest-path packages/akatsuki-cli/Cargo.toml -- design new my-feature
```

## Usage

```bash
# Create new design document
akatsuki design new user-dashboard

# List all examples
akatsuki design list

# Copy an example (interactive)
akatsuki design use

# Publish to examples
akatsuki design publish user-dashboard

# Show version
akatsuki --version

# Show help
akatsuki --help
```

## Performance

- ⚡ Sub-10ms startup time (vs 100+ms for Node.js)
- 📦 Single binary, no dependencies
- 🚀 Native performance

## Development

```bash
# Build
cargo build --manifest-path packages/akatsuki-cli/Cargo.toml

# Build release
cargo build --release --manifest-path packages/akatsuki-cli/Cargo.toml

# Run tests
cargo test --manifest-path packages/akatsuki-cli/Cargo.toml

# Check
cargo check --manifest-path packages/akatsuki-cli/Cargo.toml
```

## License

MIT
