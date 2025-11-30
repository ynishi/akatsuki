/**
 * API Generator Command
 * HEADLESS API Generator - VibeCoding Scaffolding
 *
 * Auto-generates:
 * - Migration (Table + RLS + Indexes)
 * - Edge Function (CRUD API)
 * - Frontend (Model + Repository + Service + Hook + Component)
 * - CLI Tools (Client + Examples)
 */
use anyhow::Result;
use colored::Colorize;
use std::path::PathBuf;

use crate::cli::ApiAction;

mod generator;
mod generator_contexts;
mod schema;
mod templates;

use generator::CodeGenerator;
use schema::EntitySchema;

pub struct ApiCommand;

impl ApiCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, action: ApiAction) -> Result<()> {
        match action {
            ApiAction::New {
                entity_name,
                schema,
                interactive,
                from_db,
            } => self.generate_new(entity_name, schema, interactive, from_db),
            ApiAction::Batch { files } => self.generate_batch(files),
            ApiAction::List => self.list_apis(),
            ApiAction::Delete { entity_name, force } => self.delete_api(entity_name, force),
            ApiAction::Check { files } => self.check_schemas(files),
        }
    }

    fn check_schemas(&self, files: Vec<PathBuf>) -> Result<()> {
        println!(
            "{}",
            "🔍 HEADLESS API Schema Validator".bright_cyan().bold()
        );
        println!("{}", "─".repeat(50).bright_black());
        println!("📁 Validating {} schema file(s)...\n", files.len());

        let mut valid_count = 0;
        let mut error_count = 0;

        for (index, path) in files.iter().enumerate() {
            let file_name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| path.display().to_string());

            print!(
                "{} [{}/{}] {}",
                "→".bright_blue(),
                index + 1,
                files.len(),
                file_name.bright_white()
            );

            match EntitySchema::from_yaml(path) {
                Ok(schema) => {
                    println!(" {}", "✓".green());
                    println!(
                        "    {} Entity: {}, Table: {}, Fields: {}, Operations: {}",
                        "•".bright_blue(),
                        schema.name,
                        schema.table_name,
                        schema.fields.len(),
                        schema.operations.len()
                    );
                    valid_count += 1;
                }
                Err(e) => {
                    println!(" {}", "✗".red());
                    println!("    {} {}", "Error:".red(), e);
                    error_count += 1;
                }
            }
        }

        println!("\n{}", "─".repeat(50).bright_black());
        println!("{}", "📊 Validation Summary".bright_cyan().bold());
        println!("  {} Valid:   {}", "✓".green(), valid_count);
        if error_count > 0 {
            println!("  {} Invalid: {}", "✗".red(), error_count);
            anyhow::bail!("{} schema file(s) failed validation", error_count);
        }

        println!("\n{}", "✅ All schemas are valid!".green().bold());
        Ok(())
    }

    fn generate_new(
        &self,
        entity_name: String,
        schema_path: Option<PathBuf>,
        interactive: bool,
        from_db: bool,
    ) -> Result<()> {
        println!("{}", "🚀 HEADLESS API Generator".bright_cyan().bold());
        println!("{}", "─".repeat(50).bright_black());

        // Parse schema
        let entity_schema = if let Some(path) = schema_path {
            println!("📖 Reading schema from: {}", path.display());
            EntitySchema::from_yaml(&path)?
        } else if interactive {
            println!("🤖 Interactive mode");
            EntitySchema::from_interactive(&entity_name)?
        } else if from_db {
            println!("🗄️  Reading from Database Types");
            EntitySchema::from_database_types(&entity_name)?
        } else {
            anyhow::bail!("Please specify one of: --schema <file>, --interactive, or --from-db");
        };

        println!(
            "\n{} Entity: {}",
            "✓".green(),
            entity_schema.name.bright_white()
        );
        println!("{} Table: {}", "✓".green(), entity_schema.table_name);
        println!("{} Fields: {}", "✓".green(), entity_schema.fields.len());
        println!(
            "{} Operations: {}",
            "✓".green(),
            entity_schema.operations.len()
        );

        // Generate code
        println!("\n{}", "📝 Generating files...".bright_cyan());
        let generator = CodeGenerator::new(entity_schema);
        let files = generator.generate_all()?;

        // Write files
        files.write_to_disk()?;

        println!("\n{}", "✅ Successfully generated CRUD API!".green().bold());
        println!("\n{}", "📁 Generated files:".bright_cyan());
        files.print_summary();

        println!("\n{}", "🚀 Next steps:".bright_cyan());
        println!("  1. Review generated files");
        println!("  2. Run migration: {}", "akatsuki db push".bright_white());
        println!(
            "  3. Deploy Edge Function: {}",
            format!(
                "akatsuki function deploy {}-crud",
                entity_name.to_lowercase()
            )
            .bright_white()
        );
        println!("  4. Test in Browser: http://localhost:5173/examples");

        println!("\n{}", "📌 Add routes to App.tsx:".bright_cyan());
        println!(
            "  {}",
            format!(
                "import {{ {}AdminPage }} from './pages/admin/entities/{}AdminPage'",
                entity_name, entity_name
            )
            .bright_white()
        );
        println!(
            "  {}",
            format!(
                "<Route path=\"/admin/{}s\" element={{<{}AdminPage />}} />",
                entity_name.to_lowercase(),
                entity_name
            )
            .bright_white()
        );

        println!("\n{}", "📌 Add demo to ExamplesPage.tsx:".bright_cyan());
        println!(
            "  {}",
            format!(
                "import {{ {}sDemo }} from '../components/features/{}/{}sDemo'",
                entity_name,
                entity_name.to_lowercase() + "s",
                entity_name
            )
            .bright_white()
        );
        println!("  {}", format!("<{}sDemo />", entity_name).bright_white());

        Ok(())
    }

    fn list_apis(&self) -> Result<()> {
        println!("{}", "📋 Generated APIs".bright_cyan().bold());
        println!("{}", "─".repeat(50).bright_black());
        println!("\n{}", "Not implemented yet".yellow());
        println!("This will list all entities with generated CRUD APIs");
        Ok(())
    }

    fn delete_api(&self, entity_name: String, force: bool) -> Result<()> {
        println!(
            "{} Delete API: {}",
            "🗑️".to_string(),
            entity_name.bright_white()
        );
        println!("{}", "─".repeat(50).bright_black());

        if !force {
            println!("\n{}", "Not implemented yet".yellow());
            println!("This will delete all generated files for the entity");
        }

        Ok(())
    }

    fn generate_batch(&self, files: Vec<std::path::PathBuf>) -> Result<()> {
        println!("{}", "🚀 HEADLESS API Batch Generator".bright_cyan().bold());
        println!("{}", "─".repeat(50).bright_black());
        println!("📁 Processing {} schema files...\n", files.len());

        let mut success_count = 0;
        let mut error_count = 0;
        let mut results: Vec<(String, bool, String)> = Vec::new();

        for (index, path) in files.iter().enumerate() {
            let file_name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| path.display().to_string());

            println!(
                "{} [{}/{}] Processing: {}",
                "→".bright_blue(),
                index + 1,
                files.len(),
                file_name.bright_white()
            );

            // Parse schema
            match EntitySchema::from_yaml(path) {
                Ok(entity_schema) => {
                    let entity_name = entity_schema.name.clone();

                    // Generate code
                    let generator = CodeGenerator::new(entity_schema);
                    match generator.generate_all() {
                        Ok(generated_files) => match generated_files.write_to_disk() {
                            Ok(_) => {
                                println!(
                                    "  {} {} generated successfully",
                                    "✓".green(),
                                    entity_name.bright_white()
                                );
                                success_count += 1;
                                results.push((entity_name, true, "OK".to_string()));
                            }
                            Err(e) => {
                                println!("  {} {} failed to write: {}", "✗".red(), entity_name, e);
                                error_count += 1;
                                results.push((entity_name, false, e.to_string()));
                            }
                        },
                        Err(e) => {
                            println!("  {} {} generation failed: {}", "✗".red(), entity_name, e);
                            error_count += 1;
                            results.push((entity_name, false, e.to_string()));
                        }
                    }
                }
                Err(e) => {
                    println!("  {} Failed to parse {}: {}", "✗".red(), file_name, e);
                    error_count += 1;
                    results.push((file_name, false, e.to_string()));
                }
            }
        }

        // Summary
        println!("\n{}", "─".repeat(50).bright_black());
        println!("{}", "📊 Batch Generation Summary".bright_cyan().bold());
        println!("  {} Success: {}", "✓".green(), success_count);
        if error_count > 0 {
            println!("  {} Failed:  {}", "✗".red(), error_count);
        }

        if success_count > 0 {
            println!("\n{}", "🚀 Next steps:".bright_cyan());
            println!("  1. Review generated files");
            println!("  2. Run migrations: {}", "akatsuki db push".bright_white());
            println!(
                "  3. Deploy Edge Functions: {}",
                "akatsuki function deploy".bright_white()
            );
        }

        if error_count > 0 {
            anyhow::bail!("{} schema file(s) failed to generate", error_count);
        }

        Ok(())
    }
}
