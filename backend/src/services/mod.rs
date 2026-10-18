//! Service layer for the consolidated coffee brewing backend.
//!
//! Services encapsulate the database access and business logic used by the API
//! handlers. The bean and grinder services exist today; session and feedback
//! services are added by later tickets alongside their API handlers.

pub mod beans;
pub mod grinders;
pub mod sessions;
