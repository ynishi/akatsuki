use anyhow::{Context, Result};
use colored::Colorize;
use std::path::PathBuf;
use std::process::Command;

use crate::cli::CheckTarget;

mod navigation;

pub struct CheckCommand {
    project_root: PathBuf,
}

impl CheckCommand {
    pub fn new() -> Self {
        Self {
            project_root: Self::find_project_root(),
        }
    }

    fn find_project_root() -> PathBuf {
        let mut current = std::env::current_dir().unwrap();

        loop {
            // Check for package.json with workspaces
            let package_json = current.join("package.json");
            if package_json.exists() {
                if let Ok(content) = std::fs::read_to_string(&package_json) {
                    if content.contains("\"workspaces\"") {
                        return current;
                    }
                }
            }

            // Check for packages directory
            if current.join("packages").is_dir() && current.join("packages/app-frontend").is_dir() {
                return current;
            }

            // Move up to parent directory
            if let Some(parent) = current.parent() {
                current = parent.to_path_buf();
            } else {
                return std::env::current_dir().unwrap();
            }
        }
    }

    pub fn execute(&self, target: CheckTarget) -> Result<()> {
        match target {
            CheckTarget::Frontend => self.check_frontend(),
            CheckTarget::Backend => self.check_backend(),
            CheckTarget::Cli => self.check_cli(),
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

        // Check navigation consistency
        let nav_ok = navigation::check_navigation_consistency(&self.project_root)?;
        if !nav_ok {
            anyhow::bail!("Navigation consistency check failed");
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

    fn check_cli(&self) -> Result<()> {
        println!("{}", "📟 Checking CLI...".cyan());

        // Run typecheck for app-cli
        println!("{}", "  Running typecheck...".cyan());
        let typecheck_status = Command::new("npm")
            .args(["run", "typecheck", "--workspace=app-cli"])
            .status()
            .context("Failed to run typecheck")?;

        if !typecheck_status.success() {
            anyhow::bail!("CLI typecheck failed");
        }

        println!("{}", "✅ CLI check passed!".green());
        Ok(())
    }

    fn check_all(&self) -> Result<()> {
        println!("{}", "🔍 Running all checks...".cyan().bold());

        // Check frontend first (faster)
        self.check_frontend()?;

        println!();

        // Check CLI
        self.check_cli()?;

        println!();

        // Check backend
        self.check_backend()?;

        println!();
        println!("{}", "✨ All checks passed!".green().bold());

        Ok(())
    }
}
