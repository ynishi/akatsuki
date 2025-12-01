//! Akatsuki Setup Wizard
//!
//! Interactive setup wizard for new Akatsuki projects.
//! Migrated from scripts/setup.js

use anyhow::{Context, Result};
use colored::*;
use dialoguer::{Confirm, Input, Password};
use regex::Regex;
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::process::Command;

use crate::utils::get_project_root;

/// Project setup information collected during wizard
struct ProjectInfo {
    name: String,
    description: String,
}

/// Supabase configuration collected during wizard
struct SupabaseInfo {
    project_url: String,
    project_ref: String,
    anon_key: String,
    #[allow(dead_code)]
    database_password: String,
    database_url: String,
}

pub fn execute() -> Result<()> {
    print_banner();

    // Step 0: Project name & Git
    let project_info = setup_project_name()?;

    // Step 1: Prerequisites (reuse existing check logic)
    check_prerequisites()?;

    // Step 2: Collect Supabase info
    let supabase_info = collect_supabase_info()?;

    // Step 3: Generate .env files
    generate_env_files(&supabase_info)?;

    // Step 4: Link Supabase
    link_supabase_project(&supabase_info.project_ref)?;

    // Step 5: Apply migrations
    apply_migrations()?;

    // Step 6: Deploy Edge Functions
    deploy_edge_functions()?;

    // Step 7: Secrets guide
    guide_secrets_setup();

    // Step 8: Verify backend
    verify_backend()?;

    // Step 9: Claude Code hooks
    setup_claude_code_hooks()?;

    // Step 10: Initial Git commit
    create_initial_commit(&project_info)?;

    // Summary
    display_summary(&project_info);

    Ok(())
}

fn print_banner() {
    println!();
    println!(
        "{}",
        r#"   █████╗ ██╗  ██╗ █████╗ ████████╗███████╗██╗   ██╗██╗  ██╗██╗
  ██╔══██╗██║ ██╔╝██╔══██╗╚══██╔══╝██╔════╝██║   ██║██║ ██╔╝██║
  ███████║█████╔╝ ███████║   ██║   ███████╗██║   ██║█████╔╝ ██║
  ██╔══██║██╔═██╗ ██╔══██║   ██║   ╚════██║██║   ██║██╔═██╗ ██║
  ██║  ██║██║  ██╗██║  ██║   ██║   ███████║╚██████╔╝██║  ██╗██║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝"#
            .magenta()
            .bold()
    );
    println!();
    println!("{}", "  🚀 Akatsuki Setup Wizard".bold());
    println!();
}

// =============================================================================
// Step 0: Project Name & Git
// =============================================================================

