use anyhow::Result;
use std::fs;
use std::path::Path;

use super::{Detector, Detection, DetectionCategory};

pub struct MigrationDetector;

impl Detector for MigrationDetector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>> {
        let mut detections = Vec::new();

        let migrations_dir = project_root.join("supabase/migrations");

        if !migrations_dir.exists() {
            // No migrations directory, skip detection
            return Ok(detections);
        }

        // List all .sql files in migrations directory
        let entries = fs::read_dir(&migrations_dir)?;
        let mut sql_files: Vec<String> = Vec::new();

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("sql") {
                if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
                    sql_files.push(file_name.to_string());
                }
            }
        }

        if !sql_files.is_empty() {
            // Sort to get the most recent one (timestamp-based naming)
            sql_files.sort();
            let latest = sql_files.last().unwrap();

            // Check if this migration is in git (committed or staged)
            // Simple heuristic: if migrations exist, suggest checking/applying them
            let message = format!(
                "Migration file(s) detected: {} (latest: {})",
                sql_files.len(),
                latest
            );

            detections.push(Detection::new(
                DetectionCategory::PendingMigration,
                message,
                1, // Priority 1 (Highest)
            ));
        }

        Ok(detections)
    }
}
