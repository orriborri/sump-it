//! Service layer for the consolidated coffee brewing backend.
//!
//! Services encapsulate the database access and business logic used by the API
//! handlers. The bean, grinder and brewing-session services exist today.
//!
//! The services are the authoritative owners of their write invariants: the
//! bean and grinder create/update methods validate their request at the top of
//! the method, BEFORE any database access, so no caller (HTTP handler, CLI,
//! background job, test) can persist invalid data by bypassing the handler.

pub mod beans;
pub mod grinders;
pub mod sessions;

use validator::Validate;

use crate::validation::{validation_errors_to_string, ValidationErrorType};

/// Why a bean or grinder create/update failed. Mirrors
/// `services::sessions::SaveError`: the API layer maps each variant to an HTTP
/// status and an `ErrorResponse` body.
#[derive(Debug)]
pub enum WriteError {
    /// A derive-based field constraint (e.g. string length) failed. Carries the
    /// flattened `field: message` list from
    /// [`validation_errors_to_string`].
    InvalidFields(String),
    /// A domain business rule (e.g. future roast date, `max_setting <=
    /// min_setting`) was violated.
    Rule(ValidationErrorType),
    /// Any underlying database failure.
    Database(anyhow::Error),
}

/// Validates a write request in the fixed order the API has always used:
/// first the derive-based field constraints, then the domain rule. Both rule
/// sources stay where they are defined (the `#[validate]` attributes and the
/// `crate::validation` / model functions); this only sequences them.
fn validate_write<T: Validate>(
    request: &T,
    rule: impl FnOnce(&T) -> Result<(), ValidationErrorType>,
) -> Result<(), WriteError> {
    request
        .validate()
        .map_err(|errors| WriteError::InvalidFields(validation_errors_to_string(&errors)))?;
    rule(request).map_err(WriteError::Rule)
}
