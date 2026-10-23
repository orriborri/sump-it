//! Shared pagination normalization (ticket #167).
//!
//! Before this module, the bean and grinder SERVICES clamped `page`/`limit`
//! internally (`page.max(1)`, `limit.clamp(1, 100)`), but their HTTP HANDLERS
//! recomputed the response metadata (`page_size`, `has_more`) from the RAW,
//! unclamped request values. A request with `limit=0`, a negative limit, or a
//! limit above 100 therefore fetched with the clamped value but reported the
//! unclamped value, so a client paging on that metadata could loop or stall.
//!
//! This module is the single source of truth for turning an optional
//! `page`/`limit` pair into the normalized values used by BOTH the DB query
//! (`limit`/`offset`) and the response metadata (`page`/`page_size`/`has_more`).
//! It reuses the exact clamping semantics already established for sessions in
//! [`crate::session_query`] (`normalize_limit` clamps to `[1, MAX_LIMIT]` with
//! a default of `DEFAULT_LIMIT`; a page/offset is never negative), so every
//! list endpoint normalizes the same way in one place.

use crate::session_query::normalize_limit;

/// A normalized page request: the clamped `page` (1-based) and `page_size`
/// (within `[1, MAX_LIMIT]`), plus the derived `limit`/`offset` for the query.
///
/// Construct it with [`Pagination::from_request`]; the fields are then the
/// single source of truth shared by the SQL (`limit`, `offset`) and the
/// response metadata (`page`, `page_size`, [`Pagination::has_more`]).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pagination {
    /// 1-based page number, always `>= 1`.
    pub page: i32,
    /// Page size, always within `[1, MAX_LIMIT]`.
    pub page_size: i32,
    /// `(page - 1) * page_size`, always `>= 0`.
    pub offset: i32,
}

impl Pagination {
    /// Normalizes an optional `page`/`limit` pair into a [`Pagination`].
    ///
    /// `limit` is clamped to `[1, MAX_LIMIT]` (default
    /// [`DEFAULT_LIMIT`](crate::session_query::DEFAULT_LIMIT)) via the shared
    /// [`normalize_limit`]; `page` is floored to `1` so the offset is
    /// never negative. The resulting `offset` is `(page - 1) * page_size`.
    pub fn from_request(page: Option<i32>, limit: Option<i32>) -> Self {
        let page = page.unwrap_or(1).max(1);
        let page_size = normalize_limit(limit);
        let offset = (page - 1) * page_size;
        Self {
            page,
            page_size,
            offset,
        }
    }

    /// The `LIMIT` to bind to the query: identical to `page_size`.
    pub fn limit(&self) -> i32 {
        self.page_size
    }

    /// Whether more rows exist beyond the current page, computed from the
    /// NORMALIZED `offset`/`page_size` (never the raw request) and the total
    /// match count. `true` exactly when `offset + page_size < total`.
    pub fn has_more(&self, total: i64) -> bool {
        (self.offset as i64 + self.page_size as i64) < total
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session_query::{DEFAULT_LIMIT, MAX_LIMIT};

    #[test]
    fn defaults_when_unset() {
        let p = Pagination::from_request(None, None);
        assert_eq!(p.page, 1);
        assert_eq!(p.page_size, DEFAULT_LIMIT);
        assert_eq!(p.offset, 0);
        assert_eq!(p.limit(), DEFAULT_LIMIT);
    }

    #[test]
    fn limit_zero_clamps_up_to_one() {
        // A zero limit previously leaked into page_size/has_more; it must now
        // clamp to the floor of 1 everywhere.
        let p = Pagination::from_request(Some(1), Some(0));
        assert_eq!(p.page_size, 1);
        assert_eq!(p.limit(), 1);
        assert_eq!(p.offset, 0);
    }

    #[test]
    fn negative_limit_clamps_up_to_one() {
        let p = Pagination::from_request(Some(1), Some(-5));
        assert_eq!(p.page_size, 1);
        assert_eq!(p.offset, 0);
    }

    #[test]
    fn limit_above_ceiling_clamps_down() {
        let p = Pagination::from_request(Some(1), Some(1000));
        assert_eq!(p.page_size, MAX_LIMIT);
        assert_eq!(p.limit(), MAX_LIMIT);
    }

    #[test]
    fn boundaries_are_kept() {
        assert_eq!(Pagination::from_request(Some(1), Some(1)).page_size, 1);
        assert_eq!(
            Pagination::from_request(Some(1), Some(MAX_LIMIT)).page_size,
            MAX_LIMIT
        );
    }

    #[test]
    fn page_floored_to_one_and_offset_non_negative() {
        let zero = Pagination::from_request(Some(0), Some(10));
        assert_eq!(zero.page, 1);
        assert_eq!(zero.offset, 0);

        let negative = Pagination::from_request(Some(-3), Some(10));
        assert_eq!(negative.page, 1);
        assert_eq!(negative.offset, 0);
    }

    #[test]
    fn offset_is_page_times_size() {
        let p = Pagination::from_request(Some(3), Some(20));
        assert_eq!(p.page, 3);
        assert_eq!(p.page_size, 20);
        assert_eq!(p.offset, 40);
    }

    #[test]
    fn has_more_uses_normalized_values() {
        // page 1, size 50: 50 < 120 -> more pages exist.
        let p = Pagination::from_request(Some(1), Some(50));
        assert!(p.has_more(120));
        assert!(!p.has_more(50));
        assert!(!p.has_more(10));

        // Second page of 50: offset 50, 100 < 120 -> still more.
        let p2 = Pagination::from_request(Some(2), Some(50));
        assert!(p2.has_more(120));
        assert!(!p2.has_more(100));
    }

    #[test]
    fn has_more_consistent_for_out_of_range_limit() {
        // With limit=0 clamped to 1, a two-row total still has a next page from
        // page 1 (offset 0 + size 1 = 1 < 2), which the old raw computation
        // (0 + 0 < 2) would have mis-reported.
        let p = Pagination::from_request(Some(1), Some(0));
        assert!(p.has_more(2));
        assert!(!p.has_more(1));

        // With limit>100 clamped to MAX_LIMIT, has_more reflects the ceiling.
        let big = Pagination::from_request(Some(1), Some(10_000));
        assert!(big.has_more(MAX_LIMIT as i64 + 1));
        assert!(!big.has_more(MAX_LIMIT as i64));
    }
}
