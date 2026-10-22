//! Pure, DB-free pagination normalization shared by every list endpoint
//! (ticket #167).
//!
//! Before this module the bean and grinder services clamped `limit`/`page`
//! internally while their HTTP handlers recomputed `page_size`/`has_more` from
//! the RAW, unclamped request params. A request with `limit=0`, a negative
//! limit, or a limit above 100 therefore fetched with the clamped value but
//! REPORTED the unclamped one, so a client paging on that metadata could loop
//! or stall. The session path already normalized correctly via
//! `session_query::normalize_limit`/`normalize_offset`.
//!
//! [`Pagination`] is now the single source of truth: construct it once with
//! [`Pagination::from_request`], then use the SAME normalized `limit`/`offset`
//! for the SQL query and the SAME normalized `page`/`limit`/`has_more` for the
//! response metadata. `session_query` re-exports its `normalize_limit`/
//! `normalize_offset` from here so there are not two clamping policies.
//!
//! The style mirrors `session_query`: pure, total functions with exhaustive
//! DB-free unit tests, so the interesting logic is covered by `cargo test
//! --lib` without a database.

/// Default page size when a request does not specify `limit`.
pub const DEFAULT_LIMIT: i32 = 50;
/// Hard ceiling on page size so a client cannot request an unbounded page.
pub const MAX_LIMIT: i32 = 100;

/// Normalises a `limit` into the inclusive range `[1, MAX_LIMIT]`, defaulting
/// to [`DEFAULT_LIMIT`] when unset. Pure and total.
pub fn normalize_limit(limit: Option<i32>) -> i32 {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

/// Normalises an `offset` to a non-negative value, defaulting to 0. Pure and
/// total.
pub fn normalize_offset(offset: Option<i32>) -> i32 {
    offset.unwrap_or(0).max(0)
}

/// A fully normalised pagination request: the 1-based `page`, the clamped
/// `limit` (`[1, MAX_LIMIT]`, default [`DEFAULT_LIMIT`]) and the derived,
/// non-negative `offset`.
///
/// Constructing one via [`Pagination::from_request`] is the ONLY sanctioned way
/// to turn raw request params into pagination values, so the query and the
/// response metadata can never disagree about which page size was used.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pagination {
    /// 1-based page number (>= 1).
    pub page: i32,
    /// Clamped page size in `[1, MAX_LIMIT]`.
    pub limit: i32,
    /// Zero-based row offset, `(page - 1) * limit`.
    pub offset: i32,
}

impl Pagination {
    /// Normalises raw, optional `page`/`limit` request params into a
    /// [`Pagination`]: `limit` is clamped to `[1, MAX_LIMIT]` (default
    /// [`DEFAULT_LIMIT`]), `page` is floored to `1`, and `offset` is computed
    /// as `(page - 1) * limit`. Pure and total.
    pub fn from_request(page: Option<i32>, limit: Option<i32>) -> Self {
        let limit = normalize_limit(limit);
        let requested_page = page.unwrap_or(1).max(1);
        let max_page = (i64::from(i32::MAX) / i64::from(limit) + 1)
            .min(i64::from(i32::MAX)) as i32;
        let page = requested_page.min(max_page);
        let offset = (page - 1) * limit;
        Self { page, limit, offset }
    }

    /// Whether more rows exist beyond the current page, given the TOTAL number
    /// of matching rows. Computed from the NORMALISED offset/limit so the
    /// metadata is always consistent with what was actually fetched.
    pub fn has_more(&self, total: i64) -> bool {
        (self.offset as i64 + self.limit as i64) < total
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_limit_defaults_and_clamps() {
        assert_eq!(normalize_limit(None), DEFAULT_LIMIT);
        assert_eq!(normalize_limit(Some(10)), 10);
        // Below 1 clamps up to 1.
        assert_eq!(normalize_limit(Some(0)), 1);
        assert_eq!(normalize_limit(Some(-5)), 1);
        // Above the ceiling clamps down.
        assert_eq!(normalize_limit(Some(1000)), MAX_LIMIT);
        // Boundaries are kept.
        assert_eq!(normalize_limit(Some(1)), 1);
        assert_eq!(normalize_limit(Some(MAX_LIMIT)), MAX_LIMIT);
    }

    #[test]
    fn normalize_offset_defaults_and_floors() {
        assert_eq!(normalize_offset(None), 0);
        assert_eq!(normalize_offset(Some(0)), 0);
        assert_eq!(normalize_offset(Some(25)), 25);
        // Negative offsets floor to 0.
        assert_eq!(normalize_offset(Some(-1)), 0);
    }

    #[test]
    fn from_request_defaults_when_unset() {
        let p = Pagination::from_request(None, None);
        assert_eq!(p.page, 1);
        assert_eq!(p.limit, DEFAULT_LIMIT);
        assert_eq!(p.offset, 0);
    }

    #[test]
    fn from_request_zero_limit_clamps_up_to_one() {
        let p = Pagination::from_request(Some(1), Some(0));
        assert_eq!(p.limit, 1);
        assert_eq!(p.offset, 0);
    }

    #[test]
    fn from_request_negative_limit_clamps_up_to_one() {
        let p = Pagination::from_request(Some(1), Some(-10));
        assert_eq!(p.limit, 1);
    }

    #[test]
    fn from_request_limit_above_ceiling_clamps_down() {
        let p = Pagination::from_request(Some(1), Some(1000));
        assert_eq!(p.limit, MAX_LIMIT);
    }

    #[test]
    fn from_request_boundary_limits_are_kept() {
        assert_eq!(Pagination::from_request(Some(1), Some(1)).limit, 1);
        assert_eq!(Pagination::from_request(Some(1), Some(MAX_LIMIT)).limit, MAX_LIMIT);
    }

    #[test]
    fn from_request_page_below_one_floors_to_one() {
        let p = Pagination::from_request(Some(0), Some(10));
        assert_eq!(p.page, 1);
        assert_eq!(p.offset, 0);

        let n = Pagination::from_request(Some(-3), Some(10));
        assert_eq!(n.page, 1);
        assert_eq!(n.offset, 0);
    }

    #[test]
    fn from_request_computes_offset_from_normalized_values() {
        // page 3 at 25 per page => offset 50.
        let p = Pagination::from_request(Some(3), Some(25));
        assert_eq!(p.page, 3);
        assert_eq!(p.limit, 25);
        assert_eq!(p.offset, 50);
    }

    #[test]
    fn from_request_clamps_page_before_offset_can_overflow() {
        let p = Pagination::from_request(Some(i32::MAX), Some(MAX_LIMIT));
        assert!(p.offset >= 0);
        assert_eq!(p.offset, (p.page - 1) * p.limit);
        assert!(!p.has_more(i64::from(i32::MAX)));
    }

    #[test]
    fn has_more_is_computed_from_normalized_values() {
        // With limit clamped to 1 (raw 0), page 1 covers row 0 only, so a
        // total of 5 still has more. A naive raw-param computation (page_size
        // 0) would report the wrong metadata.
        let p = Pagination::from_request(Some(1), Some(0));
        assert_eq!(p.limit, 1);
        assert!(p.has_more(5));
        assert!(!p.has_more(1));

        // Default page fully covers a small total.
        let full = Pagination::from_request(Some(1), Some(50));
        assert!(!full.has_more(50));
        assert!(!full.has_more(10));
        assert!(full.has_more(51));

        // Exactly on the page boundary: page 2 of 50 covers rows 50..99.
        let second = Pagination::from_request(Some(2), Some(50));
        assert_eq!(second.offset, 50);
        assert!(second.has_more(150));
        assert!(!second.has_more(100));
    }
}
