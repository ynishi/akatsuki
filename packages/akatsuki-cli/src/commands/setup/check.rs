use anyhow::Result;
use colored::*;
use std::fs;
use std::process::Command;

use crate::utils::get_project_root;

pub fn execute() -> Result<()> {
    println!("\n{}\n", "🔍 Akatsuki Setup Status".cyan().bold());

    check_prerequisites();
    check_env_files()?;
    check_supabase_link()?;
    check_migrations()?;
    check_edge_functions()?;
    check_secrets();
    check_backend()?;
    display_summary()?;

    Ok(())
}

fn check_prerequisites() {
    println!("{}\n", "📋 Prerequisites".cyan().bold());

    // Node.js
    let node_version = get_command_output("node", &["--version"]);
    if let Some(version) = &node_version {
        let major = version
            .trim_start_matches('v')
            .split('.')
            .next()
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(0);
        display_check("Node.js", major >= 20, version);
    } else {
        display_check("Node.js", false, "Not found");
    }

    // Rust
    let rust_version = get_command_output("rustc", &["--version"]);
    display_check(
        "Rust",
        rust_version.is_some(),
        rust_version.as_deref().unwrap_or(""),
    );

    // Cargo
    let cargo_version = get_command_output("cargo", &["--version"]);
    display_check(
        "Cargo",
        cargo_version.is_some(),
        cargo_version.as_deref().unwrap_or(""),
    );

    // Shuttle CLI
    let shuttle_version = get_command_output("cargo", &["shuttle", "--version"]);
    display_check(
        "Shuttle CLI",
        shuttle_version.is_some(),
        shuttle_version.as_deref().unwrap_or(""),
    );

    // Supabase CLI
    let supabase_version = get_command_output("supabase", &["--version"]);
    display_check(
        "Supabase CLI",
        supabase_version.is_some(),
        supabase_version.as_deref().unwrap_or(""),
    );
}

fn check_env_files() -> Result<()> {
    println!("\n{}\n", "📝 Environment Files".cyan().bold());

    let root = get_project_root()?;

    // Frontend .env
    let frontend_env = root.join("packages/app-frontend/.env");
    let frontend_exists = frontend_env.exists();
    display_check(
        "Frontend .env",
        frontend_exists,
        "./packages/app-frontend/.env",
    );

    if frontend_exists {
        let content = fs::read_to_string(&frontend_env)?;
        let has_url = content.contains("VITE_SUPABASE_URL=");
        let has_key = content.contains("VITE_SUPABASE_ANON_KEY=");
        display_check("  - VITE_SUPABASE_URL", has_url, "");
        display_check("  - VITE_SUPABASE_ANON_KEY", has_key, "");
    }

    // Backend .env
    let backend_env = root.join("packages/app-backend/.env");
    let backend_exists = backend_env.exists();
    display_check(
        "Backend .env",
        backend_exists,
        "./packages/app-backend/.env",
    );

    if backend_exists {
        let content = fs::read_to_string(&backend_env)?;
        let has_db = content.contains("DATABASE_URL=");
        display_check("  - DATABASE_URL", has_db, "");
    }

    Ok(())
}

fn check_supabase_link() -> Result<()> {
    println!("\n{}\n", "🔗 Supabase Link".cyan().bold());

    let root = get_project_root()?;
    let project_ref_path = root.join("supabase/.temp/project-ref");

    if project_ref_path.exists() {
        let project_ref = fs::read_to_string(&project_ref_path)?;
        display_check("Supabase Project Linked", true, &project_ref.trim());
    } else {
        display_check("Supabase Project Linked", false, "Run: supabase link");
    }

    Ok(())
}

fn check_migrations() -> Result<()> {
    println!("\n{}\n", "🗄️  Database Migrations".cyan().bold());

    let root = get_project_root()?;
    let migrations_dir = root.join("supabase/migrations");

    if migrations_dir.exists() {
        let count = fs::read_dir(&migrations_dir)?
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                entry
                    .path()
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s == "sql")
                    .unwrap_or(false)
            })
            .count();

        display_check("Migration Files", count > 0, &format!("{} files", count));
    } else {
        display_check("Migration Files", false, "No migrations directory");
    }

    println!(
        "\n  {} To verify applied migrations, run: {}",
        "ℹ".yellow(),
        "supabase db diff".cyan()
    );

    Ok(())
}

