/**
 * Code Generator
 * HEADLESS API Generator
 */

use anyhow::Result;
use colored::Colorize;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

use super::schema::EntitySchema;
use super::templates::TemplateEngine;
use crate::utils::find_project_root;

pub struct GeneratedFiles {
    pub migration: GeneratedFile,
    // TODO: Add other files
    // pub zod_schema: GeneratedFile,
    // pub repository_edge: GeneratedFile,
    // pub edge_function: GeneratedFile,
    // pub model: GeneratedFile,
    // pub repository_frontend: GeneratedFile,
    // pub service: GeneratedFile,
    // pub hook: GeneratedFile,
    // pub cli_client: GeneratedFile,
}

pub struct GeneratedFile {
    pub path: PathBuf,
    pub content: String,
    pub description: String,
}

impl GeneratedFiles {
    pub fn write_to_disk(&self) -> Result<()> {
        // Write migration
        self.write_file(&self.migration)?;

        // TODO: Write other files

        Ok(())
    }

    fn write_file(&self, file: &GeneratedFile) -> Result<()> {
        // Create parent directory if not exists
        if let Some(parent) = file.path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Write file
        fs::write(&file.path, &file.content)?;

        println!(
            "  {} {}",
            "✓".green(),
            file.path.display().to_string().bright_white()
        );

        Ok(())
    }

    pub fn print_summary(&self) {
        println!("  {} {}", "•".bright_blue(), self.migration.description);
        // TODO: Print other files
    }
}

pub struct CodeGenerator {
    schema: EntitySchema,
    template_engine: TemplateEngine,
}

impl CodeGenerator {
    pub fn new(schema: EntitySchema) -> Self {
        let template_engine = TemplateEngine::new().expect("Failed to initialize template engine");

        Self {
            schema,
            template_engine,
        }
    }

    pub fn generate_all(&self) -> Result<GeneratedFiles> {
        Ok(GeneratedFiles {
            migration: self.generate_migration()?,
            // TODO: Generate other files
        })
    }

    fn generate_migration(&self) -> Result<GeneratedFile> {
        let context = MigrationContext::from_schema(&self.schema);
        let content = self.template_engine.render("migration", &context)?;

        // Generate migration filename with timestamp
        let timestamp = chrono::Local::now().format("%Y%m%d%H%M%S");
        let filename = format!(
            "{}_create_{}_table.sql",
            timestamp,
            self.schema.table_name
        );

        // Use project root for absolute path
        let project_root = find_project_root();
        let path = project_root.join("supabase/migrations").join(filename);

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Migration (Table + RLS + Indexes)"),
        })
    }
}

/// Context for migration template
#[derive(Debug, Serialize)]
struct MigrationContext {
    name: String,
    table_name: String,
    fields: Vec<FieldContext>,
    indexed_fields: Vec<FieldContext>,
    rls: Vec<RLSPolicyContext>,
    has_updated_at: bool,
    documentation: DocumentationContext,
}

#[derive(Debug, Serialize)]
struct FieldContext {
    name: String,
    db_name: String,
    sql_type: String,
    required: bool,
    default: Option<String>,
    primary_key: bool,
    unique: bool,
    references: Option<String>,
    on_delete: Option<String>,
    enum_values: Option<Vec<String>>,
    index: bool,
    index_type: Option<String>,
}

#[derive(Debug, Serialize)]
struct RLSPolicyContext {
    action: String,
    name: String,
    using: Option<String>,
    with_check: Option<String>,
}

#[derive(Debug, Serialize)]
struct DocumentationContext {
    description: Option<String>,
}

impl MigrationContext {
    fn from_schema(schema: &EntitySchema) -> Self {
        use super::schema::Field;

        let fields: Vec<FieldContext> = schema
            .fields
            .iter()
            .map(|f| {
                // Quote enum/string defaults
                let default = f.default.clone().map(|d| {
                    use super::schema::FieldType;
                    match f.field_type {
                        FieldType::Enum | FieldType::String => {
                            // Check if already quoted
                            if d.starts_with('\'') || d.starts_with("gen_random_uuid") || d.starts_with("NOW") {
                                d
                            } else {
                                format!("'{}'", d)
                            }
                        }
                        _ => d,
                    }
                });

                FieldContext {
                    name: f.name.clone(),
                    db_name: f.db_name.clone(),
                    sql_type: f.sql_type(),
                    required: f.required,
                    default,
                    primary_key: f.primary_key,
                    unique: f.unique,
                    references: f.references.clone(),
                    on_delete: f.on_delete.clone(),
                    enum_values: f.enum_values.clone(),
                    index: f.index,
                    index_type: f.index_type.clone(),
                }
            })
            .collect();

        let indexed_fields: Vec<FieldContext> = schema
            .indexed_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                sql_type: f.sql_type(),
                required: f.required,
                default: f.default.clone(),
                primary_key: f.primary_key,
                unique: f.unique,
                references: f.references.clone(),
                on_delete: f.on_delete.clone(),
                enum_values: f.enum_values.clone(),
                index: f.index,
                index_type: f.index_type.clone(),
            })
            .collect();

        let rls: Vec<RLSPolicyContext> = schema
            .rls
            .iter()
            .map(|p| RLSPolicyContext {
                action: p.action.clone(),
                name: p.name.clone(),
                using: p.using.clone(),
                with_check: p.with_check.clone(),
            })
            .collect();

        let has_updated_at = schema
            .fields
            .iter()
            .any(|f| f.name == "updatedAt" && f.auto_update);

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields,
            indexed_fields,
            rls,
            has_updated_at,
            documentation: DocumentationContext {
                description: schema
                    .documentation
                    .as_ref()
                    .and_then(|d| d.description.clone()),
            },
        }
    }
}
