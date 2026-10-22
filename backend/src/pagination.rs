//! Pure, DB-free pagination normalization (ticket #167).
//!
//! This module is the SINGLE source of truth for how page / limit / offset are
//! normalized across every list endpoint. Before this module existed, the
//! clamp rules were spelled out in several places: `session_query.rs` held the
//! canonical `normalize_limit`/`normalize_offset` (defaulting to
//! [`DEFAULT_LIMIT`], clamping to `[1, MAX_LIMIT]`, flooring the offset at 0),
//! while the beans and grinders services clamped inline with `.max(1)` /
//! `.clamp(1, 100)` and their HTTP handlers then recomputed `page_size` and
//! `has_more` from the RAW, UNCLAMPED request values. A request with
//! `limit = 0`, a negative limit, or `limit > 100` therefore reported wrong
//! metadata (e.g. `page_size = 0`, or a `has_more` that disagreed with the
//! clamped fetch).
//!
//! Everything here is a pure function or value object over plain integers, so
//! it is unit-tested exhaustively WITHOUT a database and the response metadata
//! is guaranteed to be derived from the same normalized values the query uses.

/// Default page size when a request does not specify `limit`.
pub const DEFAULT_LIMIT: i32 = 50;
/// Hard ceiling on page size so a client cannot request an unbounded page.
pub const MAX_LIMIT: i32 = 100;

/// Normalizes a `limit` into the inclusive range `[1, MAX_LIMIT]`, defaulting
/// to [`DEFAULT_LIMIT`] when unset. Pure and total.
///
/// `limit = 0`, a negative limit, or `None` never produce a zero or negative
/// page size: the result is always at least 1 and at most [`MAX_LIMIT`].
pub fn normalize_limit(limit: Option<i32>) -> i32 {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

/// Normalizes an `offset` to a non-negative value, defaulting to 0. Pure and
/// total.
pub fn normalize_offset(offset: Option<i32>) -> i32 {
    offset.unwrap_or(0).max(0)
}

/// Whether more items exist beyond the current page, given the NORMALIZED
/// `offset` and `limit` and the TOTAL match count. Pure and total.
///
/// The current page covers items `[offset, offset + limit)`; there is more to
/// fetch when `total` exceeds the index of the first item on the next page.
pub fn has_more(offset: i32, limit: i32, total: i64) -> bool {
    (offset as i64) + (limit as i64) < total
}

/// A fully normalized pagination request expressed as a 1-based `page` plus a
/// clamped `limit`, with the matching zero-based `offset` derived once.
///
/// This is the value object the beans and grinders list endpoints build: the
/// service pages the query with [`Pagination::limit`] / [`Pagination::offset`]
/// and the handler reports [`Pagination::page`] / [`Pagination::page_size`] and
/// [`Pagination::has_more`], all from the SAME normalized numbers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pagination {
    /// 1-based page number (always `>= 1`).
    page: i32,
    /// Clamped page size in `[1, MAX_LIMIT]`.
    limit: i32,
}

impl Pagination {
    /// Builds a normalized pagination from raw, optional request values.
    ///
    /// `page` is floored at 1 (so `None`, `0` and negatives all become page 1)
    /// and `limit` is normalized by [`normalize_limit`]. The resulting state is
    /// always valid, so every accessor returns consistent metadata.
    pub fn from_request(page: Option<i32>, limit: Option<i32>) -> Self {
        Self {
            page: page.unwrap_or(1).max(1),
            limit: normalize_limit(limit),
        }
    }

    /// The 1-based page number (always `>= 1`).
    pub fn page(&self) -> i32 {
        self.page
    }

    /// The clamped page size (a.k.a. `page_size`), in `[1, MAX_LIMIT]`.
    pub fn limit(&self) -> i32 {
        self.limit
    }

    /// The zero-based offset for the query, derived from `page` and `limit`.
    pub fn offset(&self) -> i32 {
        (self.page - 1) * self.limit
    }