fn check_edge_functions() -> Result<()> {
    println!("\n{}\n", "⚡ Edge Functions".cyan().bold());

    let root = get_project_root()?;
    let functions_dir = root.join("supabase/functions");

    if functions_dir.exists() {
        let functions: Vec<_> = fs::read_dir(&functions_dir)?
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                entry.path().is_dir()
                    && entry
                        .file_name()
                        .to_str()
                        .map(|s| s != "_shared")
                        .unwrap_or(false)
            })
            .collect();

        display_check(
            "Edge Functions",
            !functions.is_empty(),
            &format!("{} functions", functions.len()),
        );

        for entry in functions {
            let fn_name = entry.file_name();
            let index_path = entry.path().join("index.ts");
            let exists = index_path.exists();
            let icon = if exists { "✓".green() } else { "✗".red() };
            println!("    - {} {}", icon, fn_name.to_string_lossy());
        }
    } else {
        display_check("Edge Functions", false, "No functions directory");
    }

    println!(
        "\n  {} To deploy, run: {}",
        "ℹ".yellow(),
        "npm run supabase:function:deploy".cyan()
    );

    Ok(())
}

fn check_secrets() {
    println!("\n{}\n", "🔑 Supabase Secrets".cyan().bold());

    println!(
        "  {} To check secrets, run: {}",
        "ℹ".yellow(),
        "supabase secrets list".cyan()
    );
    println!("\n  Required for AI features:");
    println!("    - OPENAI_API_KEY");
    println!("    - ANTHROPIC_API_KEY");
    println!("    - GEMINI_API_KEY");
}

fn check_backend() -> Result<()> {
    println!("\n{}\n", "🦀 Backend (Rust)".cyan().bold());

    let root = get_project_root()?;
    let cargo_toml = root.join("packages/app-backend/Cargo.toml");

    display_check("Cargo.toml", cargo_toml.exists(), "");

    println!(
        "\n  {} To verify compilation, run: {}",
        "ℹ".yellow(),
        "npm run check:backend".cyan()
    );

    Ok(())
}

fn display_summary() -> Result<()> {
    println!("\n{}\n", "📊 Summary".cyan().bold());

    let root = get_project_root()?;

    let frontend_env_exists = root.join("packages/app-frontend/.env").exists();
    let backend_env_exists = root.join("packages/app-backend/.env").exists();
    let project_ref_exists = root.join("supabase/.temp/project-ref").exists();

    let setup_complete = frontend_env_exists && backend_env_exists && project_ref_exists;

    if setup_complete {
        println!("  {} Basic setup is complete!", "✓".green());
        println!("\n  {}", "Next Steps:".bold());
        println!(
            "    1. Set up Supabase Secrets: {}",
            "supabase secrets set KEY=VALUE".cyan()
        );
        println!(
            "    2. Deploy Edge Functions: {}",
            "npm run supabase:function:deploy".cyan()
        );
        println!(
            "    3. Start development: {} & {}",
            "npm run dev:frontend".cyan(),
            "npm run dev:backend".cyan()
        );
    } else {
        println!(
            "  {} Setup is incomplete. Run: {}",
            "⚠".yellow(),
            "npm run setup".cyan()
        );
    }

    println!();

    Ok(())
}

// Helper functions

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

fn display_check(label: &str, passed: bool, details: &str) {
    let icon = if passed { "✓".green() } else { "✗".red() };
    let status = if passed {
        "OK".green()
    } else {
        "Missing".red()
    };
    let details_str = if !details.is_empty() {
        format!(" {}", details.blue())
    } else {
        String::new()
    };
    println!("  {} {}: {}{}", icon, label, status, details_str);
}
