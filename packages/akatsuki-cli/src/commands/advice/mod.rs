use anyhow::Result;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;

mod detectors;
mod rules;

use crate::cli::{AIBackend, AdviceAction};
use rules::{Advice, RuleEngine};

pub struct AdviceCommand {
    project_root: PathBuf,
}

impl AdviceCommand {
    pub fn new() -> Self {
        Self {
            project_root: Self::find_project_root(),
        }
    }

    fn find_project_root() -> PathBuf {
        let mut current = std::env::current_dir().unwrap();

        // Look for monorepo root markers
        loop {
            // Check for package.json with workspaces
            let package_json = current.join("package.json");
            if package_json.exists() {
                if let Ok(content) = fs::read_to_string(&package_json) {
                    if content.contains("\"workspaces\"") {
                        return current;
                    }
                }
            }

            // Check for packages directory (monorepo indicator)
            if current.join("packages").is_dir() && current.join("packages/app-frontend").is_dir() {
                return current;
            }

            // Move up to parent directory
            if let Some(parent) = current.parent() {
                current = parent.to_path_buf();
            } else {
                // Reached filesystem root, return original
                return std::env::current_dir().unwrap();
            }
        }
    }

    pub fn execute(&self, action: AdviceAction) -> Result<()> {
        match action {
            AdviceAction::Rule {
                task,
                enable_test_coverage,
            } => {
                if let Some(task_name) = task {
                    self.show_task_workflow(&task_name)
                } else {
                    self.show_contextual_advice(enable_test_coverage)
                }
            }
            AdviceAction::Prompt {
                task,
                enable_test_coverage,
            } => self.show_prompt_advice(task.as_deref(), enable_test_coverage),
            AdviceAction::Ai {
                task,
                backend,
                enable_test_coverage,
            } => self.invoke_ai_backend(task.as_deref(), backend, enable_test_coverage),
        }
    }

    fn show_contextual_advice(&self, enable_test_coverage: bool) -> Result<()> {
        let engine = RuleEngine::new();
        let advice = engine.analyze(&self.project_root, enable_test_coverage)?;

        advice.print();

        Ok(())
    }

    fn show_task_workflow(&self, task: &str) -> Result<()> {
        // Phase 2: Task-specific workflows
        println!("Task-specific workflows: {}", task);
        println!("(Coming soon in Phase 2)");
        Ok(())
    }

    fn show_prompt_advice(&self, task: Option<&str>, enable_test_coverage: bool) -> Result<()> {
        // Generate markdown prompt for manual copy-paste
        let engine = RuleEngine::new();
        let static_advice = engine.analyze(&self.project_root, enable_test_coverage)?;
        let context = self.collect_ai_context()?;
        let prompt = self.build_ai_prompt(&static_advice, &context, task);

        println!("\n📋 AI Analysis Prompt\n");
        println!("Copy the following to Claude Code for advanced advice:\n");
        println!("---");
        println!("{}", prompt);
        println!("---\n");
        println!("💡 Paste this into Claude Code for AI-powered advice.");

        Ok(())
    }

    fn invoke_ai_backend(
        &self,
        task: Option<&str>,
        backend: AIBackend,
        enable_test_coverage: bool,
    ) -> Result<()> {
        match backend {
            AIBackend::Markdown => {
                // Same as prompt subcommand
                self.show_prompt_advice(task, enable_test_coverage)
            }
            AIBackend::Claude => {
                // Automatic invocation via claude command
                self.invoke_claude_command(task, enable_test_coverage)
            }
        }
    }

    fn invoke_claude_command(&self, task: Option<&str>, enable_test_coverage: bool) -> Result<()> {
        println!("\n🤖 Invoking Claude Code AI...\n");

        // 1. Collect context and build prompt
        let engine = RuleEngine::new();
        let static_advice = engine.analyze(&self.project_root, enable_test_coverage)?;
        let context = self.collect_ai_context()?;
        let prompt = self.build_ai_prompt(&static_advice, &context, task);

        // 2. Invoke claude command with prompt via stdin
        let mut child = Command::new("claude")
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::inherit())
            .stderr(std::process::Stdio::inherit())
            .spawn()
            .map_err(|e| {
                anyhow::anyhow!(
                    "Failed to execute 'claude' command: {}\n\n\
                     Make sure 'claude' command is installed and available in PATH.\n\
                     Fallback: Use 'akatsuki advice prompt' to generate markdown for manual paste.",
                    e
                )
            })?;

