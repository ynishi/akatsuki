use anyhow::Result;
use std::fs;
use std::path::Path;
use std::process::Command;

use super::{Detection, DetectionCategory, Detector};

pub struct DocsDetector;

impl Detector for DocsDetector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>> {
        let mut detections = Vec::new();

        // Find all design documents
        let design_docs = Self::find_design_docs(project_root)?;

        if design_docs.is_empty() {
            // Check if there are recent uncommitted changes
            if Self::has_uncommitted_changes(project_root)? {
                detections.push(Detection::new(
                    DetectionCategory::MissingDesignDoc,
                    "No design documents found. Consider creating one with 'akatsuki design new <feature>'".to_string(),
                    6,
                ));
            }
        } else {
            // Check for incomplete design docs
            let incomplete_docs = Self::find_incomplete_docs(&design_docs)?;
            if !incomplete_docs.is_empty() {
                let doc_names: Vec<_> = incomplete_docs
                    .iter()
                    .take(3)
                    .map(|path| {
                        path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown")
                    })
                    .collect();

                let message = if incomplete_docs.len() > 3 {
                    format!(
                        "{} incomplete design documents: {} and {} more",
                        incomplete_docs.len(),
                        doc_names.join(", "),
                        incomplete_docs.len() - 3
                    )
                } else {
                    format!(
                        "{} incomplete design documents: {}",
                        incomplete_docs.len(),
                        doc_names.join(", ")
                    )
                };

                detections.push(Detection::new(
                    DetectionCategory::IncompleteDesignDoc,
                    message,
                    5,
                ));
            }

            // Show info about existing design docs (informational)
            if !incomplete_docs.is_empty() {
                detections.push(Detection::new(
                    DetectionCategory::DesignDocument,
                    format!("{} design documents found", design_docs.len()),
                    10, // Low priority (informational)
                ));
            }
        }

        Ok(detections)
    }
}

impl DocsDetector {
    fn find_design_docs(project_root: &Path) -> Result<Vec<std::path::PathBuf>> {
        let output = Command::new("find")
            .args([
                project_root.to_str().unwrap(),
                "-maxdepth",
                "1",
                "-type",
                "f",
                "-name",
                "*-design.md",
            ])
            .output()?;

        let docs: Vec<_> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter(|line| !line.is_empty())
            .map(|line| std::path::PathBuf::from(line))
            .collect();

        Ok(docs)
    }

    fn find_incomplete_docs(docs: &[std::path::PathBuf]) -> Result<Vec<std::path::PathBuf>> {
        let mut incomplete = Vec::new();

        for doc_path in docs {
            if let Ok(content) = fs::read_to_string(doc_path) {
                // Check for common markers of incomplete docs
                let is_incomplete = content.contains("TODO")
                    || content.contains("TBD")
                    || content.contains("[ ]")
                    || content.contains("[To be filled]")
                    || content.contains("[Describe")
                    || Self::has_empty_sections(&content);

                if is_incomplete {
                    incomplete.push(doc_path.clone());
                }
            }
        }

        Ok(incomplete)
    }

    fn has_empty_sections(content: &str) -> bool {
        // Check for headers followed immediately by another header or end of file
        // This indicates an empty section
        let lines: Vec<&str> = content.lines().collect();
        let mut prev_was_header = false;

        for line in lines {
            let trimmed = line.trim();

            if trimmed.starts_with("##") {
                if prev_was_header {
                    return true; // Two consecutive headers = empty section
                }
                prev_was_header = true;
            } else if !trimmed.is_empty() {
                prev_was_header = false;
            }
        }

        false
    }

    fn has_uncommitted_changes(project_root: &Path) -> Result<bool> {
        let output = Command::new("git")
            .args(["status", "--porcelain"])
            .current_dir(project_root)
            .output()?;

        Ok(!String::from_utf8_lossy(&output.stdout).trim().is_empty())
    }
}
