use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::TestTarget;

pub struct TestCommand;

impl TestCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: TestTarget, watch: bool, ui: bool, coverage: bool) -> Result<()> {
        match target {
            TestTarget::Frontend => self.test_frontend(watch, ui, coverage),
            TestTarget::Backend => self.test_backend(),
            TestTarget::All => self.test_all(watch, ui, coverage),
        }
    }

    fn test_frontend(&self, watch: bool, ui: bool, coverage: bool) -> Result<()> {
        println!("{}", "🧪 Running frontend tests...".cyan());

        let mut args = vec!["run"];

        // Determine which command to run based on flags
        if ui {
            args.push("test:ui");
            println!("{}", "  🎨 Opening UI dashboard...".blue());
        } else if coverage {
            args.push("test:coverage");
            println!("{}", "  📊 Generating coverage report...".blue());
        } else if watch {
            args.push("test");
            println!("{}", "  👀 Watch mode enabled...".blue());
        } else {
            args.push("test:run");
        }

        let status = Command::new("npm")
            .args(&args)
            .current_dir("packages/app-frontend")
            .status()
            .context("Failed to run npm test")?;

        if !status.success() {
            anyhow::bail!("Frontend tests failed");
        }

        if !watch && !ui {
            println!("{}", "✅ Frontend tests passed!".green());
        }
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

    fn test_all(&self, watch: bool, ui: bool, coverage: bool) -> Result<()> {
        println!("{}", "🧪 Running all tests...".cyan().bold());

        // Test frontend first
        self.test_frontend(watch, ui, coverage)?;

        println!();

        // Test backend
        self.test_backend()?;

        if !watch && !ui {
            println!();
            println!("{}", "✨ All tests passed!".green().bold());
        }

        Ok(())
    }
}
