use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

/// Initialize Supabase (PostgreSQL) connection pool
pub async fn init_db_pool() -> Result<PgPool, sqlx::Error> {
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in environment variables");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&database_url)
        .await?;

    tracing::info!("Database connection pool established");

    Ok(pool)
}