        // Write prompt to stdin
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(prompt.as_bytes())?;
        }

        // Wait for completion
        let status = child.wait()?;

        if !status.success() {
            anyhow::bail!("Claude command failed with status: {}", status);
        }

        println!("\n✅ AI analysis complete!");

        Ok(())
    }

    fn collect_ai_context(&self) -> Result<AIContext> {
        let mut context = AIContext::default();

        // Collect git log (last 10 commits)
        if let Ok(output) = Command::new("git")
            .args(["log", "--oneline", "-10"])
            .current_dir(&self.project_root)
            .output()
        {
            if output.status.success() {
                context.git_history = String::from_utf8_lossy(&output.stdout).to_string();
            }
        }

        // Collect modified files
        if let Ok(output) = Command::new("git")
            .args(["diff", "--name-only", "HEAD"])
            .current_dir(&self.project_root)
            .output()
        {
            if output.status.success() {
                let files = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .map(|s| s.to_string())
                    .collect();
                context.modified_files = files;
            }
        }

        // Collect documentation coverage (run docs lint internally)
        // We'll parse the output or reuse DocsCommand logic
        context.docs_coverage = self.get_docs_coverage()?;

        // Collect file structure (key directories)
        context.file_structure = self.get_file_structure()?;

        Ok(context)
    }

    fn get_docs_coverage(&self) -> Result<String> {
        // Simplified version - just count files
        let layers = vec![
            (
                "UI Components",
                self.project_root
                    .join("packages/app-frontend/src/components"),
            ),
            (
                "Models",
                self.project_root.join("packages/app-frontend/src/models"),
            ),
            (
                "Repositories",
                self.project_root
                    .join("packages/app-frontend/src/repositories"),
            ),
            (
                "Services",
                self.project_root.join("packages/app-frontend/src/services"),
            ),
            (
                "Hooks",
                self.project_root.join("packages/app-frontend/src/hooks"),
            ),
            (
                "Pages",
                self.project_root.join("packages/app-frontend/src/pages"),
            ),
        ];

        let mut coverage_lines = Vec::new();
        for (name, _path) in layers {
            // Simplified - actual implementation would scan files
            coverage_lines.push(format!("- {}: (scan not implemented in advice)", name));
        }

        Ok(coverage_lines.join("\n"))
    }

    fn get_file_structure(&self) -> Result<String> {
        let structure = vec![
            "packages/",
            "  app-frontend/src/",
            "    components/",
            "    models/",
            "    repositories/",
            "    services/",
            "    hooks/",
            "    pages/",
            "  akatsuki-cli/src/",
            "supabase/",
            "  migrations/",
        ];

        Ok(structure.join("\n"))
    }

    fn build_ai_prompt(&self, advice: &Advice, context: &AIContext, task: Option<&str>) -> String {
        let mut prompt = String::new();

        prompt.push_str("# VibeCoding Project Analysis\n\n");

        // Current situation
        prompt.push_str("## 📍 Current Situation\n\n");
        if advice.situation.is_empty() {
            prompt.push_str("- No issues detected (clean state)\n");
        } else {
            for item in &advice.situation {
                prompt.push_str(&format!("- {}\n", item));
            }
        }
        prompt.push_str("\n");

        // Recent git activity
        if !context.git_history.is_empty() {
            prompt.push_str("## 📜 Recent Git Activity\n\n");
            prompt.push_str("```\n");
            prompt.push_str(&context.git_history);
            prompt.push_str("```\n\n");
        }

        // Modified files
        if !context.modified_files.is_empty() {
            prompt.push_str("## 📝 Modified Files (uncommitted)\n\n");
            for file in &context.modified_files {
                prompt.push_str(&format!("- {}\n", file));
            }
            prompt.push_str("\n");
        }

        // Documentation coverage
        if !context.docs_coverage.is_empty() {
            prompt.push_str("## 📚 Documentation Coverage\n\n");
            prompt.push_str(&context.docs_coverage);
            prompt.push_str("\n\n");
        }

        // File structure
        prompt.push_str("## 🗂️  Project Structure\n\n");
        prompt.push_str("```\n");
        prompt.push_str(&context.file_structure);
        prompt.push_str("\n```\n\n");

        // Static recommendations
        if !advice.steps.is_empty() {
            prompt.push_str("## 💡 Static Rule Recommendations\n\n");
            for (i, step) in advice.steps.iter().enumerate() {
                prompt.push_str(&format!("{}. {}\n", i + 1, step));
            }
            prompt.push_str("\n");
        }

        // Question
        prompt.push_str("## ❓ Question\n\n");
        let question = task.unwrap_or("Based on the current project state, what should I work on next? Please provide specific, actionable steps.");
        prompt.push_str(question);
        prompt.push_str("\n");

        prompt
    }
}

#[derive(Default)]
struct AIContext {
    git_history: String,
    modified_files: Vec<String>,
    docs_coverage: String,
    file_structure: String,
}
