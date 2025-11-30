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
