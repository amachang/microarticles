use anyhow::Result;
use serde_json::Value;
use actix_web::{web, guard, App, HttpServer};
use actix_files::Files;

#[tokio::main]
async fn main() -> Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(
                web::scope("/api").guard(guard::Post()).guard(guard::Header("Content-Type", "application/json"))
                    .service(
                        web::scope("/auth")
                            .service(web::resource("/username").to(|| async { web::Json(Value::Null) }))
                    )
            )
            .service(Files::new("/assets", "./frontend/dist/assets").prefer_utf8(true))
            .service(Files::new("/{tail:.*}", "./frontend/dist").index_file("index.html").prefer_utf8(true))
    }).bind(("localhost", 3000))?.run().await?;
    Ok(())
}

