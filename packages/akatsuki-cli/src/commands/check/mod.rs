use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::CheckTarget;
use crate::utils::find_project_root;

pub mod navigation;

pub struct CheckCommand;

impl CheckCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: CheckTarget) -> Result<()> {
        match target {
            CheckTarget::Frontend => self.check_frontend(),
            CheckTarget::Backend => self.check_backend(),
            CheckTarget::Cli => self.check_cli(),
            CheckTarget::AdminCli => self.check_admin_cli(),
            CheckTarget::All => self.check_all(),
        }
    }

    fn check_frontend(&self) -> Result<()> {
        println!("{}", "🔍 Checking frontend (typecheck)...".cyan());

        let status = Command::new("npm")
            .args(["run", "typecheck", "--workspace=app-frontend"])
            .status()
            .context("Failed to run typecheck")?;

        if !status.success() {
            anyhow::bail!("Frontend typecheck failed");
        }

        println!("{}", "✅ Frontend typecheck passed!".green());
        Ok(())
    }

    fn check_backend(&self) -> Result<()> {
        println!("{}", "🦀 Checking backend (cargo check)...".cyan());

        let project_root = find_project_root();
        let status = Command::new("cargo")
            .args(["check"])
            .current_dir(project_root.join("packages/app-backend"))
            .status()
            .context("Failed to run cargo check")?;

        if !status.success() {
            anyhow::bail!("Backend check failed");
        }

        println!("{}", "✅ Backend check passed!".green());
        Ok(())
    }

    fn check_cli(&self) -> Result<()> {
        println!("{}", "📟 Checking CLI (typecheck)...".cyan());

        let status = Command::new("npm")
            .args(["run", "typecheck", "--workspace=app-cli"])
            .status()
            .context("Failed to run typecheck")?;

        if !status.success() {
            anyhow::bail!("CLI typecheck failed");
        }

        println!("{}", "✅ CLI typecheck passed!".green());
        Ok(())
    }

    fn check_admin_cli(&self) -> Result<()> {
        println!("{}", "🦀 Checking admin-cli (cargo check)...".cyan());

        let project_root = find_project_root();
        let status = Command::new("cargo")
            .args(["check"])
            .current_dir(project_root.join("packages/akatsuki-cli"))
            .status()
            .context("Failed to run cargo check")?;

        if !status.success() {
            anyhow::bail!("admin-cli check failed");
        }

        println!("{}", "✅ admin-cli check passed!".green());
        Ok(())
    }

    fn check_all(&self) -> Result<()> {
        println!("{}", "🔍 Running all type checks...".cyan().bold());

        self.check_frontend()?;
        println!();

        self.check_cli()?;
        println!();

        self.check_backend()?;
        println!();

        self.check_admin_cli()?;
        println!();

        println!("{}", "✨ All type checks passed!".green().bold());
        Ok(())
    }
}
