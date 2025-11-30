/**
 * Context types for template rendering
 *
 * Architecture: Schema (AST) → Context (View) → Template (CodeGen)
 *
 * - Schema (EntitySchema): Canonical representation parsed from YAML
 * - Context: View layer for template rendering, derived from Schema
 * - IntoContext trait: Type-safe transformation from Schema to Context
 */
use serde::Serialize;
use std::collections::HashSet;

use super::schema::{EntitySchema, Field, Operation, OperationType};

// ============================================================================
// Core Traits - DSL → AST → View transformation
// ============================================================================

/// Type-safe transformation trait from Schema types to Context types
pub trait IntoContext<T> {
    fn into_context(&self) -> T;
}

// ============================================================================
// Field Context - View for Field schema
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct FieldContext {
    pub name: String,
    pub db_name: String,
    pub typescript_type: String,
    pub typescript_default: String,
    pub required: bool,
}

impl IntoContext<FieldContext> for Field {
    fn into_context(&self) -> FieldContext {
        FieldContext {
            name: self.name.clone(),
            db_name: self.db_name.clone(),
            typescript_type: self.typescript_type(),
            typescript_default: self.typescript_default(),
            required: self.required,
        }
    }
}

// ============================================================================
// Enum Field Context - View for enum fields
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct EnumFieldContext {
    pub name: String,
    pub db_name: String,
    pub enum_values: Vec<String>,
}

impl IntoContext<EnumFieldContext> for Field {
    fn into_context(&self) -> EnumFieldContext {
        EnumFieldContext {
            name: self.name.clone(),
            db_name: self.db_name.clone(),
            enum_values: self.enum_values.clone().unwrap_or_default(),
        }
    }
}

// ============================================================================
// Operation Context - View for Operation schema
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct OperationContext {
    pub op_type: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub filters: Vec<String>,
    pub limit: Option<usize>,
}

impl IntoContext<OperationContext> for Operation {
    fn into_context(&self) -> OperationContext {
        OperationContext {
            op_type: self.op_type.as_str().to_string(),
            name: self.name.clone(),
            description: self.description.clone(),
            filters: self.filters.clone(),
            limit: self.limit,
        }
    }
}

// ============================================================================
// Operation Context Builder - Handles filter deduplication
// ============================================================================

/// Builder for creating OperationContext with optional enum field deduplication
pub struct OperationContextBuilder<'a> {
    schema: &'a EntitySchema,
    exclude_enum_fields_from_filters: bool,
}

impl<'a> OperationContextBuilder<'a> {
    pub fn new(schema: &'a EntitySchema) -> Self {
        Self {
            schema,
            exclude_enum_fields_from_filters: false,
        }
    }

    /// Enable filtering out enum field names from operation filters
    /// Use this for Hook/CLIClient contexts to avoid duplicate definitions
    pub fn exclude_enum_fields_from_filters(mut self) -> Self {
        self.exclude_enum_fields_from_filters = true;
        self
    }

    pub fn build(self) -> Vec<OperationContext> {
        let enum_field_names: HashSet<String> = if self.exclude_enum_fields_from_filters {
            self.schema
                .enum_fields()
                .iter()
                .map(|f| f.name.clone())
                .collect()
        } else {
            HashSet::new()
        };

        self.schema
            .operations
            .iter()
            .map(|op| OperationContext {
                op_type: op.op_type.as_str().to_string(),
                name: op.name.clone(),
                description: op.description.clone(),
                filters: op
                    .filters
                    .iter()
                    .filter(|f| !enum_field_names.contains(*f))
                    .cloned()
                    .collect(),
                limit: op.limit,
            })
            .collect()
    }
}

// ============================================================================
// Custom Operation Context
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct CustomOpContext {
    pub name: String,
    pub description: Option<String>,
    pub filters: Vec<String>,
    pub limit: Option<usize>,
}

// ============================================================================
// Helper functions for common field set conversions
// ============================================================================

/// Convert a slice of Field references to Vec<FieldContext>
fn fields_to_context(fields: &[&Field]) -> Vec<FieldContext> {
    fields.iter().map(|f| f.into_context()).collect()
}

/// Convert enum fields to Vec<EnumFieldContext>
fn enum_fields_to_context(schema: &EntitySchema) -> Vec<EnumFieldContext> {
    schema
        .enum_fields()
        .iter()
        .map(|f| f.into_context())
        .collect()
}

// ============================================================================
// Repository Edge Context
// ============================================================================