fn setup_project_name() -> Result<ProjectInfo> {
    println!("\n{}\n", "📦 Step 0: Project Setup".cyan().bold());

    let root = get_project_root()?;
    let current_dir_name = root
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("akatsuki");

    let is_default_name = current_dir_name == "akatsuki";

    if is_default_name {
        println!(
            "{} Current directory is \"akatsuki\" (template default)",
            "⚠".yellow()
        );
        println!(
            "{} Recommended: Clone with a custom name: git clone ... my-project-name",
            "ℹ".blue()
        );
    } else {
        println!("{} Current directory: {}", "ℹ".blue(), current_dir_name);
    }
    println!();

    // Get project name
    let default_name = if is_default_name {
        "my-awesome-app".to_string()
    } else {
        current_dir_name.to_string()
    };

    let project_name: String = Input::new()
        .with_prompt("Project name (for package.json)")
        .default(default_name)
        .validate_with(|input: &String| -> Result<(), &str> {
            let re = Regex::new(r"^[a-z0-9\-_]+$").unwrap();
            if re.is_match(input) {
                Ok(())
            } else {
                Err("Package name must contain only lowercase letters, numbers, hyphens, and underscores")
            }
        })
        .interact_text()?;

    // Get project description
    let default_desc = format!("{} (Made with Akatsuki)", project_name);
    let project_description: String = Input::new()
        .with_prompt("Project description (optional)")
        .default(default_desc.clone())
        .interact_text()?;

    // Ensure description includes branding
    let final_description = if project_description.contains("(Made with Akatsuki)") {
        project_description
    } else if project_description.trim().is_empty() {
        default_desc
    } else {
        format!("{} (Made with Akatsuki)", project_description.trim())
    };

    // Update package.json
    let package_json_path = root.join("package.json");
    if package_json_path.exists() {
        let content = fs::read_to_string(&package_json_path)?;
        let mut package: Value = serde_json::from_str(&content)?;

        package["name"] = json!(project_name);
        package["description"] = json!(final_description);

        fs::write(&package_json_path, serde_json::to_string_pretty(&package)? + "\n")?;
        println!("{} Updated package.json: name = \"{}\"", "✓".green(), project_name);
        println!(
            "{} Updated package.json: description = \"{}\"",
            "✓".green(),
            final_description
        );
    }

    // Update README.md
    println!("{} Updating README.md with project information...", "▸".magenta());
    let readme_path = root.join("README.md");
    if readme_path.exists() {
        let mut readme = fs::read_to_string(&readme_path)?;

        // Replace title
        readme = readme.replace(
            "# 🚀 Akatsuki (暁) Template",
            &format!("# 🚀 {}", project_name),
        );

        // Replace description
        readme = readme.replace(
            "**VITE + React + Shuttle (Axum) + Supabase + AIGen 統合テンプレート**",
            &format!("**{}**", final_description),
        );

        fs::write(&readme_path, readme)?;
        println!("{} Updated README.md with project information", "✓".green());
    }

    // Create workspace directory
    println!("{} Creating workspace directory...", "▸".magenta());
    let workspace_dir = root.join("workspace");
    if !workspace_dir.exists() {
        fs::create_dir_all(&workspace_dir)?;
        println!("{} Created workspace/ directory", "✓".green());
    } else {
        println!("{} workspace/ directory already exists", "ℹ".blue());
    }

    // Git initialization
    println!();
    let git_dir = root.join(".git");

    if git_dir.exists() {
        let clean_git = Confirm::new()
            .with_prompt("Clean Git history and initialize a fresh repository?")
            .default(true)
            .interact()?;

        if clean_git {
            println!("{} Removing existing .git directory...", "▸".magenta());
            fs::remove_dir_all(&git_dir)?;
            println!("{} Removed existing Git history", "✓".green());

            println!(
                "{} Initializing new Git repository (branch: main)...",
                "▸".magenta()
            );
            run_command("git", &["init", "-b", "main"], &root)?;
            println!("{} Initialized fresh Git repository", "✓".green());
        } else {
            println!("{} Keeping existing Git history", "ℹ".blue());
        }
    } else {
        println!(
            "{} Initializing Git repository (branch: main)...",
            "▸".magenta()
        );
        run_command("git", &["init", "-b", "main"], &root)?;
        println!("{} Initialized Git repository", "✓".green());
    }

    Ok(ProjectInfo {
        name: project_name,
        description: final_description,
    })
}

// =============================================================================
// Step 1: Prerequisites
// =============================================================================

fn check_prerequisites() -> Result<()> {
    println!("\n{}\n", "📋 Step 1: Checking Prerequisites".cyan().bold());

    let mut all_passed = true;

    // Node.js
    if let Some(version) = get_command_output("node", &["--version"]) {
        let major = version
            .trim_start_matches('v')
            .split('.')
            .next()
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(0);
        if major >= 20 {
            println!("{} Node.js {} (OK)", "✓".green(), version);
        } else {
            println!(
                "{} Node.js {} (Required: v20.x or higher)",
                "✗".red(),
                version
            );
            all_passed = false;
        }
    } else {
        println!("{} Node.js is not installed", "✗".red());
        all_passed = false;
    }

    // Rust
    if let Some(version) = get_command_output("rustc", &["--version"]) {
        println!("{} Rust: {}", "✓".green(), version);
    } else {
        println!("{} Rust is not installed", "✗".red());
        println!(
            "{} Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
            "ℹ".blue()
        );
        all_passed = false;
    }

    // Cargo
    if let Some(version) = get_command_output("cargo", &["--version"]) {
        println!("{} Cargo: {}", "✓".green(), version);
    } else {
        println!(
            "{} Cargo is not installed (should come with Rust)",
            "✗".red()
        );
        all_passed = false;
    }

    // Shuttle CLI
    if let Some(version) = get_command_output("cargo", &["shuttle", "--version"]) {
        println!("{} Shuttle CLI: {}", "✓".green(), version);
    } else {
        println!("{} Shuttle CLI is not installed", "✗".red());
        println!("{} Install: cargo install cargo-shuttle", "ℹ".blue());
        all_passed = false;
    }

    // Supabase CLI
    if let Some(version) = get_command_output("supabase", &["--version"]) {
        println!("{} Supabase CLI: {}", "✓".green(), version);
    } else {
        println!("{} Supabase CLI is not installed", "✗".red());
        println!("{} Install: npm install -g supabase", "ℹ".blue());
        println!("{} Or: brew install supabase/tap/supabase", "ℹ".blue());
        all_passed = false;
    }

    if !all_passed {
        println!();
        anyhow::bail!("Some prerequisites are missing. Please install them and run this command again.");
    }

    println!();
    println!("{} All prerequisites are installed!", "✓".green());

    Ok(())
}

