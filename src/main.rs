use anyhow::Result;
use actix_web::{App, HttpServer};
use actix_files::Files;

#[tokio::main]
async fn main() -> Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(Files::new("/{tail:.*}", "./frontend/dist").index_file("index.html").prefer_utf8(true))
    }).bind(("localhost", 3000))?.run().await?;
    Ok(())
}