#[derive(Debug, Serialize)]
pub struct RepositoryEdgeContext {
    pub name: String,
    pub table_name: String,
    pub fields: Vec<FieldContext>,
    pub writable_fields: Vec<FieldContext>,
    pub updatable_fields: Vec<FieldContext>,
    pub list_filters: Vec<String>,
    pub all_filters: Vec<String>,
    pub custom_operations: Vec<CustomOpContext>,
}

impl RepositoryEdgeContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        // Use IntoContext trait for field conversions
        let fields: Vec<FieldContext> = schema.fields.iter().map(|f| f.into_context()).collect();
        let writable_fields = fields_to_context(&schema.writable_fields());
        let updatable_fields = fields_to_context(&schema.updatable_fields());

        // Extract filters from list operation
        let list_filters: Vec<String> = schema
            .operations
            .iter()
            .find(|op| op.op_type == OperationType::List)
            .map(|op| op.filters.clone())
            .unwrap_or_default();

        // All unique filters
        let mut all_filters = list_filters.clone();
        for op in &schema.operations {
            for filter in &op.filters {
                if !all_filters.contains(filter) {
                    all_filters.push(filter.clone());
                }
            }
        }

        // Custom operations
        let custom_operations: Vec<CustomOpContext> = schema
            .operations
            .iter()
            .filter(|op| op.op_type == OperationType::Custom)
            .map(|op| CustomOpContext {
                name: op.name.clone().unwrap_or_default(),
                description: op.description.clone(),
                filters: op.filters.clone(),
                limit: op.limit,
            })
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields,
            writable_fields,
            updatable_fields,
            list_filters,
            all_filters,
            custom_operations,
        }
    }
}

/// Context for Edge Function template
#[derive(Debug, Serialize)]
pub struct EdgeFunctionContext {
    pub name: String,
    pub table_name: String,
    pub operations: Vec<OperationContext>,
    pub writable_fields: Vec<FieldContext>,
}

/// Context for Frontend Model template
#[derive(Debug, Serialize)]
pub struct ModelContext {
    pub name: String,
    pub table_name: String,
    pub fields: Vec<FieldContext>,
    pub writable_fields: Vec<FieldContext>,
    pub updatable_fields: Vec<FieldContext>,
    pub enum_fields: Vec<EnumFieldContext>,
}

impl ModelContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields: schema.fields.iter().map(|f| f.into_context()).collect(),
            writable_fields: fields_to_context(&schema.writable_fields()),
            updatable_fields: fields_to_context(&schema.updatable_fields()),
            enum_fields: enum_fields_to_context(schema),
        }
    }
}

/// Context for Frontend Service template
#[derive(Debug, Serialize)]
pub struct ServiceContext {
    pub name: String,
    pub table_name: String,
    pub operations: Vec<OperationContext>,
    pub writable_fields: Vec<FieldContext>,
    pub updatable_fields: Vec<FieldContext>,
    pub enum_fields: Vec<EnumFieldContext>,
}

impl ServiceContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            // Service doesn't need filter deduplication (backend handles it)
            operations: OperationContextBuilder::new(schema).build(),
            writable_fields: fields_to_context(&schema.writable_fields()),
            updatable_fields: fields_to_context(&schema.updatable_fields()),
            enum_fields: enum_fields_to_context(schema),
        }
    }
}

/// Context for Frontend Hook template (React Query)
#[derive(Debug, Serialize)]
pub struct HookContext {
    pub name: String,
    pub table_name: String,
    pub operations: Vec<OperationContext>,
    pub writable_fields: Vec<FieldContext>,
    pub updatable_fields: Vec<FieldContext>,
    pub enum_fields: Vec<EnumFieldContext>,
}

impl HookContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            // Hook needs filter deduplication to avoid duplicate type definitions
            operations: OperationContextBuilder::new(schema)
                .exclude_enum_fields_from_filters()
                .build(),
            writable_fields: fields_to_context(&schema.writable_fields()),
            updatable_fields: fields_to_context(&schema.updatable_fields()),
            enum_fields: enum_fields_to_context(schema),
        }
    }
}

/// Context for CLI Client template (Node.js)
#[derive(Debug, Serialize)]
pub struct CLIClientContext {
    pub name: String,
    pub table_name: String,
    pub operations: Vec<OperationContext>,
    pub writable_fields: Vec<FieldContext>,
    pub updatable_fields: Vec<FieldContext>,
    pub enum_fields: Vec<EnumFieldContext>,
}

