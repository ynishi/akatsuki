use anyhow::Result;
use std::path::Path;
use std::process::Command;

use super::{Detection, DetectionCategory, Detector};

pub struct TestDetector;

impl Detector for TestDetector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>> {
        let mut detections = Vec::new();

        // Check for failing tests in frontend
        let frontend_dir = project_root.join("packages/app-frontend");
        if frontend_dir.exists() {
            // Run tests with --passWithNoTests to avoid failure when no tests exist
            if let Ok(output) = Command::new("npm")
                .args(["test", "--", "--passWithNoTests", "--watchAll=false"])
                .current_dir(&frontend_dir)
                .output()
            {
                if !output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let output_text = format!("{}{}", stdout, stderr);

                    // Check if tests actually failed (not just no tests found)
                    if output_text.contains("FAIL") || output_text.contains("failed") {
                        detections.push(Detection::new(
                            DetectionCategory::FailingTests,
                            "Some tests are failing".to_string(),
                            2, // High priority
                        ));
                    }
                }
            }

            // Check for test file existence
            let test_count = Self::count_test_files(&frontend_dir)?;
            let source_count = Self::count_source_files(&frontend_dir)?;

            if test_count == 0 && source_count > 0 {
                detections.push(Detection::new(
                    DetectionCategory::MissingTests,
                    "No test files found in project".to_string(),
                    5,
                ));
            } else if test_count > 0 && source_count > test_count * 3 {
                // If we have more than 3x source files compared to test files
                detections.push(Detection::new(
                    DetectionCategory::LowCoverage,
                    format!(
                        "Low test coverage: {} test files for {} source files",
                        test_count, source_count
                    ),
                    6,
                ));
            }
        }

        // Check for Rust tests
        let cargo_toml = project_root.join("Cargo.toml");
        if cargo_toml.exists() {
            if let Ok(output) = Command::new("cargo")
                .args(["test", "--no-fail-fast"])
                .current_dir(project_root)
                .output()
            {
                if !output.status.success() {
                    detections.push(Detection::new(
                        DetectionCategory::FailingTests,
                        "Rust tests are failing".to_string(),
                        2,
                    ));
                }
            }
        }

        Ok(detections)
    }
}

impl TestDetector {
    fn count_test_files(dir: &Path) -> Result<usize> {
        let output = Command::new("find")
            .args([
                dir.to_str().unwrap(),
                "-type",
                "f",
                "(",
                "-name",
                "*.test.ts",
                "-o",
                "-name",
                "*.test.tsx",
                "-o",
                "-name",
                "*.spec.ts",
                "-o",
                "-name",
                "*.spec.tsx",
                ")",
            ])
            .output()?;

        let count = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter(|line| !line.is_empty())
            .count();

        Ok(count)
    }

    fn count_source_files(dir: &Path) -> Result<usize> {
        let src_dir = dir.join("src");
        if !src_dir.exists() {
            return Ok(0);
        }

        let output = Command::new("find")
            .args([
                src_dir.to_str().unwrap(),
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

        let count = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter(|line| !line.is_empty())
            .count();

        Ok(count)
    }
}
