use anyhow::Result;
use colored::Colorize;
use std::path::Path;

use super::detectors::{
    CodeQualityDetector, Detection, DetectionCategory, Detector, DocsDetector, GitDetector,
    MigrationDetector, RefactorDetector, TestDetector,
};

pub struct RuleEngine {
    detectors: Vec<Box<dyn Detector>>,
}

impl RuleEngine {
    pub fn new() -> Self {
        let detectors: Vec<Box<dyn Detector>> = vec![
            Box::new(GitDetector),
            Box::new(MigrationDetector),
            Box::new(CodeQualityDetector),
            Box::new(TestDetector),
            Box::new(RefactorDetector),
            Box::new(DocsDetector),
        ];

        Self { detectors }
    }

    pub fn analyze(&self, project_root: &Path) -> Result<Advice> {
        let mut all_detections = Vec::new();

        // Run all detectors
        for detector in &self.detectors {
            let detections = detector.detect(project_root)?;
            all_detections.extend(detections);
        }

        // Sort by priority (lower number = higher priority)
        all_detections.sort_by_key(|d| d.priority);

        // Generate advice based on detections
        let advice = self.generate_advice(&all_detections);

        Ok(advice)
    }

    fn generate_advice(&self, detections: &[Detection]) -> Advice {
        let mut situation = Vec::new();
        let mut steps = Vec::new();
        let mut hints = Vec::new();

        // Check for specific scenarios
        let has_migration = detections
            .iter()
            .any(|d| d.category == DetectionCategory::PendingMigration);
        let has_uncommitted = detections
            .iter()
            .any(|d| d.category == DetectionCategory::UncommittedChanges);
        let has_failing_tests = detections
            .iter()
            .any(|d| d.category == DetectionCategory::FailingTests);
        let has_lint_errors = detections.iter().any(|d| {
            d.category == DetectionCategory::LintError
                || d.category == DetectionCategory::TypeCheckError
        });
        let has_missing_tests = detections.iter().any(|d| {
            d.category == DetectionCategory::MissingTests
                || d.category == DetectionCategory::LowCoverage
        });
        let has_refactoring_needed = detections.iter().any(|d| {
            d.category == DetectionCategory::CodeComplexity
                || d.category == DetectionCategory::RefactoringNeeded
        });
        let has_incomplete_docs = detections.iter().any(|d| {
            d.category == DetectionCategory::IncompleteDesignDoc
                || d.category == DetectionCategory::MissingDesignDoc
        });
        let is_clean = detections
            .iter()
            .any(|d| d.category == DetectionCategory::Clean);

        // Build situation messages
        for detection in detections {
            if detection.category != DetectionCategory::Clean {
                situation.push(detection.message.clone());
            }
        }

        // Generate recommended steps based on detected conditions
        // Priority order: failing tests > lint errors > migration > uncommitted > refactoring > tests > docs

        if has_failing_tests {
            steps.push("Fix failing tests first (highest priority)".to_string());
            steps.push("Run tests: npm test (frontend) or cargo test (Rust)".to_string());
        }

        if has_lint_errors {
            steps.push("Fix code quality issues:".to_string());
            steps.push("  - Run type check: npx tsc --noEmit".to_string());
            steps.push("  - Run linter: npx eslint src --fix".to_string());
            steps.push("  - Or use: akatsuki check".to_string());
        }

        if has_migration {
            steps.push("Review migration files: ls -la supabase/migrations/".to_string());
            steps.push("Apply migrations: akatsuki db push".to_string());
            steps.push("Verify schema changes in database".to_string());
        }

        if has_uncommitted {
            if !has_failing_tests && !has_lint_errors {
                steps.push("Run checks: akatsuki check".to_string());
                steps.push("Run tests: akatsuki test".to_string());
            }
            steps.push("Review changes: git diff".to_string());
            steps.push("Commit changes: git add . && git commit -m \"...\"".to_string());
        }

        if has_missing_tests {
            steps.push("Consider adding test coverage:".to_string());
            steps.push("  - Create test files: *.test.ts or *.spec.ts".to_string());
            steps.push("  - Run tests: npm test".to_string());
        }

        if has_refactoring_needed {
            hints.push("Code health suggestions:".to_string());
            hints.push("  - Break down large files into smaller modules".to_string());
            hints.push(
                "  - Reduce nesting depth with early returns or helper functions".to_string(),
            );
            hints.push("  - Consider extracting complex logic into separate functions".to_string());
            hints.push("".to_string());
        }

        if has_incomplete_docs {
            steps.push("Complete design documentation:".to_string());
            steps.push("  - Fill in TODO/TBD sections in *-design.md files".to_string());
            steps.push("  - Document key decisions and trade-offs".to_string());
        }

        if is_clean && !has_migration && !has_uncommitted && !has_failing_tests && !has_lint_errors
        {
            // Clean state - show common workflows
            situation.push("Working directory clean".to_string());
            situation.push("No pending migrations".to_string());
            situation.push("All checks passing".to_string());

            hints.push("Common workflows:".to_string());
            hints.push("  New feature:".to_string());
            hints.push("    1. akatsuki design new <name>".to_string());
            hints.push("    2. akatsuki db migration-new <name>".to_string());
            hints.push("    3. Implement features".to_string());
            hints.push("    4. Add tests".to_string());
            hints.push("    5. akatsuki check".to_string());
            hints.push("".to_string());
            hints.push("  Documentation:".to_string());
            hints.push("    akatsuki docs components".to_string());
            hints.push("    akatsuki docs models".to_string());
            hints.push("".to_string());
            hints.push("  Code quality:".to_string());
            hints.push("    Review code for refactoring opportunities".to_string());
            hints.push("    Improve test coverage".to_string());
        }

        Advice {
            situation,
            steps,
            hints: if hints.is_empty() { None } else { Some(hints) },
        }
    }
}

pub struct Advice {
    pub situation: Vec<String>,
    pub steps: Vec<String>,
    pub hints: Option<Vec<String>>,
}

impl Advice {
    pub fn print(&self) {
        println!();
        println!("{}", "📍 Current situation:".cyan().bold());

        if self.situation.is_empty() {
            println!("  {}", "No issues detected".green());
        } else {
            for item in &self.situation {
                println!("  - {}", item.yellow());
            }
        }

        println!();

        if !self.steps.is_empty() {
            println!("{}", "💡 Recommended next steps:".cyan().bold());
            for (i, step) in self.steps.iter().enumerate() {
                println!("  {}. {}", i + 1, step.green());
            }
            println!();
        }

        if let Some(hints) = &self.hints {
            println!("{}", "ℹ️  Hints:".cyan().bold());
            for hint in hints {
                if hint.is_empty() {
                    println!();
                } else {
                    println!("{}", hint.white());
                }
            }
            println!();
        }
    }
}
