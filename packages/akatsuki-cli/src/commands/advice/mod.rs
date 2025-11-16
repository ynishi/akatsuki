use anyhow::Result;
use std::fs;
use std::path::PathBuf;

mod detectors;
mod rules;

use rules::RuleEngine;

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
            if current.join("packages").is_dir() &&
               current.join("packages/app-frontend").is_dir() {
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

    pub fn execute(&self, task: Option<String>) -> Result<()> {
        if let Some(task_name) = task {
            // Task-specific workflow (Phase 2)
            self.show_task_workflow(&task_name)
        } else {
            // Auto-detect mode
            self.show_contextual_advice()
        }
    }

    fn show_contextual_advice(&self) -> Result<()> {
        let engine = RuleEngine::new();
        let advice = engine.analyze(&self.project_root)?;

        advice.print();

        Ok(())
    }

    fn show_task_workflow(&self, task: &str) -> Result<()> {
        // Phase 2: Task-specific workflows
        println!("Task-specific workflows: {}", task);
        println!("(Coming soon in Phase 2)");
        Ok(())
    }
}