// =============================================================================
// Step 2: Collect Supabase Info
// =============================================================================

fn collect_supabase_info() -> Result<SupabaseInfo> {
    println!(
        "\n{}\n",
        "🔐 Step 2: Supabase Project Information".cyan().bold()
    );

    println!(
        "{} Please create a new project at: https://app.supabase.com/",
        "ℹ".blue()
    );
    println!(
        "{} Then, collect the following information from your Supabase Dashboard:",
        "ℹ".blue()
    );
    println!();
    println!("{} From Project Home (or Settings > API):", "ℹ".blue());
    println!("{}   - Project URL", "▸".magenta());
    println!("{}   - API Key (anon public)", "▸".magenta());
    println!();
    println!("{} Prepare Saved Database PASSWORD", "▸".magenta());
    println!();

    let project_url: String = Input::new()
        .with_prompt("Supabase Project URL")
        .validate_with(|input: &String| -> Result<(), &str> {
            if input.starts_with("https://") && input.contains(".supabase.co") {
                Ok(())
            } else {
                Err("Invalid URL. Should be like: https://xxxxx.supabase.co")
            }
        })
        .interact_text()?;

    let anon_key: String = Input::new()
        .with_prompt("Supabase Anon Key")
        .validate_with(|input: &String| -> Result<(), &str> {
            if input.is_empty() {
                Err("Anon Key is required")
            } else {
                Ok(())
            }
        })
        .interact_text()?;

    let database_password: String = Password::new()
        .with_prompt("Database Password")
        .interact()?;

    if database_password.is_empty() {
        anyhow::bail!("Database Password is required");
    }

    // Extract project ref from URL
    let re = Regex::new(r"https://([^.]+)\.supabase\.co")?;
    let project_ref = re
        .captures(&project_url)
        .and_then(|caps| caps.get(1))
        .map(|m| m.as_str().to_string())
        .context("Could not extract project reference from URL")?;

    // Construct database URL
    let database_url = format!(
        "postgresql://postgres:{}@db.{}.supabase.co:5432/postgres",
        database_password, project_ref
    );

    Ok(SupabaseInfo {
        project_url,
        project_ref,
        anon_key,
        database_password,
        database_url,
    })
}

// =============================================================================
// Step 3: Generate .env Files
// =============================================================================

fn generate_env_files(info: &SupabaseInfo) -> Result<()> {
    println!("\n{}\n", "📝 Step 3: Generating .env Files".cyan().bold());

    let root = get_project_root()?;
    let now = chrono::Utc::now().to_rfc3339();

    // Frontend .env
    let frontend_env_path = root.join("packages/app-frontend/.env");
    let frontend_env = format!(
        r#"# Supabase Configuration
# Generated by akatsuki setup init on {}
VITE_SUPABASE_URL={}
VITE_SUPABASE_ANON_KEY={}

# Backend API (ローカル開発時)
VITE_API_BASE_URL=http://localhost:8000
"#,
        now, info.project_url, info.anon_key
    );

    fs::write(&frontend_env_path, frontend_env)?;
    println!("{} Created: packages/app-frontend/.env", "✓".green());

    // Backend .env
    let backend_env_path = root.join("packages/app-backend/.env");
    let backend_env = format!(
        r#"# Supabase Connection
# Generated by akatsuki setup init on {}
DATABASE_URL={}

# Optional: Supabase Project URL and Anon Key (for client operations)
SUPABASE_URL={}
SUPABASE_ANON_KEY={}

# Optional: AI Model API Keys (if using external services)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
"#,
        now, info.database_url, info.project_url, info.anon_key
    );

    fs::write(&backend_env_path, backend_env)?;
    println!("{} Created: packages/app-backend/.env", "✓".green());

    Ok(())
}

