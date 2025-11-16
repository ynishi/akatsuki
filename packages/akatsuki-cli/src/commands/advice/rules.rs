use anyhow::Result;
use colored::Colorize;
use std::path::Path;

use super::detectors::{Detector, Detection, DetectionCategory, GitDetector, MigrationDetector};

pub struct RuleEngine {
    detectors: Vec<Box<dyn Detector>>,
}

impl RuleEngine {
    pub fn new() -> Self {
        let detectors: Vec<Box<dyn Detector>> = vec![
            Box::new(GitDetector),
            Box::new(MigrationDetector),
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
        let has_migration = detections.iter().any(|d| d.category == DetectionCategory::PendingMigration);
        let has_uncommitted = detections.iter().any(|d| d.category == DetectionCategory::UncommittedChanges);
        let is_clean = detections.iter().any(|d| d.category == DetectionCategory::Clean);

        // Build situation messages
        for detection in detections {
            if detection.category != DetectionCategory::Clean {
                situation.push(detection.message.clone());
            }
        }

        // Generate recommended steps based on detected conditions
        if has_migration {
            steps.push("Review migration files: ls -la supabase/migrations/".to_string());
            steps.push("Apply migrations: akatsuki db push".to_string());
            steps.push("Verify schema changes in database".to_string());
        }

        if has_uncommitted {
            steps.push("Run checks: akatsuki check".to_string());
            steps.push("Run tests: akatsuki test".to_string());
            steps.push("Review changes: git diff".to_string());
            steps.push("Commit changes: git add . && git commit -m \"...\"".to_string());
        }

        if is_clean && !has_migration && !has_uncommitted {
            // Clean state - show common workflows
            situation.push("Working directory clean".to_string());
            situation.push("No pending migrations".to_string());

            hints.push("Common workflows:".to_string());
            hints.push("  New feature:".to_string());
            hints.push("    1. akatsuki design new <name>".to_string());
            hints.push("    2. akatsuki db migration-new <name>".to_string());
            hints.push("    3. Implement features".to_string());
            hints.push("    4. akatsuki check".to_string());
            hints.push("".to_string());
            hints.push("  Documentation:".to_string());
            hints.push("    akatsuki docs components".to_string());
            hints.push("    akatsuki docs models".to_string());
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
