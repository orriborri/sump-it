//! Service layer for the consolidated coffee brewing backend.
//!
//! Services encapsulate the database access and business logic used by the API
//! handlers. Only the bean service exists today; grinder, session, and feedback
//! services are added by later tickets alongside their API handlers.

pub mod beans;
