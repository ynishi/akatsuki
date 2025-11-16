use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::TestTarget;

pub struct TestCommand;

impl TestCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: TestTarget) -> Result<()> {
        match target {
            TestTarget::Frontend => self.test_frontend(),
            TestTarget::Backend => self.test_backend(),
            TestTarget::All => self.test_all(),
        }
    }

    fn test_frontend(&self) -> Result<()> {
        println!("{}", "🧪 Running frontend tests...".cyan());

        // Note: Frontend tests not configured yet
        println!("{}", "  ℹ️  No frontend tests configured yet".yellow());
        println!("{}", "  Add test framework (Vitest, Jest, etc.) to run tests".yellow());

        Ok(())
    }

    fn test_backend(&self) -> Result<()> {
        println!("{}", "🦀 Running backend tests...".cyan());

        let status = Command::new("cargo")
            .args(["test"])
            .current_dir("packages/app-backend")
            .status()
            .context("Failed to run cargo test")?;

        if !status.success() {
            anyhow::bail!("Backend tests failed");
        }

        println!("{}", "✅ Backend tests passed!".green());
        Ok(())
    }

    fn test_all(&self) -> Result<()> {
        println!("{}", "🧪 Running all tests...".cyan().bold());

        // Test frontend first
        self.test_frontend()?;

        println!();

        // Test backend
        self.test_backend()?;

        println!();
        println!("{}", "✨ All tests passed!".green().bold());

        Ok(())
    }
}
