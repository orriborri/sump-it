//! Service layer for the consolidated coffee brewing backend.
//!
//! Services encapsulate the database access and business logic used by the API
//! handlers. The bean, grinder and brewing-session services exist today.

pub mod beans;
pub mod grinders;
pub mod sessions;
