use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::CheckTarget;

pub struct CheckCommand;

impl CheckCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: CheckTarget) -> Result<()> {
        match target {
            CheckTarget::Frontend => self.check_frontend(),
            CheckTarget::Backend => self.check_backend(),
            CheckTarget::All => self.check_all(),
        }
    }

    fn check_frontend(&self) -> Result<()> {
        println!("{}", "🔍 Checking frontend...".cyan());

        // Run lint:vibe (VibeCoding specific lint)
        println!("{}", "  Running lint:vibe...".cyan());
        let lint_status = Command::new("npm")
            .args(["run", "lint:vibe", "--workspace=app-frontend"])
            .status()
            .context("Failed to run lint:vibe")?;

        if !lint_status.success() {
            anyhow::bail!("Frontend lint:vibe failed");
        }

        // Run typecheck
        println!("{}", "  Running typecheck...".cyan());
        let typecheck_status = Command::new("npm")
            .args(["run", "typecheck", "--workspace=app-frontend"])
            .status()
            .context("Failed to run typecheck")?;

        if !typecheck_status.success() {
            anyhow::bail!("Frontend typecheck failed");
        }

        println!("{}", "✅ Frontend checks passed!".green());
        Ok(())
    }

    fn check_backend(&self) -> Result<()> {
        println!("{}", "🦀 Checking backend...".cyan());

        let status = Command::new("cargo")
            .args(["check"])
            .current_dir("packages/app-backend")
            .status()
            .context("Failed to run cargo check")?;

        if !status.success() {
            anyhow::bail!("Backend check failed");
        }

        println!("{}", "✅ Backend check passed!".green());
        Ok(())
    }

    fn check_all(&self) -> Result<()> {
        println!("{}", "🔍 Running all checks...".cyan().bold());

        // Check frontend first (faster)
        self.check_frontend()?;

        println!();

        // Check backend
        self.check_backend()?;

        println!();
        println!("{}", "✨ All checks passed!".green().bold());

        Ok(())
    }
}
