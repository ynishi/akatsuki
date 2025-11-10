# 🚀 Akatsuki (暁) Template

**VITE + React + Shuttle (Axum) + Supabase + AIGen Integrated Template**

`Akatsuki` is a development template specialized for **fastest 0→1 phase launch**, enabling you to integrate AI features as naturally as breathing.

> [!IMPORTANT]
> **For First-Time Users:** This project has an important "constitution."
> Before starting development, please read **`AGENT.md`** to understand the design philosophy and rules (especially `workspace/` and library management).

---

## ✨ Key Features

* **AIGen Built-in:** API endpoints for image generation, Img2Img, and Agent execution are integrated from the start.
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

### Step 1: Create Project

⚠️ **Important:** Clone with your app name!

```bash
# Clone with your app name (example: my-awesome-app)
git clone https://github.com/yourusername/akatsuki.git my-awesome-app
cd my-awesome-app
npm install
```

### Step 2: Create Supabase Project

Create a new project on [Supabase Dashboard](https://app.supabase.com/).

1. Click "New Project"
2. Enter project information (**Save the Database Password**)
3. Click "Create new project"

See [`docs/setup.md`](docs/setup.md) for details.

### Step 3: Automated Setup 🎯

```bash
npm run setup
```

This command automatically executes the following:

- 📦 Set project name & description (update package.json)
- 🔄 Clean Git history (initialize as new repository)
- ✅ Check prerequisites
- 📝 Enter Supabase information (interactive)
- 📝 Auto-generate `.env` files
- 🔗 Link to Supabase project
- 🗄️ Apply database migrations
- ⚡ Deploy Edge Functions
- 🔑 Secrets configuration guide
- 🔍 Backend verification
- 📝 Create initial Git commit

**That's it!** Start the development servers and check your app:

```bash
# Terminal 1: Frontend
npm run dev:frontend  # http://localhost:5173

# Terminal 2: Backend
npm run dev:backend   # http://localhost:8000
```

---

### Check Setup Status

You can check the setup status at any time with:

```bash
npm run setup:check
```

### Detailed Setup Instructions

For manual setup or detailed instructions, refer to [`docs/setup.md`](docs/setup.md).

---

## 📁 Directory Structure

```
akatsuki/
├── README.md              # (This file) Quick Start
├── AGENT.md              # [MUST READ] Design philosophy, architecture, all rules
├── issue.md              # Project master plan
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
| **`issue.md`** | Project master plan |
| `packages/app-frontend/` | Vite + React frontend application |
| `packages/app-backend/` | Shuttle + Axum backend API |
| `docs/` | Team's official knowledge (guides, design docs) |
| `workspace/` | **(Not in Git)** Personal workspace (notes, drafts) |

---

## 🔧 Development Commands

npm scripts available at project root:

### Frontend

```bash
npm run dev:frontend      # Start development server (localhost:5173)
npm run build:frontend    # Production build
npm run preview:frontend  # Preview build results
```

### Backend

```bash
npm run dev:backend       # Start Shuttle local development server
npm run check:backend     # Compilation check
npm run build:backend     # Release build
npm run test:backend      # Run tests
npm run deploy:backend    # Deploy to Shuttle
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

#### 3. Agent Execute (LLM Task Execution)
- **POST** `/api/aigen/agent-execute`
  ```json
  {
    "task": "Summarize this text...",
    "model": "gpt-4",
    "system_prompt": "You are a helpful assistant"
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

**Start your best 0→1 development experience with Akatsuki!** 🚀
