use anyhow::Result;
use std::path::Path;

mod code_quality;
mod docs;
mod git;
mod migration;
mod refactor;
mod test;

pub use code_quality::CodeQualityDetector;
pub use docs::DocsDetector;
pub use git::GitDetector;
pub use migration::MigrationDetector;
pub use refactor::RefactorDetector;
pub use test::TestDetector;

/// Detector trait for analyzing project state
pub trait Detector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>>;
}

/// Detection result
#[derive(Debug, Clone)]
pub struct Detection {
    pub category: DetectionCategory,
    pub message: String,
    pub priority: u8,
}

/// Detection categories
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DetectionCategory {
    // Migration & Git
    PendingMigration,
    UncommittedChanges,

    // Code Quality
    LintError,
    TypeCheckError,
    FormatError,

    // Testing
    FailingTests,
    MissingTests,
    LowCoverage,

    // Code Health
    CodeComplexity,
    DuplicateCode,
    RefactoringNeeded,

    // Documentation
    DesignDocument,
    IncompleteDesignDoc,
    MissingDesignDoc,

    // General
    CheckRequired,
    Clean,
}

impl Detection {
    pub fn new(category: DetectionCategory, message: String, priority: u8) -> Self {
        Self {
            category,
            message,
            priority,
        }
    }
}