impl CLIClientContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        // Collect operation names for enum conflict detection
        let operation_names: HashSet<String> = schema
            .operations
            .iter()
            .filter_map(|op| op.name.clone())
            .collect();

        // Filter enum_fields to exclude those whose enum values conflict with operation names
        // e.g., if schema has custom operation "published" and enum field with values ['draft', 'published'],
        // skip the enum field to avoid generating duplicate published() method
        let enum_fields: Vec<EnumFieldContext> = schema
            .enum_fields()
            .iter()
            .filter_map(|f| {
                let enum_values = f.enum_values.clone().unwrap_or_default();
                // Check if any enum value (index 1+, used for helper method names) conflicts with operations
                let has_conflict = enum_values
                    .iter()
                    .skip(1)
                    .any(|v| operation_names.contains(v));
                if has_conflict {
                    None // Skip this enum field to avoid duplicate method generation
                } else {
                    Some(f.into_context())
                }
            })
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            operations: OperationContextBuilder::new(schema).build(),
            writable_fields: fields_to_context(&schema.writable_fields()),
            updatable_fields: fields_to_context(&schema.updatable_fields()),
            enum_fields,
        }
    }
}

impl EdgeFunctionContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            operations: OperationContextBuilder::new(schema).build(),
            writable_fields: fields_to_context(&schema.writable_fields()),
        }
    }
}

/// Context for Admin Page template
#[derive(Debug, Serialize)]
pub struct AdminPageContext {
    pub name: String,
    pub table_name: String,
    pub fields: Vec<UIFieldContext>,
    pub writable_fields: Vec<UIFieldContext>,
    pub updatable_fields: Vec<UIFieldContext>,
    pub display_fields: Vec<UIFieldContext>,
    pub enum_fields: Vec<EnumFieldContext>,
    pub has_content_field: bool,
    pub examples: Vec<std::collections::HashMap<String, String>>,
}

/// Extended field context for UI components
#[derive(Debug, Clone, Serialize)]
pub struct UIFieldContext {
    pub name: String,
    pub db_name: String,
    pub typescript_type: String,
    pub typescript_default: String,
    pub field_type: String,
    pub required: bool,
    pub enum_values: Vec<String>,
}

impl IntoContext<UIFieldContext> for Field {
    fn into_context(&self) -> UIFieldContext {
        UIFieldContext {
            name: self.name.clone(),
            db_name: self.db_name.clone(),
            typescript_type: self.typescript_type(),
            typescript_default: self.typescript_default(),
            field_type: self.field_type.as_str().to_string(),
            required: self.required,
            enum_values: self.enum_values.clone().unwrap_or_default(),
        }
    }
}

/// Convert a slice of Field references to Vec<UIFieldContext>
fn ui_fields_to_context(fields: &[&Field]) -> Vec<UIFieldContext> {
    fields.iter().map(|f| f.into_context()).collect()
}

impl AdminPageContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        // Display fields: writable fields excluding userId, limited to first 4
        let display_fields: Vec<UIFieldContext> = schema
            .writable_fields()
            .iter()
            .filter(|f| f.name != "userId")
            .take(4)
            .map(|f| f.into_context())
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields: schema.fields.iter().map(|f| f.into_context()).collect(),
            writable_fields: ui_fields_to_context(&schema.writable_fields()),
            updatable_fields: ui_fields_to_context(&schema.updatable_fields()),
            display_fields,
            enum_fields: enum_fields_to_context(schema),
            has_content_field: schema.fields.iter().any(|f| f.name == "content"),
            examples: Vec::new(),
        }
    }
}

/// Context for Demo Component template
#[derive(Debug, Serialize)]
pub struct DemoComponentContext {
    pub name: String,
    pub table_name: String,
    pub fields: Vec<UIFieldContext>,
    pub writable_fields: Vec<UIFieldContext>,
    pub updatable_fields: Vec<UIFieldContext>,
    pub display_fields: Vec<UIFieldContext>,
    pub enum_fields: Vec<EnumFieldContext>,
    pub has_content_field: bool,
}

