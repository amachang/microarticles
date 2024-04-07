use url::Url;
use anyhow::Result;
use actix_web::{web, guard, cookie, App, HttpServer, middleware::Logger};
use actix_files::Files;
use actix_session::SessionMiddleware;
use webauthn_rs::prelude::*;

mod auth;
mod session;

use session::MemorySession;

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();

    let hostname = "localhost";
    let port = 3000;

    let key = cookie::Key::generate();
    HttpServer::new(move || {
        let rp_id = hostname;
        let rp_origin = Url::parse(&format!("http://{}:{}", hostname, port)).expect("hard coded");
        let webauthn = WebauthnBuilder::new(&rp_id, &rp_origin).expect("hard coded").build().expect("hard coded");

        App::new()
            .wrap(
                SessionMiddleware::builder(MemorySession, key.clone())
                    .cookie_name("s".to_string())
                    .cookie_http_only(true)
                    .cookie_secure(false)
                    .build()
             )
            .wrap(Logger::default())
            .service(
                web::scope("/api")
                    .guard(guard::Post())
                    .guard(guard::Header("Content-Type", "application/json"))
                    .app_data(web::Data::new(webauthn))
                    .service(
                        web::scope("/auth")
                            .service(web::resource("/username").to(auth::username))
                            .service(web::resource("/start").to(auth::start))
                            .service(web::resource("/register").to(auth::register))
                            .service(web::resource("/login").to(auth::login))
                    )
            )
            .service(Files::new("/assets", "./frontend/dist/assets").prefer_utf8(true))
            .service(Files::new("/{tail:.*}", "./frontend/dist").index_file("index.html").prefer_utf8(true))
    }).bind((hostname, port))?.run().await?;
    Ok(())
}

