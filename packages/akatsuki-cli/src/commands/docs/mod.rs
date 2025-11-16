use anyhow::Result;
use std::fs;
use std::path::{Path, PathBuf};
use regex::Regex;

use crate::cli::DocsAction;

pub struct DocsCommand {
    project_root: PathBuf,
}

#[derive(Debug)]
struct ComponentDoc {
    file_path: PathBuf,
    summary: String,
    category: String,
}

impl DocsCommand {
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

    pub fn execute(&self, action: DocsAction) -> Result<()> {
        match action {
            DocsAction::UiComponents => self.list_ui_components(),
            DocsAction::Models => self.list_models(),
            DocsAction::Repositories => self.list_repositories(),
            DocsAction::Services => self.list_services(),
            DocsAction::Hooks => self.list_hooks(),
            DocsAction::Pages => self.list_pages(),
        }
    }

    fn list_ui_components(&self) -> Result<()> {
        println!("📦 UI Components\n");

        let components_dir = self.project_root.join("packages/app-frontend/src/components");
        if !components_dir.exists() {
            println!("❌ Components directory not found: {:?}", components_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&components_dir, "component")?;
        self.print_docs(&docs, "UI Component");

        Ok(())
    }

    fn list_models(&self) -> Result<()> {
        println!("📊 Models\n");

        let models_dir = self.project_root.join("packages/app-frontend/src/models");
        if !models_dir.exists() {
            println!("❌ Models directory not found: {:?}", models_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&models_dir, "model")?;
        self.print_docs(&docs, "Model");

        Ok(())
    }

    fn list_repositories(&self) -> Result<()> {
        println!("🗄️  Repositories\n");

        let repos_dir = self.project_root.join("packages/app-frontend/src/repositories");
        if !repos_dir.exists() {
            println!("❌ Repositories directory not found: {:?}", repos_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&repos_dir, "repository")?;
        self.print_docs(&docs, "Repository");

        Ok(())
    }

    fn list_services(&self) -> Result<()> {
        println!("⚙️  Services\n");

        let services_dir = self.project_root.join("packages/app-frontend/src/services");
        if !services_dir.exists() {
            println!("❌ Services directory not found: {:?}", services_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&services_dir, "service")?;
        self.print_docs(&docs, "Service");

        Ok(())
    }

    fn list_hooks(&self) -> Result<()> {
        println!("🎣 Custom Hooks\n");

        let hooks_dir = self.project_root.join("packages/app-frontend/src/hooks");
        if !hooks_dir.exists() {
            println!("❌ Hooks directory not found: {:?}", hooks_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&hooks_dir, "hook")?;
        self.print_docs(&docs, "Hook");

        Ok(())
    }

    fn list_pages(&self) -> Result<()> {
        println!("📄 Pages\n");

        let pages_dir = self.project_root.join("packages/app-frontend/src/pages");
        if !pages_dir.exists() {
            println!("❌ Pages directory not found: {:?}", pages_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&pages_dir, "page")?;
        self.print_docs(&docs, "Page");

        Ok(())
    }

    fn scan_directory(&self, dir: &Path, doc_type: &str) -> Result<Vec<ComponentDoc>> {
        let mut docs = Vec::new();

        self.walk_dir(dir, &mut docs, doc_type)?;

        // Sort by category, then by file name
        docs.sort_by(|a, b| {
            a.category.cmp(&b.category)
                .then_with(|| a.file_path.cmp(&b.file_path))
        });

        Ok(docs)
    }

    fn walk_dir(&self, dir: &Path, docs: &mut Vec<ComponentDoc>, doc_type: &str) -> Result<()> {
        if !dir.is_dir() {
            return Ok(());
        }

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                self.walk_dir(&path, docs, doc_type)?;
            } else if path.extension().and_then(|s| s.to_str()) == Some("ts")
                   || path.extension().and_then(|s| s.to_str()) == Some("tsx")
                   || path.extension().and_then(|s| s.to_str()) == Some("jsx") {

                // Skip index.ts files
                if path.file_name().and_then(|s| s.to_str()) == Some("index.ts") {
                    continue;
                }

                if let Some(doc) = self.extract_doc(&path, doc_type)? {
                    docs.push(doc);
                }
            }
        }

        Ok(())
    }

    fn extract_doc(&self, file_path: &Path, doc_type: &str) -> Result<Option<ComponentDoc>> {
        let content = fs::read_to_string(file_path)?;

        // Extract JSDoc comment (/** ... */)
        let jsdoc_re = Regex::new(r"/\*\*\s*\n?((?:.*?\n?)*?)\*/").unwrap();

        if let Some(captures) = jsdoc_re.captures(&content) {
            let comment = captures.get(1).unwrap().as_str();

            // Extract first 3-5 lines of actual content (skip * markers)
            let summary_lines: Vec<String> = comment
                .lines()
                .map(|line| line.trim().trim_start_matches('*').trim())
                .filter(|line| !line.is_empty() && !line.starts_with('@'))
                .take(5)
                .map(|s| s.to_string())
                .collect();

            if summary_lines.is_empty() {
                return Ok(None);
            }

            let summary = summary_lines.join("\n  ");

            // Categorize based on parent directory
            let category = self.categorize_file(file_path);

            Ok(Some(ComponentDoc {
                file_path: file_path.to_path_buf(),
                summary,
                category,
            }))
        } else {
            Ok(None)
        }
    }

    fn categorize_file(&self, file_path: &Path) -> String {
        let path_str = file_path.to_string_lossy();

        if path_str.contains("/layout/") {
            "Layout".to_string()
        } else if path_str.contains("/templates/") {
            "Templates".to_string()
        } else if path_str.contains("/common/") {
            "Common".to_string()
        } else if path_str.contains("/features/") {
            "Features".to_string()
        } else if path_str.contains("/auth/") {
            "Authentication".to_string()
        } else if path_str.contains("/admin/") {
            "Admin".to_string()
        } else {
            "Other".to_string()
        }
    }

    fn print_docs(&self, docs: &[ComponentDoc], doc_type: &str) {
        if docs.is_empty() {
            println!("  No {}s found with JSDoc comments.", doc_type.to_lowercase());
            return;
        }

        let mut current_category = String::new();

        for doc in docs {
            // Print category header if changed
            if doc.category != current_category {
                if !current_category.is_empty() {
                    println!();
                }
                println!("━━━ {} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", doc.category);
                println!();
                current_category = doc.category.clone();
            }

            // Print file path relative to project root
            let relative_path = doc.file_path.strip_prefix(&self.project_root)
                .unwrap_or(&doc.file_path);
            println!("{}", relative_path.display());

            // Print summary with indentation
            for line in doc.summary.lines() {
                println!("  {}", line);
            }
            println!();
        }

        println!("Total: {} {}s found", docs.len(), doc_type.to_lowercase());
    }
}
