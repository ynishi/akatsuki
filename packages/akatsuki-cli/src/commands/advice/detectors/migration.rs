use anyhow::Result;
use std::path::Path;
use std::process::Command;

use super::{Detection, DetectionCategory, Detector};

pub struct MigrationDetector;

impl Detector for MigrationDetector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>> {
        let mut detections = Vec::new();

        let migrations_dir = project_root.join("supabase/migrations");

        if !migrations_dir.exists() {
            // No migrations directory, skip detection
            return Ok(detections);
        }

        // Check for uncommitted migration files using git status
        let output = Command::new("git")
            .args(["status", "--porcelain"])
            .current_dir(project_root)
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);

                // Filter for uncommitted migration files
                let uncommitted_migrations: Vec<&str> = stdout
                    .lines()
                    .filter(|line| line.contains("supabase/migrations/") && line.ends_with(".sql"))
                    .collect();

                if !uncommitted_migrations.is_empty() {
                    // Extract file names
                    let mut migration_files: Vec<String> = uncommitted_migrations
                        .iter()
                        .filter_map(|line| {
                            // git status --porcelain format: "XY filename"
                            // Extract filename (everything after first 3 chars)
                            let path_part = line.get(3..)?;
                            // Get just the filename from the path
                            path_part.split('/').last().map(|s| s.to_string())
                        })
                        .collect();

                    migration_files.sort();
                    let latest = migration_files.last().unwrap();

                    let message = format!(
                        "New uncommitted migration file(s): {} (latest: {})",
                        migration_files.len(),
                        latest
                    );

                    detections.push(Detection::new(
                        DetectionCategory::PendingMigration,
                        message,
                        1, // Priority 1 (Highest)
                    ));
                }
            }
            _ => {
                // Git command failed, skip detection
            }
        }

        Ok(detections)
    }
}
