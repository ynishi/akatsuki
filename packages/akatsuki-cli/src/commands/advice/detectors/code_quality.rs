use anyhow::Result;
use std::path::Path;
use std::process::Command;

use super::{Detection, DetectionCategory, Detector};

pub struct CodeQualityDetector;

impl Detector for CodeQualityDetector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>> {
        let mut detections = Vec::new();

        // Check TypeScript type errors
        let frontend_dir = project_root.join("packages/app-frontend");
        if frontend_dir.exists() {
            if let Ok(output) = Command::new("npx")
                .args(["tsc", "--noEmit"])
                .current_dir(&frontend_dir)
                .output()
            {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let error_count = stderr
                        .lines()
                        .filter(|line| line.contains("error TS"))
                        .count();

                    if error_count > 0 {
                        detections.push(Detection::new(
                            DetectionCategory::TypeCheckError,
                            format!("TypeScript type errors detected: {} errors", error_count),
                            3,
                        ));
                    }
                }
            }
        }

        // Check ESLint errors
        if frontend_dir.exists() {
            if let Ok(output) = Command::new("npx")
                .args(["eslint", "src", "--max-warnings", "0"])
                .current_dir(&frontend_dir)
                .output()
            {
                if !output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let output_text = format!("{}{}", stdout, stderr);

                    // Parse ESLint output for error/warning count
                    if output_text.contains("problem") {
                        detections.push(Detection::new(
                            DetectionCategory::LintError,
                            "ESLint errors or warnings detected".to_string(),
                            4,
                        ));
                    }
                }
            }
        }

        // Check Rust cargo check (if Rust project exists)
        let cargo_toml = project_root.join("Cargo.toml");
        if cargo_toml.exists() {
            if let Ok(output) = Command::new("cargo")
                .args(["check", "--quiet"])
                .current_dir(project_root)
                .output()
            {
                if !output.status.success() {
                    detections.push(Detection::new(
                        DetectionCategory::TypeCheckError,
                        "Rust compilation errors detected".to_string(),
                        3,
                    ));
                }
            }
        }

        Ok(detections)
    }
}
