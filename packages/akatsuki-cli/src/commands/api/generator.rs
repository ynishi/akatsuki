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
use super::generator_contexts::{EdgeFunctionContext, RepositoryEdgeContext};
use crate::utils::find_project_root;

pub struct GeneratedFiles {
    pub migration: GeneratedFile,
    pub zod_schema: GeneratedFile,
    pub repository_edge: GeneratedFile,
    pub edge_function: GeneratedFile,
    // TODO: Add other files
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

        // Write zod schema
        self.write_file(&self.zod_schema)?;

        // Write repository (edge)
        self.write_file(&self.repository_edge)?;

        // Write edge function
        self.write_file(&self.edge_function)?;

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
        println!("  {} {}", "•".bright_blue(), self.zod_schema.description);
        println!("  {} {}", "•".bright_blue(), self.repository_edge.description);
        println!("  {} {}", "•".bright_blue(), self.edge_function.description);
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
            zod_schema: self.generate_zod_schema()?,
            repository_edge: self.generate_repository_edge()?,
            edge_function: self.generate_edge_function()?,
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

    fn generate_zod_schema(&self) -> Result<GeneratedFile> {
        let context = ZodSchemaContext::from_schema(&self.schema);
        let content = self.template_engine.render("zod_schema", &context)?;

        // Use project root for absolute path
        let project_root = find_project_root();
        let path = project_root
            .join("supabase/functions")
            .join(format!("{}-crud", self.schema.table_name))
            .join("schema.ts");

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Zod Schema (Validation)"),
        })
    }

    fn generate_repository_edge(&self) -> Result<GeneratedFile> {
        let context = RepositoryEdgeContext::from_schema(&self.schema);
        let content = self.template_engine.render("repository_edge", &context)?;

        // Use project root for absolute path
        let project_root = find_project_root();
        let path = project_root
            .join("supabase/functions/_shared/repositories")
            .join(format!("{}Repository.ts", self.schema.name));

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Repository (Edge Functions)"),
        })
    }

    fn generate_edge_function(&self) -> Result<GeneratedFile> {
        let context = EdgeFunctionContext::from_schema(&self.schema);
        let content = self.template_engine.render("edge_function", &context)?;

        // Use project root for absolute path
        let project_root = find_project_root();
        let path = project_root
            .join("supabase/functions")
            .join(format!("{}-crud", self.schema.table_name))
            .join("index.ts");

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Edge Function (createAkatsukiHandler)"),
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

/// Context for Zod Schema template
#[derive(Debug, Serialize)]
struct ZodSchemaContext {
    name: String,
    table_name: String,
    fields: Vec<ZodFieldContext>,
    enum_fields: Vec<ZodFieldContext>,
    writable_fields: Vec<ZodFieldContext>,
    updatable_fields: Vec<ZodFieldContext>,
    operations: Vec<OperationContext>,
}

#[derive(Debug, Serialize)]
struct ZodFieldContext {
    name: String,
    db_name: String,
    zod_type: String,
    required: bool,
    enum_values: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
struct OperationContext {
    op_type: String,
    name: Option<String>,
    description: Option<String>,
    filters: Vec<String>,
    limit: Option<usize>,
}

impl ZodSchemaContext {
    fn from_schema(schema: &EntitySchema) -> Self {
        let fields: Vec<ZodFieldContext> = schema
            .fields
            .iter()
            .map(|f| ZodFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                zod_type: f.zod_type(),
                required: f.required,
                enum_values: f.enum_values.clone(),
            })
            .collect();

        let enum_fields: Vec<ZodFieldContext> = schema
            .enum_fields()
            .iter()
            .map(|f| ZodFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                zod_type: f.zod_type(),
                required: f.required,
                enum_values: f.enum_values.clone(),
            })
            .collect();

        let writable_fields: Vec<ZodFieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| ZodFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                zod_type: f.zod_type(),
                required: f.required,
                enum_values: f.enum_values.clone(),
            })
            .collect();

        let updatable_fields: Vec<ZodFieldContext> = schema
            .updatable_fields()
            .iter()
            .map(|f| ZodFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                zod_type: f.zod_type(),
                required: f.required,
                enum_values: f.enum_values.clone(),
            })
            .collect();

        let operations: Vec<OperationContext> = schema
            .operations
            .iter()
            .map(|op| OperationContext {
                op_type: format!("{:?}", op.op_type).to_lowercase(),
                name: op.name.clone(),
                description: op.description.clone(),
                filters: op.filters.clone(),
                limit: op.limit,
            })
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields,
            enum_fields,
            writable_fields,
            updatable_fields,
            operations,
        }
    }
}
