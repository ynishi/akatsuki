# 🚀 Akatsuki (暁) Template

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/ynishi/akatsuki.svg?style=social&label=Star)](https://github.com/ynishi/akatsuki)
[![GitHub forks](https://img.shields.io/github/forks/ynishi/akatsuki.svg?style=social&label=Fork)](https://github.com/ynishi/akatsuki/fork)

**VITE + React + Shuttle (Axum) + Supabase + AIGen Integrated Template**

`Akatsuki` is a development template specialized for **fastest 0→1 phase launch**, enabling you to integrate AI features as naturally as breathing.

> [!IMPORTANT]
> **For First-Time Users:** This project has an important "constitution."
> Before starting development, please read **`AGENT.md`** to understand the design philosophy and rules (especially `workspace/` and library management).

---

## ✨ Key Features

* **AIGen Built-in:** API endpoints for image generation and Img2Img are integrated from the start.
* **Monorepo Structure:** `packages/` are linked with NPM Workspaces.
* **Unified Environment:** `.tool-versions` and `.nvmrc` ensure consistent Node.js and Rust versions.
* **Supabase Integration:** Utilizes a shared `Supabase-dev` environment for development teams.

## 🛠️ Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend** | VITE + React + Tailwind CSS |
| **Backend** | Shuttle + Axum (Rust) |
| **Database** | Supabase (PostgreSQL) |
| **Repository** | Monorepo (NPM Workspaces) |

---

## 🚀 Quick Start

Get started with development in just **3 steps**!

### Prerequisites

⚠️ **Easy to Forget:**

Please install the following tools. See [`docs/setup.md`](docs/setup.md) for details.

- **Node.js** v20.x or higher (`nvm use` or `asdf install`)
- **Rust & Cargo** (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Shuttle CLI** (`cargo install cargo-shuttle`)
- **Supabase CLI** (`npm install -g supabase`) ← **Often forgotten!**

### Step 1: Clone and Install

⚠️ **Important:** Clone with your app name!

```bash
# Clone with your app name (example: my-awesome-app)
git clone https://github.com/ynishi/akatsuki.git my-awesome-app
cd my-awesome-app
npm install
```

### Step 2: Create Supabase Project

Create a new project on [Supabase Dashboard](https://app.supabase.com/).

1. Click "New Project"
2. Enter project information (**Save the Database Password**)
3. Click "Create new project"
4. Note down the following from Settings > API:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon Key** (the `anon` `public` key)

See [`docs/setup.md`](docs/setup.md) for details.

### Step 3: Automated Setup 🎯

Once you have your Supabase project ready, run:

```bash
npm run setup
```

**This single command handles everything!** It automatically:

- 📦 Sets project name & description (updates package.json)
- 🔄 Cleans Git history (initializes as new repository)
- ✅ Checks all prerequisites (Node.js, Rust, Shuttle, Supabase CLI)
- 📝 Prompts for Supabase information (Project URL, Anon Key, Database Password)
- 📝 Auto-generates `.env` files for Frontend and Backend
- 🔗 Links to your Supabase project
- 🗄️ Applies database migrations (tables, RLS policies, triggers)
- ⚡ Deploys Edge Functions (ai-chat, generate-image, etc.)
- 🔑 Shows Secrets configuration guide
- 🔍 Verifies Backend compilation
- 📝 Creates initial Git commit

**That's it!** Start the development servers and check your app:

```bash
# Both servers at once
akatsuki dev  # Frontend: http://localhost:5173, Backend: http://localhost:8000

# Or run them separately
akatsuki dev frontend  # Frontend only
akatsuki dev backend   # Backend only
```

---

### Check Setup Status

You can check the setup status at any time with:

```bash
akatsuki setup check
```

### Detailed Setup Instructions

For manual setup or detailed instructions, refer to [`docs/setup.md`](docs/setup.md).

---

## 📁 Directory Structure

```
akatsuki/
├── README.md              # (This file) Quick Start
├── AGENT.md              # [MUST READ] Design philosophy, architecture, all rules
├── package.json          # Monorepo root configuration
├── .tool-versions        # Version management for asdf/mise
├── .nvmrc                # Node.js version specification for nvm
├── packages/
│   ├── app-frontend/     # Frontend (VITE + React)
│   │   ├── src/
│   │   ├── .env          # Frontend environment variables (not in Git)
│   │   └── package.json
│   └── app-backend/      # Backend (Shuttle + Axum)
│       ├── src/
│       ├── .env          # Backend environment variables (not in Git)
│       ├── .env.example  # Environment variables sample
│       └── Cargo.toml
├── docs/                 # Official documentation (guides, design docs, etc.)
└── workspace/            # (Not in Git) Personal workspace
```

### Directory Roles

| File/Directory | Role |
| :--- | :--- |
| **`README.md`** | **(This file)** Quick Start |
| **`AGENT.md`** | **[MUST READ]** Design philosophy, architecture, all rules |
| `packages/app-frontend/` | Vite + React frontend application |
| `packages/app-backend/` | Shuttle + Axum backend API |
| `docs/` | Team's official knowledge (guides, design docs) |
| `workspace/` | **(Not in Git)** Personal workspace (notes, drafts) |

---

## 🔧 Development Commands

All development operations are managed through the `akatsuki` CLI:

### Development Servers

```bash
akatsuki dev              # Start both frontend & backend
akatsuki dev frontend     # Frontend only (localhost:5173)
akatsuki dev backend      # Backend only (localhost:8000)
```

### Build

```bash
akatsuki build            # Build both frontend & backend
akatsuki build frontend   # Frontend production build
akatsuki build backend    # Backend release build
```

### Type Checking

```bash
akatsuki check            # Run all type checks
akatsuki check frontend   # Frontend (tsc --noEmit)
akatsuki check backend    # Backend (cargo check)
akatsuki check admin-cli  # Admin CLI (cargo check)
```

### Linting

```bash
akatsuki lint             # Run all linters
akatsuki lint frontend    # Frontend (eslint)
akatsuki lint backend     # Backend (cargo clippy)
akatsuki lint admin-cli   # Admin CLI (cargo clippy)
akatsuki lint --fix       # Auto-fix issues
```

### Formatting

```bash
akatsuki fmt              # Format all code
akatsuki fmt frontend     # Frontend (prettier)
akatsuki fmt backend      # Backend (cargo fmt)
akatsuki fmt admin-cli    # Admin CLI (cargo fmt)
```

### Preflight (Recommended before commit)

```bash
akatsuki preflight        # Run fmt + lint + check + test (all)
akatsuki preflight frontend
akatsuki preflight backend
akatsuki preflight admin-cli
```

### Testing

```bash
akatsuki test             # Run all tests
akatsuki test frontend    # Frontend tests (vitest)
akatsuki test backend     # Backend tests (cargo test)
```

### Database Operations

```bash
akatsuki db push                  # Push migrations to remote database
akatsuki db migration-new <name>  # Create new migration file
akatsuki db status                # Show database status
akatsuki db link                  # Link to Supabase project
```

### Edge Functions

```bash
akatsuki function new <name>      # Create new edge function
akatsuki function deploy [name]   # Deploy edge function(s)
```

### Deployment

```bash
akatsuki deploy           # Deploy both frontend & backend
akatsuki deploy frontend  # Frontend deployment (not configured yet)
akatsuki deploy backend   # Backend deployment to Shuttle
```

### Other Commands

```bash
akatsuki design new <name>    # Create new VibeCoding design document
akatsuki design list          # List design examples
akatsuki design use           # Copy example design
akatsuki setup check          # Check setup status

# Preview server (still uses npm for workspace-specific commands)
npm run preview:frontend      # Preview frontend build
```

---

## 🌐 API Endpoints

Main endpoints provided by the Backend:

### Health Check
- **GET** `/health` - Check server status

### AIGen Features

#### 1. Text-to-Image (Image Generation)
- **POST** `/api/aigen/text-to-image`
  ```json
  {
    "prompt": "A beautiful sunset over the ocean",
    "model": "stable-diffusion-xl",
    "width": 1024,
    "height": 1024
  }
  ```

#### 2. Image-to-Image (Image Transformation)
- **POST** `/api/aigen/image-to-image`
  ```json
  {
    "source_image_url": "https://example.com/image.png",
    "prompt": "Convert to anime style",
    "model": "stable-diffusion-xl",
    "strength": 0.75
  }
  ```

See `packages/app-backend/README.md` for details.

---

## 📚 Learn More

- **Design Philosophy and Rules:** Please read `AGENT.md`
- **Backend Details:** `packages/app-backend/README.md`
- **Deployment Guide:** `docs/guide/` (coming soon)

---

## 🤝 Development Policy

- **Shared Supabase-dev Environment:** Teams (1-2 members) share the development Supabase project
- **Utilize workspace/:** Save personal notes and drafts in `workspace/` (not in Git)
- **Monorepo Management:** Place shared components in `packages/`

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Start your best 0→1 development experience with Akatsuki!** 🚀
