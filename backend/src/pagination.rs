//! Pure, DB-free pagination normalization (ticket #167).
//!
//! This module is the SINGLE SOURCE OF TRUTH for how list endpoints clamp and
//! interpret pagination. Before it existed, each service clamped `limit`
//! internally while its handler recomputed `page_size`/`has_more` from the RAW,
//! unclamped request values, so a request with `limit=0`, a negative limit or a
//! limit above [`MAX_LIMIT`] fetched with the clamped value but reported the
//! unclamped one. A client paging on that metadata could loop or stall.
//!
//! Everything here is pure and total, so it is unit-tested without a database
//! and reused by beans, grinders AND sessions. The session path consumes the
//! offset-based [`normalize_limit`]/[`normalize_offset`] helpers (re-exported by
//! `session_query` for its existing callers); beans and grinders consume the
//! page-based [`Page`] value object, which derives the query bounds AND the
//! response metadata from the same normalized values.

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

/// A normalized, page-based pagination window.
///
/// Built once from the raw request `page`/`limit` via [`Page::from_request`],
/// it exposes the normalized `page` (>= 1) and `page_size` (clamped limit) and
/// derives everything else from those same values: the SQL `offset` for the
/// query and the `has_more` flag for the response metadata. Because the query
/// bounds and the response metadata are both read off this one value object,
/// they can never drift (the bug #167 describes).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Page {
    /// 1-based page number (at least 1).
    page: i32,
    /// Normalized page size, clamped to `[1, MAX_LIMIT]`.
    page_size: i32,
}

impl Page {
    /// Normalizes a raw request `page`/`limit` pair: `page` floors to 1 and
    /// `limit` is clamped via [`normalize_limit`]. Pure and total.
    pub fn from_request(page: Option<i32>, limit: Option<i32>) -> Self {
        Self {
            page: page.unwrap_or(1).max(1),
            page_size: normalize_limit(limit),
        }
    }

    /// The normalized 1-based page number.
    pub fn page(self) -> i32 {
        self.page
    }

    /// The normalized page size (clamped `limit`), used for BOTH the SQL
    /// `LIMIT` and the response `page_size`.
    pub fn page_size(self) -> i32 {
        self.page_size
    }

    /// The SQL `OFFSET` for this page: `(page - 1) * page_size`.
    pub fn offset(self) -> i32 {
        (self.page - 1) * self.page_size
    }

    /// Whether more rows exist beyond this page given the TOTAL match count.
    /// Derived from the normalized offset and page size so it is consistent
    /// with what was actually fetched.
    pub fn has_more(self, total: i64) -> bool {
        (self.offset() as i64 + self.page_size as i64) < total
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
    fn page_defaults_when_unset() {
        let page = Page::from_request(None, None);
        assert_eq!(page.page(), 1);
        assert_eq!(page.page_size(), DEFAULT_LIMIT);
        assert_eq!(page.offset(), 0);
    }

    #[test]
    fn page_floors_page_to_one() {
        assert_eq!(Page::from_request(Some(0), Some(10)).page(), 1);
        assert_eq!(Page::from_request(Some(-3), Some(10)).page(), 1);
        assert_eq!(Page::from_request(Some(2), Some(10)).page(), 2);
    }

    #[test]
    fn page_clamps_limit_for_both_query_and_metadata() {
        // limit = 0 clamps to 1 for the page size reported AND the offset math.
        let zero = Page::from_request(Some(2), Some(0));
        assert_eq!(zero.page_size(), 1);
        assert_eq!(zero.offset(), 1);

        // Negative limit clamps to 1.
        let negative = Page::from_request(Some(1), Some(-10));
        assert_eq!(negative.page_size(), 1);
        assert_eq!(negative.offset(), 0);

        // Above the ceiling clamps down to MAX_LIMIT.
        let huge = Page::from_request(Some(1), Some(1000));
        assert_eq!(huge.page_size(), MAX_LIMIT);
    }

    #[test]
    fn page_offset_uses_normalized_values() {
        // page 3, size 20 -> offset 40.
        assert_eq!(Page::from_request(Some(3), Some(20)).offset(), 40);
        // page 1 is always offset 0.
        assert_eq!(Page::from_request(Some(1), Some(50)).offset(), 0);
    }

    #[test]
    fn has_more_is_derived_from_normalized_values() {
        // First page of 10 with 25 total -> more remain.
        let first = Page::from_request(Some(1), Some(10));
        assert!(first.has_more(25));
        // Last page exactly consumes the total -> no more.
        let last = Page::from_request(Some(3), Some(10));
        assert!(!last.has_more(25));
        // Partial final page -> no more.
        let third = Page::from_request(Some(3), Some(10));
        assert!(!third.has_more(30));
        assert!(!third.has_more(21));
    }

    #[test]
    fn has_more_uses_clamped_limit_not_raw() {
        // An out-of-range limit of 0 must NOT report a huge page: clamped to 1,
        // so with 5 total rows there ARE more beyond the first row.
        let clamped = Page::from_request(Some(1), Some(0));
        assert_eq!(clamped.page_size(), 1);
        assert!(clamped.has_more(5));
        // With a raw unclamped limit of 0 the old code computed
        // `total > page * 0` => `5 > 0` => true by accident; here the result is
        // consistent with actually fetching 1 row.
        assert!(clamped.has_more(2));
        assert!(!clamped.has_more(1));
    }
}