// =============================================================================
// Step 4: Link Supabase Project
// =============================================================================

fn link_supabase_project(project_ref: &str) -> Result<()> {
    println!("\n{}\n", "🔗 Step 4: Linking Supabase Project".cyan().bold());

    let confirm = Confirm::new()
        .with_prompt(format!("Link to Supabase project: {}?", project_ref))
        .default(true)
        .interact()?;

    if !confirm {
        println!(
            "{} Skipped Supabase link. You can run manually: supabase link --project-ref {}",
            "⚠".yellow(),
            project_ref
        );
        return Ok(());
    }

    println!(
        "{} Running: supabase link --project-ref {}",
        "▸".magenta(),
        project_ref
    );

    let root = get_project_root()?;
    let status = Command::new("supabase")
        .args(["link", "--project-ref", project_ref])
        .current_dir(&root)
        .status()?;

    if status.success() {
        println!("{} Supabase project linked successfully!", "✓".green());
    } else {
        println!("{} Failed to link Supabase project", "✗".red());
        println!(
            "{} You can run manually: supabase link --project-ref {}",
            "ℹ".blue(),
            project_ref
        );
    }

    Ok(())
}

// =============================================================================
// Step 5: Apply Migrations
// =============================================================================

fn apply_migrations() -> Result<()> {
    println!(
        "\n{}\n",
        "🗄️  Step 5: Applying Database Migrations".cyan().bold()
    );

    let confirm = Confirm::new()
        .with_prompt("Apply database migrations? (Creates tables, RLS policies, etc.)")
        .default(true)
        .interact()?;

    if !confirm {
        println!(
            "{} Skipped migrations. You can run manually: npm run supabase:push",
            "⚠".yellow()
        );
        return Ok(());
    }

    println!("{} Running: supabase db push", "▸".magenta());

    let root = get_project_root()?;
    let status = Command::new("supabase")
        .args(["db", "push"])
        .current_dir(&root)
        .status()?;

    if status.success() {
        println!("{} Database migrations applied successfully!", "✓".green());
    } else {
        println!("{} Failed to apply migrations", "✗".red());
        println!(
            "{} You can run manually: npm run supabase:push",
            "ℹ".blue()
        );
    }

    Ok(())
}

// =============================================================================
// Step 6: Deploy Edge Functions
// =============================================================================

fn deploy_edge_functions() -> Result<()> {
    println!(
        "\n{}\n",
        "⚡ Step 6: Deploying Edge Functions".cyan().bold()
    );

    println!("{} Edge Functions:", "ℹ".blue());
    println!("{}   ai-chat - LLM API (OpenAI/Anthropic/Gemini)", "▸".magenta());
    println!("{}   generate-image - Image generation", "▸".magenta());
    println!("{}   upload-file - File upload", "▸".magenta());
    println!("{}   create-signed-url - Signed URL generation", "▸".magenta());
    println!("{}   slack-notify - Slack notifications", "▸".magenta());
    println!("{}   send-email - Email sending (Resend)", "▸".magenta());
    println!();

    let confirm = Confirm::new()
        .with_prompt("Deploy all Edge Functions?")
        .default(true)
        .interact()?;

    if !confirm {
        println!(
            "{} Skipped Edge Functions deployment. You can run manually: npm run supabase:function:deploy",
            "⚠".yellow()
        );
        return Ok(());
    }

    println!("{} Running: supabase functions deploy", "▸".magenta());

    let root = get_project_root()?;
    let status = Command::new("supabase")
        .args(["functions", "deploy"])
        .current_dir(&root)
        .status()?;

    if status.success() {
        println!("{} Edge Functions deployed successfully!", "✓".green());
    } else {
        println!("{} Failed to deploy Edge Functions", "✗".red());
        println!(
            "{} You can run manually: npm run supabase:function:deploy",
            "ℹ".blue()
        );
    }

    Ok(())
}

// =============================================================================
// Step 7: Secrets Guide
// =============================================================================

