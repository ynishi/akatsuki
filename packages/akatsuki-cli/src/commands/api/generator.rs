/**
 * Code Generator
 * HEADLESS API Generator
 */
use anyhow::Result;
use colored::Colorize;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

use super::generator_contexts::{
    AdminPageContext, CLIClientContext, DemoComponentContext, EdgeFunctionContext, HookContext,
    ModelContext, RepositoryEdgeContext, ServiceContext,
};
use super::schema::EntitySchema;
use super::templates::TemplateEngine;
use crate::utils::find_project_root;

pub struct GeneratedFiles {
    // Backend (Supabase Edge Functions)
    pub migration: GeneratedFile,
    pub zod_schema: GeneratedFile,
    pub repository_edge: GeneratedFile,
    pub edge_function: GeneratedFile,
    // Frontend (React)
    pub model: GeneratedFile,
    pub service: GeneratedFile,
    pub hook: GeneratedFile,
    // UI Components
    pub admin_page: GeneratedFile,
    pub demo_component: GeneratedFile,
    // CLI (Node.js)
    pub cli_client: GeneratedFile,
}

pub struct GeneratedFile {
    pub path: PathBuf,
    pub content: String,
    pub description: String,
}

impl GeneratedFiles {
    pub fn write_to_disk(&self) -> Result<()> {
        // Backend
        self.write_file(&self.migration)?;
        self.write_file(&self.zod_schema)?;
        self.write_file(&self.repository_edge)?;
        self.write_file(&self.edge_function)?;

        // Frontend
        self.write_file(&self.model)?;
        self.write_file(&self.service)?;
        self.write_file(&self.hook)?;

        // UI Components
        self.write_file(&self.admin_page)?;
        self.write_file(&self.demo_component)?;

        // CLI
        self.write_file(&self.cli_client)?;

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
        println!(
            "\n  {} Backend (Supabase Edge Functions):",
            "📦".bright_blue()
        );
        println!("    {} {}", "•".bright_blue(), self.migration.description);
        println!("    {} {}", "•".bright_blue(), self.zod_schema.description);
        println!(
            "    {} {}",
            "•".bright_blue(),
            self.repository_edge.description
        );
        println!(
            "    {} {}",
            "•".bright_blue(),
            self.edge_function.description
        );

        println!("\n  {} Frontend (React):", "⚛️".bright_blue());
        println!("    {} {}", "•".bright_blue(), self.model.description);
        println!("    {} {}", "•".bright_blue(), self.service.description);
        println!("    {} {}", "•".bright_blue(), self.hook.description);

        println!("\n  {} UI Components:", "🎨".bright_blue());
        println!("    {} {}", "•".bright_blue(), self.admin_page.description);
        println!(
            "    {} {}",
            "•".bright_blue(),
            self.demo_component.description
        );

        println!("\n  {} CLI (Node.js):", "🖥️".bright_blue());
        println!("    {} {}", "•".bright_blue(), self.cli_client.description);
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
            // Backend
            migration: self.generate_migration()?,
            zod_schema: self.generate_zod_schema()?,
            repository_edge: self.generate_repository_edge()?,
            edge_function: self.generate_edge_function()?,
            // Frontend
            model: self.generate_model()?,
            service: self.generate_service()?,
            hook: self.generate_hook()?,
            // UI Components
            admin_page: self.generate_admin_page()?,
            demo_component: self.generate_demo_component()?,
            // CLI
            cli_client: self.generate_cli_client()?,
        })
    }

    fn generate_migration(&self) -> Result<GeneratedFile> {
        let context = MigrationContext::from_schema(&self.schema);
        let content = self.template_engine.render("migration", &context)?;

        // Generate migration filename with timestamp
        let timestamp = chrono::Local::now().format("%Y%m%d%H%M%S");
        let filename = format!("{}_create_{}_table.sql", timestamp, self.schema.table_name);

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

    // ================== Frontend Generators ==================

    fn generate_model(&self) -> Result<GeneratedFile> {
        let context = ModelContext::from_schema(&self.schema);
        let content = self.template_engine.render("model", &context)?;

        let project_root = find_project_root();
        let path = project_root
            .join("packages/app-frontend/src/models")
            .join(format!("{}.ts", self.schema.name));

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Model (fromDatabase/toDatabase)"),
        })
    }

    fn generate_service(&self) -> Result<GeneratedFile> {
        let context = ServiceContext::from_schema(&self.schema);
        let content = self.template_engine.render("service", &context)?;

        let project_root = find_project_root();
        let path = project_root
            .join("packages/app-frontend/src/services")
            .join(format!("{}Service.ts", self.schema.name));

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Service (EdgeFunctionService wrapper)"),
        })
    }

    fn generate_hook(&self) -> Result<GeneratedFile> {
        let context = HookContext::from_schema(&self.schema);
        let content = self.template_engine.render("hook", &context)?;

        let project_root = find_project_root();
        let path = project_root
            .join("packages/app-frontend/src/hooks")
            .join(format!("use{}s.ts", self.schema.name));

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Hook (React Query CRUD)"),
        })
    }

    // ================== UI Component Generators ==================

    fn generate_admin_page(&self) -> Result<GeneratedFile> {
        let context = AdminPageContext::from_schema(&self.schema);
        let content = self.template_engine.render("admin_page", &context)?;

        let project_root = find_project_root();
        let path = project_root
            .join("packages/app-frontend/src/pages/admin/entities")
            .join(format!("{}AdminPage.tsx", self.schema.name));

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Admin Page (/admin/{}s)", self.schema.table_name),
        })
    }

    fn generate_demo_component(&self) -> Result<GeneratedFile> {
        let context = DemoComponentContext::from_schema(&self.schema);
        let content = self.template_engine.render("demo_component", &context)?;

        let project_root = find_project_root();
        let path = project_root
            .join("packages/app-frontend/src/components/features")
            .join(self.schema.table_name.clone())
            .join(format!("{}sDemo.tsx", self.schema.name));

        Ok(GeneratedFile {
            path,
            content,
            description: format!("Demo Component (<{}sDemo />)", self.schema.name),
        })
    }

    // ================== CLI Generator ==================

    fn generate_cli_client(&self) -> Result<GeneratedFile> {
        let context = CLIClientContext::from_schema(&self.schema);
        let content = self.template_engine.render("cli_client", &context)?;

        let project_root = find_project_root();
        let path = project_root
            .join("packages/app-cli/clients")
            .join(format!("{}sClient.js", self.schema.name));

        Ok(GeneratedFile {
            path,
            content,
            description: format!("CLI Client ({}sClient)", self.schema.name),
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
        // === 1. Standard fields (id, user_id) at the beginning ===
        let mut fields: Vec<FieldContext> = vec![
            // id UUID PRIMARY KEY
            FieldContext {
                name: "id".to_string(),
                db_name: "id".to_string(),
                sql_type: "UUID".to_string(),
                required: true,
                default: Some("gen_random_uuid()".to_string()),
                primary_key: true,
                unique: false,
                references: None,
                on_delete: None,
                enum_values: None,
                index: false,
                index_type: None,
            },
            // user_id UUID REFERENCES auth.users(id)
            FieldContext {
                name: "userId".to_string(),
                db_name: "user_id".to_string(),
                sql_type: "UUID".to_string(),
                required: true,
                default: None,
                primary_key: false,
                unique: false,
                references: Some("auth.users(id)".to_string()),
                on_delete: Some("CASCADE".to_string()),
                enum_values: None,
                index: true,
                index_type: None,
            },
        ];

        // === 2. User-defined fields from schema ===
        let user_fields: Vec<FieldContext> = schema
            .fields
            .iter()
            .map(|f| {
                // Quote enum/string defaults
                let default = f.default.clone().map(|d| {
                    use super::schema::FieldType;
                    match f.field_type {
                        FieldType::Enum | FieldType::String => {
                            // Check if already quoted
                            if d.starts_with('\'')
                                || d.starts_with("gen_random_uuid")
                                || d.starts_with("NOW")
                            {
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
        fields.extend(user_fields);

        // === 3. Timestamp fields at the end ===
        fields.push(FieldContext {
            name: "createdAt".to_string(),
            db_name: "created_at".to_string(),
            sql_type: "TIMESTAMPTZ".to_string(),
            required: false,
            default: Some("NOW()".to_string()),
            primary_key: false,
            unique: false,
            references: None,
            on_delete: None,
            enum_values: None,
            index: false,
            index_type: None,
        });
        fields.push(FieldContext {
            name: "updatedAt".to_string(),
            db_name: "updated_at".to_string(),
            sql_type: "TIMESTAMPTZ".to_string(),
            required: false,
            default: Some("NOW()".to_string()),
            primary_key: false,
            unique: false,
            references: None,
            on_delete: None,
            enum_values: None,
            index: false,
            index_type: None,
        });

        // === 4. Build indexed_fields (user_id + user-defined indexes) ===
        let mut indexed_fields: Vec<FieldContext> = vec![
            // user_id index
            FieldContext {
                name: "userId".to_string(),
                db_name: "user_id".to_string(),
                sql_type: "UUID".to_string(),
                required: true,
                default: None,
                primary_key: false,
                unique: false,
                references: None,
                on_delete: None,
                enum_values: None,
                index: true,
                index_type: None,
            },
        ];
        // Add user-defined indexed fields
        let user_indexed: Vec<FieldContext> = schema
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
        indexed_fields.extend(user_indexed);

        // === 5. RLS policies ===
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

        // === 6. Always enable updated_at trigger (standard fields include updated_at) ===
        let has_updated_at = true;

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

        // Collect enum field names to filter out duplicates from operation filters
        let enum_field_names: std::collections::HashSet<String> = schema
            .enum_fields()
            .iter()
            .map(|f| f.name.clone())
            .collect();

        let operations: Vec<OperationContext> = schema
            .operations
            .iter()
            .map(|op| OperationContext {
                op_type: format!("{:?}", op.op_type).to_lowercase(),
                name: op.name.clone(),
                description: op.description.clone(),
                // Filter out filters that are already defined as enum_fields to avoid duplicates
                filters: op
                    .filters
                    .iter()
                    .filter(|f| !enum_field_names.contains(*f))
                    .cloned()
                    .collect(),
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