    /// Whether more items exist beyond this page given the TOTAL match count.
    pub fn has_more(&self, total: i64) -> bool {
        has_more(self.offset(), self.limit(), total)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_limit_defaults_when_none() {
        assert_eq!(normalize_limit(None), DEFAULT_LIMIT);
    }

    #[test]
    fn normalize_limit_clamps_zero_and_negative_up_to_one() {
        assert_eq!(normalize_limit(Some(0)), 1);
        assert_eq!(normalize_limit(Some(-5)), 1);
    }

    #[test]
    fn normalize_limit_clamps_above_ceiling_down() {
        assert_eq!(normalize_limit(Some(101)), MAX_LIMIT);
        assert_eq!(normalize_limit(Some(1000)), MAX_LIMIT);
    }

    #[test]
    fn normalize_limit_keeps_in_range_values_and_boundaries() {
        assert_eq!(normalize_limit(Some(1)), 1);
        assert_eq!(normalize_limit(Some(25)), 25);
        assert_eq!(normalize_limit(Some(MAX_LIMIT)), MAX_LIMIT);
    }

    #[test]
    fn normalize_offset_defaults_and_floors() {
        assert_eq!(normalize_offset(None), 0);
        assert_eq!(normalize_offset(Some(0)), 0);
        assert_eq!(normalize_offset(Some(40)), 40);
        assert_eq!(normalize_offset(Some(-1)), 0);
    }

    #[test]
    fn has_more_free_function_at_and_beyond_last_page() {
        // First page of 50 with 120 total: more remains.
        assert!(has_more(0, 50, 120));
        // Second page (offset 50): still more (100 < 120).
        assert!(has_more(50, 50, 120));
        // Last page (offset 100): 150 == 120 is false, nothing beyond.
        assert!(!has_more(100, 50, 120));
        // Exactly at the boundary: offset+limit == total -> no more.
        assert!(!has_more(50, 50, 100));
        // Beyond the end entirely.
        assert!(!has_more(200, 50, 120));
        // Empty result set.
        assert!(!has_more(0, 50, 0));
    }

    #[test]
    fn pagination_defaults_when_none() {
        let p = Pagination::from_request(None, None);
        assert_eq!(p.page(), 1);
        assert_eq!(p.limit(), DEFAULT_LIMIT);
        assert_eq!(p.offset(), 0);
    }

    #[test]
    fn pagination_floors_page_below_one() {
        assert_eq!(Pagination::from_request(Some(0), Some(10)).page(), 1);
        assert_eq!(Pagination::from_request(Some(-3), Some(10)).page(), 1);
        // Offset of a floored page is 0.
        assert_eq!(Pagination::from_request(Some(-3), Some(10)).offset(), 0);
    }

    #[test]
    fn pagination_clamps_limit_zero_negative_and_over_max() {
        assert_eq!(Pagination::from_request(Some(1), Some(0)).limit(), 1);
        assert_eq!(Pagination::from_request(Some(1), Some(-10)).limit(), 1);
        assert_eq!(Pagination::from_request(Some(1), Some(500)).limit(), MAX_LIMIT);
    }

    #[test]
    fn pagination_offset_is_derived_from_page_and_limit() {
        let p = Pagination::from_request(Some(3), Some(20));
        assert_eq!(p.offset(), 40);
        assert_eq!(p.page(), 3);
        assert_eq!(p.limit(), 20);
    }

    #[test]
    fn pagination_has_more_uses_clamped_values_not_raw() {
        // limit=0 clamps to 1; page 1 => offset 0. With total 5 there is more
        // (0 + 1 < 5), which is consistent with a clamped fetch of 1 item.
        let clamped = Pagination::from_request(Some(1), Some(0));
        assert_eq!(clamped.limit(), 1);
        assert!(clamped.has_more(5));
    }

    #[test]
    fn pagination_has_more_at_and_beyond_last_page() {
        // page 1, limit 50, total 120 -> more.
        assert!(Pagination::from_request(Some(1), Some(50)).has_more(120));
        // page 3, limit 50 -> offset 100, 150 < 120 is false.
        assert!(!Pagination::from_request(Some(3), Some(50)).has_more(120));
        // Exactly the last full page: offset 50 + 50 == 100 == total.
        assert!(!Pagination::from_request(Some(2), Some(50)).has_more(100));
    }
}
