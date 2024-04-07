use serde::{Serialize, Deserialize};
use regex::Regex;
use validator::Validate;
use actix_web::{web, http::StatusCode, Result, ResponseError, HttpResponse};
use actix_session::{Session, SessionGetError, SessionInsertError};
use webauthn_rs::prelude::*;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("User found but no passkeys")]
    UserFoundButNoPasskeys,
    #[error("Authentication not started")]
    AuthNotStarted,
    #[error("Invalid auth state")]
    AuthStateInvalid,
    #[error(transparent)]
    Webauthn(#[from] WebauthnError),
    #[error(transparent)]
    SessionGetError(#[from] SessionGetError),
    #[error(transparent)]
    SessionInsertError(#[from] SessionInsertError),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind", content = "credentialOptions")]
pub enum ChallengeResponse {
    Registration(CreationChallengeResponse),
    Authentication(RequestChallengeResponse),
}

#[derive(Debug, Serialize, Deserialize)]
pub enum AuthState {
    Registration(PasskeyRegistration),
    Authentication(PasskeyAuthentication),
}

#[derive(Debug, Deserialize, Validate)]
pub struct UsernameRequestPayload {
    #[validate(length(min = 1, max = 64), regex(path = "Regex::new(r\"^[\\w\\-]+$\").expect(\"hard coded\")", message = "Invalid username characters"))]
    pub username: String,
}

impl ResponseError for Error {
    fn status_code(&self) -> StatusCode {
        use WebauthnError::*;
        match self {
            Error::UserFoundButNoPasskeys => StatusCode::INTERNAL_SERVER_ERROR,
            Error::AuthNotStarted => StatusCode::BAD_REQUEST,
            Error::AuthStateInvalid => StatusCode::INTERNAL_SERVER_ERROR,
            Error::SessionGetError(err) => err.status_code(),
            Error::SessionInsertError(err) => err.status_code(),
            Error::Webauthn(err) => match err {
                Configuration => StatusCode::INTERNAL_SERVER_ERROR,
                _ => StatusCode::BAD_REQUEST,
            }
        }
    }

    fn error_response(&self) -> HttpResponse {
        match self {
            Error::SessionGetError(err) => err.error_response(),
            Error::SessionInsertError(err) => err.error_response(),
            _ => HttpResponse::build(self.status_code()).body(self.to_string())
        }
    }
}

pub async fn username(session: Session) -> Result<web::Json<Option<String>>, Error> {
    Ok(web::Json(session.get::<String>("username")?))
}

pub async fn start(session: Session, webauthn: web::Data<Webauthn>, username: web::Json<UsernameRequestPayload>) -> Result<web::Json<ChallengeResponse>, Error> {
    let username = username.into_inner().username;

    // TODO user entity from database
    let user_id: Option<Uuid> = session.get(&format!("user_id_for_username({})", username))?;

    let (res, auth_state) = if let Some(user_id) = user_id {
        // TODO passkey enitiies from database
        let passkeys: Option<Vec<Passkey>> = session.get(&format!("passkeys_for_user_id({})", user_id))?;
        let Some(passkeys) = passkeys else {
            return Err(Error::UserFoundButNoPasskeys.into());
        };
        let (rcr, auth_state) = webauthn.start_passkey_authentication(&passkeys)?;
        (ChallengeResponse::Authentication(rcr), AuthState::Authentication(auth_state))
    } else {
        let user_id = Uuid::new_v4();
        let (ccr, auth_state) = webauthn.start_passkey_registration(user_id, &username, &username, None)?;
        (ChallengeResponse::Registration(ccr), AuthState::Registration(auth_state))
    };

    session.insert("auth_state", (user_id, username, auth_state))?;
    Ok(web::Json(res))
}

pub async fn register(session: Session, req: web::Json<RegisterPublicKeyCredential>, webauthn: web::Data<Webauthn>) -> Result<HttpResponse, Error> {
    let (user_id, username, reg_state): (Uuid, String, PasskeyRegistration) = match session.remove_as("auth_state") {
        None => return Err(Error::AuthNotStarted),
        Some(Err(_)) => return Err(Error::AuthStateInvalid),
        Some(Ok(val)) => val,
    };

    let passkey = webauthn.finish_passkey_registration(&req, &reg_state)?;

    // TODO insert passkey entity into database
    session.insert(&format!("user_id_for_username({})", username), user_id)?;
    session.insert(&format!("passkeys_for_user_id({})", user_id), vec![passkey])?;
    session.insert("username", username)?;

    Ok(HttpResponse::Ok().finish())
}

pub async fn login(session: Session, req: web::Json<PublicKeyCredential>, webauthn: web::Data<Webauthn>) -> Result<HttpResponse, Error> {
    let (user_id, username, auth_state): (Uuid, String, PasskeyAuthentication) = match session.remove_as("auth_state") {
        None => return Err(Error::AuthNotStarted),
        Some(Err(_)) => return Err(Error::AuthStateInvalid),
        Some(Ok(val)) => val,
    };

    let passkey = webauthn.finish_passkey_authentication(&req, &auth_state)?;

    // TODO update passkey entity into database
    let mut passkeys: Vec<Passkey> = match session.remove_as(&format!("passkeys_for_user_id({})", user_id)) {
        None => return Err(Error::AuthStateInvalid),
        Some(Err(_)) => return Err(Error::AuthStateInvalid),
        Some(Ok(val)) => val,
    };
    for pk in passkeys.iter_mut() {
        pk.update_credential(&passkey);
    }
    session.insert(&format!("passkeys_for_user_id({})", user_id), passkeys)?;
    session.insert("username", username)?;

    Ok(HttpResponse::Ok().finish())
}

