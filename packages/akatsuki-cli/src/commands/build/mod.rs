use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::BuildTarget;

pub struct BuildCommand;

impl BuildCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: BuildTarget) -> Result<()> {
        match target {
            BuildTarget::Frontend => self.build_frontend(),
            BuildTarget::Backend => self.build_backend(),
            BuildTarget::All => self.build_all(),
        }
    }

    fn build_frontend(&self) -> Result<()> {
        println!("{}", "🏗️  Building frontend...".cyan());

        let status = Command::new("npm")
            .args(["run", "build", "--workspace=app-frontend"])
            .status()
            .context("Failed to build frontend")?;

        if !status.success() {
            anyhow::bail!("Frontend build failed");
        }

        println!("{}", "✅ Frontend build completed!".green());
        Ok(())
    }

    fn build_backend(&self) -> Result<()> {
        println!("{}", "🦀 Building backend...".cyan());

        let status = Command::new("cargo")
            .args(["build", "--release"])
            .current_dir("packages/app-backend")
            .status()
            .context("Failed to build backend")?;

        if !status.success() {
            anyhow::bail!("Backend build failed");
        }

        println!("{}", "✅ Backend build completed!".green());
        Ok(())
    }

    fn build_all(&self) -> Result<()> {
        println!("{}", "🏗️  Building entire project...".cyan().bold());

        // Build frontend first (faster)
        self.build_frontend()?;

        println!();

        // Build backend
        self.build_backend()?;

        println!();
        println!("{}", "✨ All builds completed successfully!".green().bold());

        Ok(())
    }
}
