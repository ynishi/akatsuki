use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::FmtTarget;
use crate::utils::find_project_root;

pub struct FmtCommand;

impl FmtCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: FmtTarget) -> Result<()> {
        match target {
            FmtTarget::Frontend => self.fmt_frontend(),
            FmtTarget::Backend => self.fmt_backend(),
            FmtTarget::Cli => self.fmt_cli(),
            FmtTarget::AdminCli => self.fmt_admin_cli(),
            FmtTarget::All => self.fmt_all(),
        }
    }

    fn fmt_frontend(&self) -> Result<()> {
        println!("{}", "🎨 Formatting frontend...".cyan());

        let status = Command::new("npm")
            .args(["run", "format", "--workspace=app-frontend"])
            .status()
            .context("Failed to run npm format for frontend")?;

        if !status.success() {
            anyhow::bail!("Frontend format failed");
        }

        println!("{}", "✅ Frontend formatted!".green());
        Ok(())
    }

    fn fmt_backend(&self) -> Result<()> {
        println!("{}", "🦀 Formatting backend (Rust)...".cyan());

        let project_root = find_project_root();
        let manifest_path = project_root.join("packages/app-backend/Cargo.toml");

        let status = Command::new("cargo")
            .args(["fmt", "--manifest-path", manifest_path.to_str().unwrap()])
            .status()
            .context("Failed to run cargo fmt for backend")?;

        if !status.success() {
            anyhow::bail!("Backend format failed");
        }

        println!("{}", "✅ Backend formatted!".green());
        Ok(())
    }

    fn fmt_cli(&self) -> Result<()> {
        println!("{}", "📟 Formatting CLI (TypeScript)...".cyan());

        let status = Command::new("npm")
            .args(["run", "format", "--workspace=app-cli"])
            .status()
            .context("Failed to run npm format for CLI")?;

        if !status.success() {
            anyhow::bail!("CLI format failed");
        }

        println!("{}", "✅ CLI formatted!".green());
        Ok(())
    }

    fn fmt_admin_cli(&self) -> Result<()> {
        println!("{}", "🦀 Formatting admin-cli (Rust)...".cyan());

        let project_root = find_project_root();
        let manifest_path = project_root.join("packages/akatsuki-cli/Cargo.toml");

        let status = Command::new("cargo")
            .args(["fmt", "--manifest-path", manifest_path.to_str().unwrap()])
            .status()
            .context("Failed to run cargo fmt for admin-cli")?;

        if !status.success() {
            anyhow::bail!("admin-cli format failed");
        }

        println!("{}", "✅ admin-cli formatted!".green());
        Ok(())
    }

    fn fmt_all(&self) -> Result<()> {
        println!("{}", "🎨 Formatting all...".cyan().bold());

        self.fmt_frontend()?;
        println!();

        self.fmt_cli()?;
        println!();

        self.fmt_backend()?;
        println!();

        self.fmt_admin_cli()?;
        println!();

        println!("{}", "✨ All formatted!".green().bold());
        Ok(())
    }
}
