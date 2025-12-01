use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::LintTarget;
use crate::commands::check::navigation;
use crate::utils::find_project_root;

pub struct LintCommand;

impl LintCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: LintTarget, fix: bool) -> Result<()> {
        match target {
            LintTarget::Frontend => self.lint_frontend(fix),
            LintTarget::Backend => self.lint_backend(fix),
            LintTarget::Cli => self.lint_cli(fix),
            LintTarget::AdminCli => self.lint_admin_cli(fix),
            LintTarget::All => self.lint_all(fix),
        }
    }

    fn lint_frontend(&self, fix: bool) -> Result<()> {
        println!("{}", "🔍 Linting frontend (eslint)...".cyan());

        let project_root = find_project_root();

        // Run eslint
        let mut args = vec!["run", "lint:vibe", "--workspace=app-frontend"];
        if fix {
            args.push("--");
            args.push("--fix");
        }

        let status = Command::new("npm")
            .args(&args)
            .status()
            .context("Failed to run eslint")?;

        if !status.success() {
            anyhow::bail!("Frontend eslint failed");
        }

        // Check navigation consistency
        let nav_ok = navigation::check_navigation_consistency(&project_root)?;
        if !nav_ok {
            anyhow::bail!("Navigation consistency check failed");
        }

        println!("{}", "✅ Frontend lint passed!".green());
        Ok(())
    }

    fn lint_backend(&self, fix: bool) -> Result<()> {
        println!("{}", "🦀 Linting backend (cargo clippy)...".cyan());

        let project_root = find_project_root();
        let mut args = vec![
            "clippy",
            "--all-targets",
            "--all-features",
        ];

        if fix {
            args.extend(["--fix", "--allow-dirty", "--allow-staged"]);
        }

        args.extend(["--", "-D", "warnings"]);

        let status = Command::new("cargo")
            .args(&args)
            .current_dir(project_root.join("packages/app-backend"))
            .status()
            .context("Failed to run cargo clippy")?;

        if !status.success() {
            anyhow::bail!("Backend clippy failed");
        }

        println!("{}", "✅ Backend lint passed!".green());
        Ok(())
    }

    fn lint_cli(&self, fix: bool) -> Result<()> {
        println!("{}", "📟 Linting CLI (eslint)...".cyan());

        let mut args = vec!["run", "lint", "--workspace=app-cli"];
        if fix {
            args.push("--");
            args.push("--fix");
        }

        let status = Command::new("npm")
            .args(&args)
            .status()
            .context("Failed to run eslint")?;

        if !status.success() {
            anyhow::bail!("CLI eslint failed");
        }

        println!("{}", "✅ CLI lint passed!".green());
        Ok(())
    }

    fn lint_admin_cli(&self, fix: bool) -> Result<()> {
        println!("{}", "🦀 Linting admin-cli (cargo clippy)...".cyan());

        let project_root = find_project_root();
        let mut args = vec![
            "clippy",
            "--all-targets",
        ];

        if fix {
            args.extend(["--fix", "--allow-dirty", "--allow-staged"]);
        }

        args.extend(["--", "-D", "warnings"]);

        let status = Command::new("cargo")
            .args(&args)
            .current_dir(project_root.join("packages/akatsuki-cli"))
            .status()
            .context("Failed to run cargo clippy")?;

        if !status.success() {
            anyhow::bail!("admin-cli clippy failed");
        }

        println!("{}", "✅ admin-cli lint passed!".green());
        Ok(())
    }

    fn lint_all(&self, fix: bool) -> Result<()> {
        println!(
            "{}",
            format!("🔍 Running all lints{}...", if fix { " (with --fix)" } else { "" })
                .cyan()
                .bold()
        );

        self.lint_frontend(fix)?;
        println!();

        self.lint_cli(fix)?;
        println!();

        self.lint_backend(fix)?;
        println!();

        self.lint_admin_cli(fix)?;
        println!();

        println!("{}", "✨ All lints passed!".green().bold());
        Ok(())
    }
}