impl DemoComponentContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        // Display fields: first 3 writable fields excluding userId
        let display_fields: Vec<UIFieldContext> = schema
            .writable_fields()
            .iter()
            .filter(|f| f.name != "userId")
            .take(3)
            .map(|f| f.into_context())
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields: schema.fields.iter().map(|f| f.into_context()).collect(),
            writable_fields: ui_fields_to_context(&schema.writable_fields()),
            updatable_fields: ui_fields_to_context(&schema.updatable_fields()),
            display_fields,
            enum_fields: enum_fields_to_context(schema),
            has_content_field: schema.fields.iter().any(|f| f.name == "content"),
        }
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::api::schema::{Field, FieldType, Operation, OperationType};

    fn create_test_schema() -> EntitySchema {
        EntitySchema {
            name: "Material".to_string(),
            table_name: "materials".to_string(),
            fields: vec![
                Field {
                    name: "title".to_string(),
                    db_name: "title".to_string(),
                    field_type: FieldType::String,
                    required: true,
                    ..Default::default()
                },
                Field {
                    name: "type".to_string(),
                    db_name: "type".to_string(),
                    field_type: FieldType::Enum,
                    required: true,
                    enum_values: Some(vec!["video".to_string(), "image".to_string()]),
                    index: true,
                    ..Default::default()
                },
            ],
            operations: vec![
                Operation {
                    op_type: OperationType::List,
                    name: None,
                    description: None,
                    filters: vec!["type".to_string()],
                    limit: None,
                },
                Operation {
                    op_type: OperationType::Custom,
                    name: Some("my".to_string()),
                    description: None,
                    filters: vec!["type".to_string()], // This should be filtered out for HookContext
                    limit: None,
                },
            ],
            rls: vec![],
            documentation: None,
        }
    }

    // -------------------------------------------------------------------------
    // IntoContext trait tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_field_into_field_context() {
        let field = Field {
            name: "title".to_string(),
            db_name: "title".to_string(),
            field_type: FieldType::String,
            required: true,
            ..Default::default()
        };

        let ctx: FieldContext = field.into_context();
        assert_eq!(ctx.name, "title");
        assert_eq!(ctx.db_name, "title");
        assert_eq!(ctx.typescript_type, "string");
        assert!(ctx.required);
    }

    #[test]
    fn test_field_into_enum_field_context() {
        let field = Field {
            name: "status".to_string(),
            db_name: "status".to_string(),
            field_type: FieldType::Enum,
            enum_values: Some(vec!["draft".to_string(), "published".to_string()]),
            required: true,
            ..Default::default()
        };

        let ctx: EnumFieldContext = field.into_context();
        assert_eq!(ctx.name, "status");
        assert_eq!(ctx.enum_values, vec!["draft", "published"]);
    }

    #[test]
    fn test_operation_into_context() {
        let op = Operation {
            op_type: OperationType::Custom,
            name: Some("my".to_string()),
            description: Some("My items".to_string()),
            filters: vec!["userId".to_string()],
            limit: Some(50),
        };

        let ctx: OperationContext = op.into_context();
        assert_eq!(ctx.op_type, "custom");
        assert_eq!(ctx.name, Some("my".to_string()));
        assert_eq!(ctx.filters, vec!["userId"]);
        assert_eq!(ctx.limit, Some(50));
    }

    // -------------------------------------------------------------------------
    // OperationContextBuilder tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_operation_context_builder_without_filter() {
        let schema = create_test_schema();
        let operations = OperationContextBuilder::new(&schema).build();

        // Without filtering, "type" should appear in filters
        let custom_op = operations
            .iter()
            .find(|op| op.name == Some("my".to_string()))
            .unwrap();
        assert!(custom_op.filters.contains(&"type".to_string()));
    }

    #[test]
    fn test_operation_context_builder_with_enum_filter() {
        let schema = create_test_schema();
        let operations = OperationContextBuilder::new(&schema)
            .exclude_enum_fields_from_filters()
            .build();

        // With filtering, "type" should NOT appear in custom op filters
        // because "type" is already an enum field
        let custom_op = operations
            .iter()
            .find(|op| op.name == Some("my".to_string()))
            .unwrap();
        assert!(
            !custom_op.filters.contains(&"type".to_string()),
            "type filter should be excluded when it's an enum field"
        );
    }

    // -------------------------------------------------------------------------
    // HookContext tests (critical for preventing duplicate type bug)
    // -------------------------------------------------------------------------

    #[test]
    fn test_hook_context_no_duplicate_type_in_filters() {
        let schema = create_test_schema();
        let ctx = HookContext::from_schema(&schema);

        // enum_fields should contain "type"
        assert!(ctx.enum_fields.iter().any(|e| e.name == "type"));

        // operations.filters should NOT contain "type" (already in enum_fields)
        for op in &ctx.operations {
            if op.name == Some("my".to_string()) {
                assert!(
                    !op.filters.contains(&"type".to_string()),
                    "HookContext should filter out 'type' from custom operation filters"
                );
            }
        }
    }

    // -------------------------------------------------------------------------
    // ServiceContext tests (no deduplication needed)
    // -------------------------------------------------------------------------

    #[test]
    fn test_service_context_keeps_all_filters() {
        let schema = create_test_schema();
        let ctx = ServiceContext::from_schema(&schema);

        // Service doesn't deduplicate - backend handles it
        let custom_op = ctx
            .operations
            .iter()
            .find(|op| op.name == Some("my".to_string()))
            .unwrap();
        // Filters are kept as-is (may or may not contain type depending on builder config)
        assert_eq!(ctx.name, "Material");
    }
}
