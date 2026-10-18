//! Main entry point for the consolidated coffee brewing backend
//! Combines best practices from BeanIt, sump-it, and rustyCoffy

mod api;
mod models;
mod services;
mod database;
mod validation;

use std::net::SocketAddr;
use axum::{Router, routing::get};
use tower_http::cors::CorsLayer;
use tracing_subscriber;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();
    
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Initialize database connection pool
    let pool = database::init_pool().await?;
    
    // Create API router with all routes
    let app = Router::new()
        .route("/health", get(health_check))
        .nest("/api", api::router(pool.clone()))
        .layer(CorsLayer::permissive()) // TODO: Configure CORS properly
        .with_state(pool);
    
    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tracing::info!("Server listening on {}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;
    
    Ok(())
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}