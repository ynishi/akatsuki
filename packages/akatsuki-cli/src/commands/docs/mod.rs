use anyhow::Result;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

use crate::cli::DocsAction;

pub struct DocsCommand {
    project_root: PathBuf,
}

#[derive(Debug, Clone)]
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

    pub fn execute(&self, action: DocsAction, search: Option<&str>) -> Result<()> {
        match action {
            DocsAction::All => self.list_all(search),
            DocsAction::Components => self.list_components(search),
            DocsAction::Models => self.list_models(search),
            DocsAction::Repositories => self.list_repositories(search),
            DocsAction::Services => self.list_services(search),
            DocsAction::Hooks => self.list_hooks(search),
            DocsAction::Pages => self.list_pages(search),
            DocsAction::Lint => self.lint(),
            DocsAction::Sync { target, dry_run } => self.sync(&target, dry_run),
        }
    }

    fn list_all(&self, search: Option<&str>) -> Result<()> {
        println!("📚 All Project Documentation");
        if let Some(keyword) = search {
            println!("🔍 Searching for: \"{}\"\n", keyword);
        }
        println!();

        self.list_components(search)?;
        println!();
        self.list_models(search)?;
        println!();
        self.list_repositories(search)?;
        println!();
        self.list_services(search)?;
        println!();
        self.list_hooks(search)?;
        println!();
        self.list_pages(search)?;

        Ok(())
    }

    fn list_components(&self, search: Option<&str>) -> Result<()> {
        println!("📦 UI Components\n");

        let components_dir = self
            .project_root
            .join("packages/app-frontend/src/components");
        if !components_dir.exists() {
            println!("❌ Components directory not found: {:?}", components_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&components_dir, "component")?;
        let filtered = self.filter_docs(&docs, search);
        self.print_docs(&filtered, "UI Component");

        Ok(())
    }

    fn list_models(&self, search: Option<&str>) -> Result<()> {
        println!("📊 Models\n");

        let models_dir = self.project_root.join("packages/app-frontend/src/models");
        if !models_dir.exists() {
            println!("❌ Models directory not found: {:?}", models_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&models_dir, "model")?;
        let filtered = self.filter_docs(&docs, search);
        self.print_docs(&filtered, "Model");

        Ok(())
    }

    fn list_repositories(&self, search: Option<&str>) -> Result<()> {
        println!("🗄️  Repositories\n");

        let repos_dir = self
            .project_root
            .join("packages/app-frontend/src/repositories");
        if !repos_dir.exists() {
            println!("❌ Repositories directory not found: {:?}", repos_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&repos_dir, "repository")?;
        let filtered = self.filter_docs(&docs, search);
        self.print_docs(&filtered, "Repository");

        Ok(())
    }

    fn list_services(&self, search: Option<&str>) -> Result<()> {
        println!("⚙️  Services\n");

        let services_dir = self.project_root.join("packages/app-frontend/src/services");
        if !services_dir.exists() {
            println!("❌ Services directory not found: {:?}", services_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&services_dir, "service")?;
        let filtered = self.filter_docs(&docs, search);
        self.print_docs(&filtered, "Service");

        Ok(())
    }

    fn list_hooks(&self, search: Option<&str>) -> Result<()> {
        println!("🎣 Custom Hooks\n");

        let hooks_dir = self.project_root.join("packages/app-frontend/src/hooks");
        if !hooks_dir.exists() {
            println!("❌ Hooks directory not found: {:?}", hooks_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&hooks_dir, "hook")?;
        let filtered = self.filter_docs(&docs, search);
        self.print_docs(&filtered, "Hook");

        Ok(())
    }

    fn list_pages(&self, search: Option<&str>) -> Result<()> {
        println!("📄 Pages\n");

        let pages_dir = self.project_root.join("packages/app-frontend/src/pages");
        if !pages_dir.exists() {
            println!("❌ Pages directory not found: {:?}", pages_dir);
            return Ok(());
        }

        let docs = self.scan_directory(&pages_dir, "page")?;
        let filtered = self.filter_docs(&docs, search);
        self.print_docs(&filtered, "Page");

        Ok(())
    }

    fn scan_directory(&self, dir: &Path, doc_type: &str) -> Result<Vec<ComponentDoc>> {
        let mut docs = Vec::new();

        self.walk_dir(dir, &mut docs, doc_type)?;

        // Sort by category, then by file name
        docs.sort_by(|a, b| {
            a.category
                .cmp(&b.category)
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
                || path.extension().and_then(|s| s.to_str()) == Some("jsx")
            {
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

    fn extract_doc(&self, file_path: &Path, _doc_type: &str) -> Result<Option<ComponentDoc>> {
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
            println!(
                "  No {}s found with JSDoc comments.",
                doc_type.to_lowercase()
            );
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
            let relative_path = doc
                .file_path
                .strip_prefix(&self.project_root)
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

    fn filter_docs(&self, docs: &[ComponentDoc], search: Option<&str>) -> Vec<ComponentDoc> {
        match search {
            None => docs.to_vec(),
            Some(keyword) => {
                let keyword_lower = keyword.to_lowercase();
                docs.iter()
                    .filter(|doc| {
                        // Search in file path
                        let path_match = doc
                            .file_path
                            .to_string_lossy()
                            .to_lowercase()
                            .contains(&keyword_lower);

                        // Search in summary
                        let summary_match = doc.summary.to_lowercase().contains(&keyword_lower);

                        // Search in category
                        let category_match = doc.category.to_lowercase().contains(&keyword_lower);

                        path_match || summary_match || category_match
                    })
                    .cloned()
                    .collect()
            }
        }
    }

    fn lint(&self) -> Result<()> {
        println!("🔍 Documentation Coverage Report\n");

        let mut total_files = 0;
        let mut total_documented = 0;

        // Check each layer
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

        for (layer_name, dir) in layers {
            if !dir.exists() {
                continue;
            }

            let (documented, undocumented) = self.lint_layer(&dir)?;
            let total = documented.len() + undocumented.len();
            let coverage = if total > 0 {
                (documented.len() as f64 / total as f64 * 100.0) as usize
            } else {
                0
            };

            total_files += total;
            total_documented += documented.len();

            println!("━━━ {} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", layer_name);
            println!();
            println!("  Coverage: {}/{} ({}%)", documented.len(), total, coverage);
            println!();

            if !undocumented.is_empty() {
                println!("  ⚠️  Undocumented files:");
                for file in &undocumented {
                    let relative_path = file.strip_prefix(&self.project_root).unwrap_or(file);
                    println!("    • {}", relative_path.display());
                }
                println!();
            } else {
                println!("  ✅ All files documented!");
                println!();
            }
        }

        // Overall summary
        let overall_coverage = if total_files > 0 {
            (total_documented as f64 / total_files as f64 * 100.0) as usize
        } else {
            0
        };

        println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        println!();
        println!(
            "📊 Overall Coverage: {}/{} ({}%)",
            total_documented, total_files, overall_coverage
        );
        println!();

        if overall_coverage < 100 {
            println!("💡 Tip: Add JSDoc comments to undocumented files:");
            println!("   /**");
            println!("    * Brief description of the component/module");
            println!("    * Additional details (optional)");
            println!("    */");
        } else {
            println!("🎉 Perfect! All files are documented!");
        }

        Ok(())
    }

    fn lint_layer(&self, dir: &Path) -> Result<(Vec<PathBuf>, Vec<PathBuf>)> {
        let mut documented = Vec::new();
        let mut undocumented = Vec::new();

        self.collect_files(dir, &mut documented, &mut undocumented)?;

        Ok((documented, undocumented))
    }

    fn collect_files(
        &self,
        dir: &Path,
        documented: &mut Vec<PathBuf>,
        undocumented: &mut Vec<PathBuf>,
    ) -> Result<()> {
        if !dir.is_dir() {
            return Ok(());
        }

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                self.collect_files(&path, documented, undocumented)?;
            } else if path.extension().and_then(|s| s.to_str()) == Some("ts")
                || path.extension().and_then(|s| s.to_str()) == Some("tsx")
                || path.extension().and_then(|s| s.to_str()) == Some("jsx")
            {
                // Skip index.ts files
                if path.file_name().and_then(|s| s.to_str()) == Some("index.ts") {
                    continue;
                }

                // Check if file has JSDoc
                let has_jsdoc = self.has_jsdoc(&path)?;
                if has_jsdoc {
                    documented.push(path);
                } else {
                    undocumented.push(path);
                }
            }
        }

        Ok(())
    }

    fn has_jsdoc(&self, file_path: &Path) -> Result<bool> {
        let content = fs::read_to_string(file_path)?;
        let jsdoc_re = Regex::new(r"/\*\*\s*\n?((?:.*?\n?)*?)\*/").unwrap();

        if let Some(captures) = jsdoc_re.captures(&content) {
            let comment = captures.get(1).unwrap().as_str();

            // Check if there's actual content (not just empty comment)
            let has_content = comment.lines().any(|line| {
                let trimmed = line.trim().trim_start_matches('*').trim();
                !trimmed.is_empty() && !trimmed.starts_with('@')
            });

            Ok(has_content)
        } else {
            Ok(false)
        }
    }

    fn sync(&self, target: &str, dry_run: bool) -> Result<()> {
        println!("\n🔍 Scanning project components...");

        // 1. Collect statistics
        let stats = self.collect_sync_stats()?;

        println!("  Components: {} files", stats.components_count);
        println!(
            "  Models: {} files ({}% documented)",
            stats.models_count, stats.models_coverage
        );
        println!(
            "  Repositories: {} files ({}% documented)",
            stats.repos_count, stats.repos_coverage
        );
        println!(
            "  Services: {} files ({}% documented)",
            stats.services_count, stats.services_coverage
        );
        println!(
            "  Hooks: {} files ({}% documented)",
            stats.hooks_count, stats.hooks_coverage
        );
        println!(
            "  Pages: {} files ({}% documented)",
            stats.pages_count, stats.pages_coverage
        );

        // 2. Generate new Markdown section
        let new_section = self.generate_component_section(&stats)?;

        // 3. Read target file
        let target_path = self.project_root.join(target);
        if !target_path.exists() {
            anyhow::bail!("Target file not found: {}", target);
        }

        let original_content = fs::read_to_string(&target_path)?;

        // 4. Detect and replace section
        let updated_content = self.replace_section(&original_content, &new_section)?;

        // 5. Show diff or apply changes
        if dry_run {
            println!("\n📋 Proposed changes (--dry-run):\n");
            self.print_diff(&original_content, &updated_content);
            println!("\n💡 Run without --dry-run to apply changes.");
        } else {
            println!("\n📝 Updating {}...", target);
            fs::write(&target_path, updated_content)?;
            println!("✅ {} updated successfully!", target);
            println!("\n💡 Review changes: git diff {}", target);
        }

        Ok(())
    }

    fn collect_sync_stats(&self) -> Result<SyncStats> {
        let layers = vec![
            (
                "components",
                self.project_root
                    .join("packages/app-frontend/src/components"),
            ),
            (
                "models",
                self.project_root.join("packages/app-frontend/src/models"),
            ),
            (
                "repositories",
                self.project_root
                    .join("packages/app-frontend/src/repositories"),
            ),
            (
                "services",
                self.project_root.join("packages/app-frontend/src/services"),
            ),
            (
                "hooks",
                self.project_root.join("packages/app-frontend/src/hooks"),
            ),
            (
                "pages",
                self.project_root.join("packages/app-frontend/src/pages"),
            ),
        ];

        let mut stats = SyncStats::default();

        for (layer_name, dir) in layers {
            if !dir.exists() {
                continue;
            }

            let (documented, undocumented) = self.lint_layer(&dir)?;
            let total = documented.len() + undocumented.len();
            let coverage = if total > 0 {
                (documented.len() as f64 / total as f64 * 100.0) as usize
            } else {
                0
            };

            match layer_name {
                "components" => stats.components_count = total,
                "models" => {
                    stats.models_count = total;
                    stats.models_coverage = coverage;
                }
                "repositories" => {
                    stats.repos_count = total;
                    stats.repos_coverage = coverage;
                }
                "services" => {
                    stats.services_count = total;
                    stats.services_coverage = coverage;
                }
                "hooks" => {
                    stats.hooks_count = total;
                    stats.hooks_coverage = coverage;
                }
                "pages" => {
                    stats.pages_count = total;
                    stats.pages_coverage = coverage;
                }
                _ => {}
            }
        }

        Ok(stats)
    }

    fn generate_component_section(&self, stats: &SyncStats) -> Result<String> {
        let mut md = String::new();

        // Note: Hardcoded known components (auth, layout, storage)
        // TODO: Auto-detect from JSDoc categories
        md.push_str("- 認証: `AuthGuard`, `LoginForm`, `SignupForm`\n");
        md.push_str("- レイアウト: `Layout`, `PrivateLayout`, `NarrowLayout`, `FullWidthLayout`, `TopNavigation`\n");
        md.push_str("  - `Layout` - デフォルトレイアウト（メニュー・背景・パディング自動提供）\n");
        md.push_str("  - `PrivateLayout` - 認証必須ページ用（AuthGuard + Layout）\n");
        md.push_str("- ストレージ: `FileUpload`\n");
        md.push_str(
            "- Hooks: `useAIGen`, `useImageGeneration`, `usePublicProfile` (React Query)\n",
        );
        md.push_str(&format!(
            "- UI: shadcn/ui {}コンポーネント（`components/ui/`）\n",
            stats.components_count
        ));
        md.push_str(&format!(
            "- Models: {}クラス（{}%ドキュメント化）\n",
            stats.models_count, stats.models_coverage
        ));
        md.push_str(&format!(
            "- Repositories: {}クラス（{}%ドキュメント化）\n",
            stats.repos_count, stats.repos_coverage
        ));
        md.push_str(&format!(
            "- Services: {}クラス（{}%ドキュメント化）\n",
            stats.services_count, stats.services_coverage
        ));

        Ok(md)
    }

    fn replace_section(&self, content: &str, new_section: &str) -> Result<String> {
        let start_marker = "<!-- SYNC:COMPONENTS:START -->";
        let end_marker = "<!-- SYNC:COMPONENTS:END -->";

        let start_pos = content
            .find(start_marker)
            .ok_or_else(|| anyhow::anyhow!("Start marker not found: {}", start_marker))?;
        let end_pos = content
            .find(end_marker)
            .ok_or_else(|| anyhow::anyhow!("End marker not found: {}", end_marker))?;

        if start_pos >= end_pos {
            anyhow::bail!("Invalid marker positions: start must come before end");
        }

        // Extract everything before start marker, section content, and everything after end marker
        let before = &content[..start_pos + start_marker.len()];
        let after = &content[end_pos..];

        Ok(format!("{}\n{}{}", before, new_section, after))
    }

    fn print_diff(&self, old: &str, new: &str) {
        // Simple line-by-line diff
        let old_lines: Vec<&str> = old.lines().collect();
        let new_lines: Vec<&str> = new.lines().collect();

        println!("--- Original");
        println!("+++ Updated");
        println!();

        let max_len = old_lines.len().max(new_lines.len());
        for i in 0..max_len {
            let old_line = old_lines.get(i).copied().unwrap_or("");
            let new_line = new_lines.get(i).copied().unwrap_or("");

            if old_line != new_line {
                if !old_line.is_empty() {
                    println!("- {}", old_line);
                }
                if !new_line.is_empty() {
                    println!("+ {}", new_line);
                }
            }
        }
    }
}

#[derive(Default)]
struct SyncStats {
    components_count: usize,
    models_count: usize,
    models_coverage: usize,
    repos_count: usize,
    repos_coverage: usize,
    services_count: usize,
    services_coverage: usize,
    hooks_count: usize,
    hooks_coverage: usize,
    pages_count: usize,
    pages_coverage: usize,
}