fn guide_secrets_setup() {
    println!("\n{}\n", "🔑 Step 7: Supabase Secrets Setup".cyan().bold());

    println!(
        "{} To use AI features, you need to set up API keys as Supabase Secrets:",
        "ℹ".blue()
    );
    println!();
    println!("{} Required for LLM features:", "▸".magenta());
    println!("  supabase secrets set OPENAI_API_KEY=sk-...");
    println!("  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...");
    println!("  supabase secrets set GEMINI_API_KEY=AIza...");
    println!();
    println!("{} Optional for external integrations:", "▸".magenta());
    println!("  supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/...");
    println!("  supabase secrets set RESEND_API_KEY=re_...");
    println!("  supabase secrets set EMAIL_FROM=noreply@yourdomain.com");
    println!();
    println!(
        "{} You can set these later. See docs/setup.md for details.",
        "ℹ".blue()
    );
}

// =============================================================================
// Step 8: Verify Backend
// =============================================================================

fn verify_backend() -> Result<()> {
    println!(
        "\n{}\n",
        "🔍 Step 8: Verifying Backend Setup".cyan().bold()
    );

    let confirm = Confirm::new()
        .with_prompt("Run backend compile check (cargo check)?")
        .default(true)
        .interact()?;

    if !confirm {
        println!(
            "{} Skipped backend check. You can run manually: npm run check:backend",
            "⚠".yellow()
        );
        return Ok(());
    }

    println!(
        "{} Running: cargo check (in packages/app-backend)",
        "▸".magenta()
    );

    let root = get_project_root()?;
    let backend_dir = root.join("packages/app-backend");

    let status = Command::new("cargo")
        .args(["check"])
        .current_dir(&backend_dir)
        .status()?;

    if status.success() {
        println!("{} Backend compiles successfully!", "✓".green());
    } else {
        println!("{} Backend compilation failed", "✗".red());
        println!(
            "{} Check your .env file and dependencies",
            "ℹ".blue()
        );
    }

    Ok(())
}

// =============================================================================
// Step 9: Claude Code Hooks
// =============================================================================

fn setup_claude_code_hooks() -> Result<()> {
    println!(
        "\n{}\n",
        "🔔 Step 9: Claude Code Development Experience (Optional)"
            .cyan()
            .bold()
    );

    println!(
        "{} Claude Code can play a notification sound when AI completes a task.",
        "ℹ".blue()
    );
    println!(
        "{} This is very useful for VibeCoding - you can focus on other work while AI implements.",
        "ℹ".blue()
    );
    println!();

    let setup_hooks = Confirm::new()
        .with_prompt("Setup Claude Code notification hooks?")
        .default(true)
        .interact()?;

    if !setup_hooks {
        println!("{} Skipped Claude Code hooks setup.", "ℹ".blue());
        return Ok(());
    }

    let root = get_project_root()?;
    let claude_dir = root.join(".claude");
    let settings_path = claude_dir.join("settings.local.json");

    // Ensure .claude directory exists
    if !claude_dir.exists() {
        fs::create_dir_all(&claude_dir)?;
        println!("{} Created .claude/ directory", "✓".green());
    }

    // Read existing settings or create new
    let mut settings: Value = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)?;
        match serde_json::from_str(&content) {
            Ok(v) => {
                println!("{} .claude/settings.local.json already exists", "ℹ".blue());
                v
            }
            Err(_) => {
                println!(
                    "{} Could not parse existing settings.local.json, will create new",
                    "⚠".yellow()
                );
                json!({})
            }
        }
    } else {
        json!({})
    };

    // Check if hooks already exist
    if settings.get("hooks").and_then(|h| h.get("Stop")).is_some() {
        println!(
            "{} Hooks already configured. Skipping to avoid overwriting existing setup.",
            "ℹ".blue()
        );
        return Ok(());
    }

    // Detect platform and suggest appropriate command
    let (sound_command, sound_name) = if cfg!(target_os = "macos") {
        (
            "afplay /System/Library/Sounds/Glass.aiff",
            "Glass (macOS)",
        )
    } else if cfg!(target_os = "linux") {
        (
            "paplay /usr/share/sounds/freedesktop/stereo/complete.oga",
            "complete.oga (Linux)",
        )
    } else if cfg!(target_os = "windows") {
        ("[console]::beep(800,300)", "System beep (Windows)")
    } else {
        println!(
            "{} Unknown platform. Skipping hooks setup.",
            "⚠".yellow()
        );
        return Ok(());
    };

    println!("{} Recommended notification sound: {}", "▸".magenta(), sound_name);
    println!();

    let confirm_sound = Confirm::new()
        .with_prompt(format!("Add notification hook: {}?", sound_command))
        .default(true)
        .interact()?;

    if !confirm_sound {
        println!("{} Skipped adding notification hooks.", "ℹ".blue());
        return Ok(());
    }

    // Add hooks to settings
    settings["hooks"] = json!({
        "Stop": [{
            "matcher": "",
            "hooks": [{
                "type": "command",
                "command": sound_command
            }]
        }]
    });

    // Write settings
    fs::write(&settings_path, serde_json::to_string_pretty(&settings)? + "\n")?;
    println!(
        "{} Added notification hook to .claude/settings.local.json",
        "✓".green()
    );
    println!(
        "{} Now Claude Code will play a sound when it completes tasks!",
        "ℹ".blue()
    );

    Ok(())
}

