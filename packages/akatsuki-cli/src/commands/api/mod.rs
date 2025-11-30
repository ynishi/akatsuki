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

mod schema;
mod generator;
mod generator_contexts;
mod templates;

use schema::EntitySchema;
use generator::CodeGenerator;

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
            ApiAction::List => self.list_apis(),
            ApiAction::Delete { entity_name, force } => self.delete_api(entity_name, force),
        }
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
            anyhow::bail!(
                "Please specify one of: --schema <file>, --interactive, or --from-db"
            );
        };

        println!("\n{} Entity: {}", "✓".green(), entity_schema.name.bright_white());
        println!("{} Table: {}", "✓".green(), entity_schema.table_name);
        println!(
            "{} Fields: {}",
            "✓".green(),
            entity_schema.fields.len()
        );
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
        println!("  2. Deploy Edge Function: {}", format!("akatsuki function deploy {}-crud", entity_name.to_lowercase()).bright_white());
        println!("  3. Test in Browser: http://localhost:5173/examples");
        println!("  4. Test with CLI: {}", format!("node packages/app-cli/examples/list-{}.js", entity_name.to_lowercase()).bright_white());

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
}
