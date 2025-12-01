use anyhow::Result;
use colored::Colorize;

use crate::cli::{CheckTarget, FmtTarget, LintTarget, PreflightTarget, TestTarget};
use crate::commands::check::CheckCommand;
use crate::commands::fmt::FmtCommand;
use crate::commands::lint::LintCommand;
use crate::commands::test::TestCommand;

pub struct PreflightCommand;

impl PreflightCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: PreflightTarget) -> Result<()> {
        println!(
            "{}",
            "🚦 Running preflight checks (fmt → lint → check → test)..."
                .cyan()
                .bold()
        );
        println!();

        match target {
            PreflightTarget::Frontend => self.preflight_frontend(),
            PreflightTarget::Backend => self.preflight_backend(),
            PreflightTarget::Cli => self.preflight_cli(),
            PreflightTarget::AdminCli => self.preflight_admin_cli(),
            PreflightTarget::All => self.preflight_all(),
        }
    }

    fn preflight_frontend(&self) -> Result<()> {
        println!("{}", "━━━ Frontend Preflight ━━━".bright_blue().bold());
        println!();

        // 1. Format
        println!("{}", "1️⃣  Formatting...".cyan());
        FmtCommand::new().execute(FmtTarget::Frontend)?;
        println!();

        // 2. Lint
        println!("{}", "2️⃣  Linting...".cyan());
        LintCommand::new().execute(LintTarget::Frontend, true)?;
        println!();

        // 3. Check
        println!("{}", "3️⃣  Type checking...".cyan());
        CheckCommand::new().execute(CheckTarget::Frontend)?;
        println!();

        // 4. Test
        println!("{}", "4️⃣  Testing...".cyan());
        TestCommand::new().execute(TestTarget::Frontend, false, false, false)?;
        println!();

        println!("{}", "✅ Frontend preflight passed!".green().bold());
        Ok(())
    }

    fn preflight_backend(&self) -> Result<()> {
        println!("{}", "━━━ Backend Preflight ━━━".bright_blue().bold());
        println!();

        // 1. Format
        println!("{}", "1️⃣  Formatting...".cyan());
        FmtCommand::new().execute(FmtTarget::Backend)?;
        println!();

        // 2. Lint
        println!("{}", "2️⃣  Linting...".cyan());
        LintCommand::new().execute(LintTarget::Backend, true)?;
        println!();

        // 3. Check
        println!("{}", "3️⃣  Type checking...".cyan());
        CheckCommand::new().execute(CheckTarget::Backend)?;
        println!();

        // 4. Test
        println!("{}", "4️⃣  Testing...".cyan());
        TestCommand::new().execute(TestTarget::Backend, false, false, false)?;
        println!();

        println!("{}", "✅ Backend preflight passed!".green().bold());
        Ok(())
    }

    fn preflight_cli(&self) -> Result<()> {
        println!("{}", "━━━ CLI Preflight ━━━".bright_blue().bold());
        println!();

        // 1. Format
        println!("{}", "1️⃣  Formatting...".cyan());
        FmtCommand::new().execute(FmtTarget::Cli)?;
        println!();

        // 2. Lint
        println!("{}", "2️⃣  Linting...".cyan());
        LintCommand::new().execute(LintTarget::Cli, true)?;
        println!();

        // 3. Check
        println!("{}", "3️⃣  Type checking...".cyan());
        CheckCommand::new().execute(CheckTarget::Cli)?;
        println!();

        // CLI doesn't have tests currently
        println!("{}", "4️⃣  Testing... (skipped - no tests)".yellow());
        println!();

        println!("{}", "✅ CLI preflight passed!".green().bold());
        Ok(())
    }

    fn preflight_admin_cli(&self) -> Result<()> {
        println!("{}", "━━━ Admin-CLI Preflight ━━━".bright_blue().bold());
        println!();

        // 1. Format
        println!("{}", "1️⃣  Formatting...".cyan());
        FmtCommand::new().execute(FmtTarget::AdminCli)?;
        println!();

        // 2. Lint
        println!("{}", "2️⃣  Linting...".cyan());
        LintCommand::new().execute(LintTarget::AdminCli, true)?;
        println!();

        // 3. Check
        println!("{}", "3️⃣  Type checking...".cyan());
        CheckCommand::new().execute(CheckTarget::AdminCli)?;
        println!();

        // 4. Test (cargo test)
        println!("{}", "4️⃣  Testing...".cyan());
        let project_root = crate::utils::find_project_root();
        let status = std::process::Command::new("cargo")
            .args(["test"])
            .current_dir(project_root.join("packages/akatsuki-cli"))
            .status()?;

        if !status.success() {
            anyhow::bail!("admin-cli tests failed");
        }
        println!("{}", "✅ admin-cli tests passed!".green());
        println!();

        println!("{}", "✅ Admin-CLI preflight passed!".green().bold());
        Ok(())
    }

    fn preflight_all(&self) -> Result<()> {
        // Frontend
        self.preflight_frontend()?;
        println!();

        // CLI
        self.preflight_cli()?;
        println!();

        // Backend
        self.preflight_backend()?;
        println!();

        // Admin-CLI
        self.preflight_admin_cli()?;
        println!();

        println!(
            "{}",
            "🎉 All preflight checks passed!".green().bold()
        );
        println!();
        println!("{}", "📊 Summary:".bright_cyan());
        println!("  - Code formatted ✓");
        println!("  - Lints passed ✓");
        println!("  - Type checks passed ✓");
        println!("  - Tests passed ✓");
        println!();
        println!(
            "{}",
            "Ready to commit or deploy!".bright_white().bold()
        );

        Ok(())
    }
}
