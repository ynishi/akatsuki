use anyhow::Result;
use std::path::Path;
use std::process::Command;

use super::{Detector, Detection, DetectionCategory};

pub struct GitDetector;

impl Detector for GitDetector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>> {
        let mut detections = Vec::new();

        // Run git status --porcelain
        let output = Command::new("git")
            .args(["status", "--porcelain"])
            .current_dir(project_root)
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let lines: Vec<&str> = stdout.lines().collect();

                if !lines.is_empty() {
                    // Count file types
                    let code_files: Vec<&str> = lines
                        .iter()
                        .filter(|line| {
                            line.contains(".ts") ||
                            line.contains(".tsx") ||
                            line.contains(".rs") ||
                            line.contains(".jsx") ||
                            line.contains(".js")
                        })
                        .copied()
                        .collect();

                    let file_count = lines.len();
                    let code_file_count = code_files.len();

                    let message = if code_file_count > 0 {
                        format!("Uncommitted changes detected in {} files ({} code files)",
                            file_count, code_file_count)
                    } else {
                        format!("Uncommitted changes detected in {} files", file_count)
                    };

                    detections.push(Detection::new(
                        DetectionCategory::UncommittedChanges,
                        message,
                        2, // Priority 2 (High)
                    ));
                } else {
                    // Clean state
                    detections.push(Detection::new(
                        DetectionCategory::Clean,
                        "Working directory clean".to_string(),
                        10, // Lowest priority
                    ));
                }
            }
            _ => {
                // Git command failed, skip detection
                // (Could be not a git repo, or git not installed)
            }
        }

        Ok(detections)
    }
}
