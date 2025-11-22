use anyhow::Result;
use std::fs;
use std::path::Path;
use std::process::Command;

use super::{Detection, DetectionCategory, Detector};

pub struct RefactorDetector;

impl Detector for RefactorDetector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>> {
        let mut detections = Vec::new();

        // Check for large files in frontend
        let frontend_src = project_root.join("packages/app-frontend/src");
        if frontend_src.exists() {
            let large_files = Self::find_large_files(&frontend_src, 500)?;
            if !large_files.is_empty() {
                let file_list = large_files
                    .iter()
                    .take(3)
                    .map(|(name, lines)| format!("{} ({}L)", name, lines))
                    .collect::<Vec<_>>()
                    .join(", ");

                let message = if large_files.len() > 3 {
                    format!(
                        "{} large files detected ({}+ lines): {} and {} more",
                        large_files.len(),
                        500,
                        file_list,
                        large_files.len() - 3
                    )
                } else {
                    format!(
                        "{} large files detected ({}+ lines): {}",
                        large_files.len(),
                        500,
                        file_list
                    )
                };

                detections.push(Detection::new(
                    DetectionCategory::CodeComplexity,
                    message,
                    7, // Lower priority
                ));
            }
        }

        // Check for deeply nested code (simple heuristic: count indentation levels)
        if frontend_src.exists() {
            let deeply_nested = Self::find_deeply_nested_files(&frontend_src, 6)?;
            if !deeply_nested.is_empty() {
                detections.push(Detection::new(
                    DetectionCategory::RefactoringNeeded,
                    format!(
                        "{} files with deep nesting detected (consider simplifying)",
                        deeply_nested.len()
                    ),
                    8,
                ));
            }
        }

        // Check Rust files for large modules
        let cargo_toml = project_root.join("Cargo.toml");
        if cargo_toml.exists() {
            if let Ok(output) = Command::new("find")
                .args([
                    project_root.to_str().unwrap(),
                    "-name",
                    "*.rs",
                    "-type",
                    "f",
                ])
                .output()
            {
                let rust_files = String::from_utf8_lossy(&output.stdout);
                let large_rust_files: Vec<_> = rust_files
                    .lines()
                    .filter_map(|path| {
                        let path = Path::new(path);
                        if let Ok(content) = fs::read_to_string(path) {
                            let lines = content.lines().count();
                            if lines > 400 {
                                return Some((path.file_name()?.to_str()?.to_string(), lines));
                            }
                        }
                        None
                    })
                    .collect();

                if !large_rust_files.is_empty() {
                    detections.push(Detection::new(
                        DetectionCategory::CodeComplexity,
                        format!(
                            "{} large Rust files detected (400+ lines)",
                            large_rust_files.len()
                        ),
                        7,
                    ));
                }
            }
        }

        Ok(detections)
    }
}

impl RefactorDetector {
    fn find_large_files(dir: &Path, threshold: usize) -> Result<Vec<(String, usize)>> {
        let output = Command::new("find")
            .args([
                dir.to_str().unwrap(),
                "-type",
                "f",
                "(",
                "-name",
                "*.ts",
                "-o",
                "-name",
                "*.tsx",
                ")",
                "!",
                "-name",
                "*.test.*",
                "!",
                "-name",
                "*.spec.*",
            ])
            .output()?;

        let files = String::from_utf8_lossy(&output.stdout);
        let large_files: Vec<(String, usize)> = files
            .lines()
            .filter_map(|path| {
                let path = Path::new(path);
                if let Ok(content) = fs::read_to_string(path) {
                    let lines = content.lines().count();
                    if lines > threshold {
                        return Some((path.file_name()?.to_str()?.to_string(), lines));
                    }
                }
                None
            })
            .collect();

        Ok(large_files)
    }

    fn find_deeply_nested_files(dir: &Path, max_indent: usize) -> Result<Vec<String>> {
        let output = Command::new("find")
            .args([
                dir.to_str().unwrap(),
                "-type",
                "f",
                "(",
                "-name",
                "*.ts",
                "-o",
                "-name",
                "*.tsx",
                ")",
            ])
            .output()?;

        let files = String::from_utf8_lossy(&output.stdout);
        let nested_files: Vec<String> = files
            .lines()
            .filter_map(|path| {
                let path = Path::new(path);
                if let Ok(content) = fs::read_to_string(path) {
                    // Simple heuristic: check for lines with 6+ levels of indentation
                    let has_deep_nesting = content.lines().any(|line| {
                        let indent_count = line.chars().take_while(|c| c.is_whitespace()).count();
                        // Assuming 2-space indentation
                        indent_count / 2 > max_indent
                    });

                    if has_deep_nesting {
                        return Some(path.file_name()?.to_str()?.to_string());
                    }
                }
                None
            })
            .collect();

        Ok(nested_files)
    }
}