// =============================================================================
// Step 10: Initial Commit
// =============================================================================

fn create_initial_commit(info: &ProjectInfo) -> Result<()> {
    println!("\n{}\n", "📝 Step 10: Initial Git Commit".cyan().bold());

    let create_commit = Confirm::new()
        .with_prompt("Create initial Git commit?")
        .default(true)
        .interact()?;

    if !create_commit {
        println!(
            "{} Skipped initial commit. You can commit manually later.",
            "ℹ".blue()
        );
        return Ok(());
    }

    let root = get_project_root()?;

    println!("{} Adding files to Git...", "▸".magenta());
    run_command("git", &["add", "."], &root)?;

    println!("{} Creating initial commit...", "▸".magenta());

    let commit_message = format!(
        r#"Initial commit: {}

{}

Generated with Akatsuki template 🚀

Setup completed:
- Project name: {}
- Supabase connected
- Database migrations applied
- Edge Functions deployed"#,
        info.name, info.description, info.name
    );

    let status = Command::new("git")
        .args(["commit", "-m", &commit_message])
        .current_dir(&root)
        .status()?;

    if status.success() {
        println!("{} Created initial commit", "✓".green());
    } else {
        println!("{} Failed to create initial commit", "✗".red());
        println!(
            "{} You can commit manually: git add . && git commit -m \"Initial commit\"",
            "ℹ".blue()
        );
    }

    Ok(())
}

// =============================================================================
// Summary
// =============================================================================

fn display_summary(info: &ProjectInfo) {
    println!("\n{}\n", "🎉 Setup Complete!".cyan().bold());

    println!("{} {}", "Project:".bold(), info.name.green());
    if info.description != info.name {
        println!("{} {}", "Description:".bold(), info.description.cyan());
    }
    println!();
    println!("{}", "Next Steps:".bold());
    println!();
    println!("1. Start development servers:");
    println!(
        "   {}  # Terminal 1 (http://localhost:5173)",
        "npm run dev:frontend".cyan()
    );
    println!(
        "   {}   # Terminal 2 (http://localhost:8000)",
        "npm run dev:backend".cyan()
    );
    println!();
    println!("2. Set up Supabase Secrets (if not done):");
    println!("   {}", "supabase secrets set OPENAI_API_KEY=sk-...".cyan());
    println!();
    println!("3. Read the documentation:");
    println!("   {} - Detailed setup guide", "docs/setup.md".cyan());
    println!("   {} - Development guidelines", "AGENT.md".cyan());
    println!();
    println!("4. Push to your remote repository:");
    println!("   {}", "git remote add origin <your-repo-url>".cyan());
    println!("   {}", "git push -u origin main".cyan());
    println!();
    println!("{} Happy coding! 🚀", "✓".green());
}

// =============================================================================
// Helper Functions
// =============================================================================

fn get_command_output(cmd: &str, args: &[&str]) -> Option<String> {
    Command::new(cmd)
        .args(args)
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                None
            }
        })
}

fn run_command(cmd: &str, args: &[&str], dir: &Path) -> Result<()> {
    let status = Command::new(cmd).args(args).current_dir(dir).status()?;

    if !status.success() {
        anyhow::bail!("Command failed: {} {:?}", cmd, args);
    }

    Ok(())
}
