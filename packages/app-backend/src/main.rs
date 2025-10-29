mod db;

use axum::{
    routing::{get, post},
    Router,
    Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::{CorsLayer, Any};

// ========================================
// AIGen API Models
// ========================================

#[derive(Debug, Deserialize)]
struct TextToImageRequest {
    prompt: String,
    model: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
}

#[derive(Debug, Serialize)]
struct TextToImageResponse {
    image_url: String,
    model_used: String,
}

#[derive(Debug, Deserialize)]
struct ImageToImageRequest {
    source_image_url: String,
    prompt: String,
    model: Option<String>,
    strength: Option<f32>,
}

#[derive(Debug, Serialize)]
struct ImageToImageResponse {
    image_url: String,
    model_used: String,
}

#[derive(Debug, Deserialize)]
struct AgentExecuteRequest {
    task: String,
    model: Option<String>,
    system_prompt: Option<String>,
}

#[derive(Debug, Serialize)]
struct AgentExecuteResponse {
    result: String,
    model_used: String,
    tokens_used: Option<u32>,
}

// ========================================
// Health Check
// ========================================

async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "akatsuki-backend"
    }))
}

// ========================================
// AIGen Endpoints (Skeleton)
// ========================================

/// Text-to-Image endpoint
async fn text_to_image(
    Json(payload): Json<TextToImageRequest>,
) -> Result<Json<TextToImageResponse>, StatusCode> {
    tracing::info!("Text-to-Image request: {:?}", payload);

    // TODO: Implement actual image generation logic
    // For now, return a placeholder response

    Ok(Json(TextToImageResponse {
        image_url: "https://placeholder.example.com/generated-image.png".to_string(),
        model_used: payload.model.unwrap_or_else(|| "default-model".to_string()),
    }))
}

/// Image-to-Image endpoint
async fn image_to_image(
    Json(payload): Json<ImageToImageRequest>,
) -> Result<Json<ImageToImageResponse>, StatusCode> {
    tracing::info!("Image-to-Image request: {:?}", payload);

    // TODO: Implement actual img2img logic

    Ok(Json(ImageToImageResponse {
        image_url: "https://placeholder.example.com/transformed-image.png".to_string(),
        model_used: payload.model.unwrap_or_else(|| "default-model".to_string()),
    }))
}

/// Agent execution endpoint
async fn agent_execute(
    Json(payload): Json<AgentExecuteRequest>,
) -> Result<Json<AgentExecuteResponse>, StatusCode> {
    tracing::info!("Agent execute request: {:?}", payload);

    // TODO: Implement actual LLM agent execution with LLM_TOOLKIT

    Ok(Json(AgentExecuteResponse {
        result: format!("Task '{}' executed successfully (placeholder)", payload.task),
        model_used: payload.model.unwrap_or_else(|| "default-llm-model".to_string()),
        tokens_used: Some(150),
    }))
}

// ========================================
// Router Setup
// ========================================

fn create_router() -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/api/aigen/text-to-image", post(text_to_image))
        .route("/api/aigen/image-to-image", post(image_to_image))
        .route("/api/aigen/agent-execute", post(agent_execute))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
}

// ========================================
// Shuttle Entry Point
// ========================================

#[shuttle_runtime::main]
async fn main() -> shuttle_axum::ShuttleAxum {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let router = create_router();

    Ok(router.into())
}
