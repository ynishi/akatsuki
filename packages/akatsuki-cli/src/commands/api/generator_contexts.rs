/**
 * Context types for template rendering
 * Separated to keep generator.rs clean
 */

use serde::Serialize;

/// Context for Repository (Edge) template
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

#[derive(Debug, Serialize)]
pub struct FieldContext {
    pub name: String,
    pub db_name: String,
    pub typescript_type: String,
    pub typescript_default: String,
    pub required: bool,
}

#[derive(Debug, Serialize)]
pub struct CustomOpContext {
    pub name: String,
    pub description: Option<String>,
    pub filters: Vec<String>,
    pub limit: Option<usize>,
}

impl RepositoryEdgeContext {
    pub fn from_schema(schema: &super::schema::EntitySchema) -> Self {
        use super::schema::OperationType;

        let fields: Vec<FieldContext> = schema
            .fields
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        let writable_fields: Vec<FieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        let updatable_fields: Vec<FieldContext> = schema
            .updatable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        // Extract filters from list operation
        let list_filters: Vec<String> = schema
            .operations
            .iter()
            .find(|op| matches!(op.op_type, OperationType::List))
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
            .filter(|op| matches!(op.op_type, OperationType::Custom))
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

#[derive(Debug, Serialize)]
pub struct EnumFieldContext {
    pub name: String,
    pub db_name: String,
    pub enum_values: Vec<String>,
}

impl ModelContext {
    pub fn from_schema(schema: &super::schema::EntitySchema) -> Self {
        let fields: Vec<FieldContext> = schema
            .fields
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        let writable_fields: Vec<FieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        let updatable_fields: Vec<FieldContext> = schema
            .updatable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        let enum_fields: Vec<EnumFieldContext> = schema
            .enum_fields()
            .iter()
            .map(|f| EnumFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields,
            writable_fields,
            updatable_fields,
            enum_fields,
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
    pub fn from_schema(schema: &super::schema::EntitySchema) -> Self {
        let writable_fields: Vec<FieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        let updatable_fields: Vec<FieldContext> = schema
            .updatable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
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

        let enum_fields: Vec<EnumFieldContext> = schema
            .enum_fields()
            .iter()
            .map(|f| EnumFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            operations,
            writable_fields,
            updatable_fields,
            enum_fields,
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
    pub fn from_schema(schema: &super::schema::EntitySchema) -> Self {
        let writable_fields: Vec<FieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        let updatable_fields: Vec<FieldContext> = schema
            .updatable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
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

        let enum_fields: Vec<EnumFieldContext> = schema
            .enum_fields()
            .iter()
            .map(|f| EnumFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            operations,
            writable_fields,
            updatable_fields,
            enum_fields,
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
    pub fn from_schema(schema: &super::schema::EntitySchema) -> Self {
        let writable_fields: Vec<FieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
            })
            .collect();

        let updatable_fields: Vec<FieldContext> = schema
            .updatable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
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

        // Collect operation names to avoid generating duplicate enum helper methods
        let operation_names: Vec<String> = schema
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
                let has_conflict = enum_values.iter().skip(1).any(|v| operation_names.contains(v));
                if has_conflict {
                    None // Skip this enum field to avoid duplicate method generation
                } else {
                    Some(EnumFieldContext {
                        name: f.name.clone(),
                        db_name: f.db_name.clone(),
                        enum_values,
                    })
                }
            })
            .collect();

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            operations,
            writable_fields,
            updatable_fields,
            enum_fields,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct OperationContext {
    pub op_type: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub filters: Vec<String>,
    pub limit: Option<usize>,
}

impl EdgeFunctionContext {
    pub fn from_schema(schema: &super::schema::EntitySchema) -> Self {
        let writable_fields: Vec<FieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| FieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                required: f.required,
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
            operations,
            writable_fields,
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
#[derive(Debug, Serialize)]
pub struct UIFieldContext {
    pub name: String,
    pub db_name: String,
    pub typescript_type: String,
    pub typescript_default: String,
    pub field_type: String,
    pub required: bool,
    pub enum_values: Vec<String>,
}

impl AdminPageContext {
    pub fn from_schema(schema: &super::schema::EntitySchema) -> Self {
        let fields: Vec<UIFieldContext> = schema
            .fields
            .iter()
            .map(|f| UIFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                field_type: format!("{:?}", f.field_type).to_lowercase(),
                required: f.required,
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        let writable_fields: Vec<UIFieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| UIFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                field_type: format!("{:?}", f.field_type).to_lowercase(),
                required: f.required,
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        let updatable_fields: Vec<UIFieldContext> = schema
            .updatable_fields()
            .iter()
            .map(|f| UIFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                field_type: format!("{:?}", f.field_type).to_lowercase(),
                required: f.required,
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        // Display fields: writable fields excluding userId, limited to first 4
        let display_fields: Vec<UIFieldContext> = schema
            .writable_fields()
            .iter()
            .filter(|f| f.name != "userId")
            .take(4)
            .map(|f| UIFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                field_type: format!("{:?}", f.field_type).to_lowercase(),
                required: f.required,
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        let enum_fields: Vec<EnumFieldContext> = schema
            .enum_fields()
            .iter()
            .map(|f| EnumFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        let has_content_field = schema.fields.iter().any(|f| f.name == "content");

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields,
            writable_fields,
            updatable_fields,
            display_fields,
            enum_fields,
            has_content_field,
            examples: Vec::new(), // Could be populated from schema.documentation.examples
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
    pub fn from_schema(schema: &super::schema::EntitySchema) -> Self {
        let fields: Vec<UIFieldContext> = schema
            .fields
            .iter()
            .map(|f| UIFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                field_type: format!("{:?}", f.field_type).to_lowercase(),
                required: f.required,
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        let writable_fields: Vec<UIFieldContext> = schema
            .writable_fields()
            .iter()
            .map(|f| UIFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                field_type: format!("{:?}", f.field_type).to_lowercase(),
                required: f.required,
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        let updatable_fields: Vec<UIFieldContext> = schema
            .updatable_fields()
            .iter()
            .map(|f| UIFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                field_type: format!("{:?}", f.field_type).to_lowercase(),
                required: f.required,
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        // Display fields: first 3 writable fields excluding userId
        let display_fields: Vec<UIFieldContext> = schema
            .writable_fields()
            .iter()
            .filter(|f| f.name != "userId")
            .take(3)
            .map(|f| UIFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                typescript_type: f.typescript_type(),
                typescript_default: f.typescript_default(),
                field_type: format!("{:?}", f.field_type).to_lowercase(),
                required: f.required,
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        let enum_fields: Vec<EnumFieldContext> = schema
            .enum_fields()
            .iter()
            .map(|f| EnumFieldContext {
                name: f.name.clone(),
                db_name: f.db_name.clone(),
                enum_values: f.enum_values.clone().unwrap_or_default(),
            })
            .collect();

        let has_content_field = schema.fields.iter().any(|f| f.name == "content");

        Self {
            name: schema.name.clone(),
            table_name: schema.table_name.clone(),
            fields,
            writable_fields,
            updatable_fields,
            display_fields,
            enum_fields,
            has_content_field,
        }
    }
}
