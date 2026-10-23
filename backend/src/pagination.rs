//! Shared pagination normalization (ticket #167).
//!
//! Beans, grinders and sessions all page their list endpoints, but each path
//! used to clamp the request values in its own way and - worse - the handlers
//! recomputed the response metadata (`page_size`, `has_more`) from the RAW,
//! unclamped request values. A `limit=0`, a negative limit, or a `limit` above
//! the ceiling therefore reported metadata that disagreed with the rows the
//! service actually returned.
//!
//! This module is the single source of truth: it normalizes a requested
//! `page`/`limit` (beans, grinders) or `limit`/`offset` (sessions) ONCE into a
//! [`Pagination`] value, and the SAME value drives both the SQL `LIMIT`/`OFFSET`
//! and the response `page_size`/`has_more`. Because the normalized value is the
//! only thing the query and the metadata ever see, they cannot drift apart.
//!
//! All functions are pure and total, so the interesting boundaries (0,
//! negative, above the ceiling, unset) are unit-tested here without a database.

/// Default page size when a request does not specify `limit`.
pub const DEFAULT_LIMIT: i32 = 50;

/// Hard ceiling on page size so a client cannot request an unbounded page.
pub const MAX_LIMIT: i32 = 100;

/// A normalized, self-consistent pagination window.
///
/// The fields are private so the only way to obtain a `Pagination` is through
/// [`Pagination::from_page`] or [`Pagination::from_offset`], which clamp the
/// inputs. Holding a `Pagination` is therefore proof that `limit` is in
/// `[1, MAX_LIMIT]`, `offset >= 0`, and `page >= 1`, and that `page`/`offset`
/// agree with each other. The query and the response metadata both read from
/// the SAME value, so they cannot disagree.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pagination {
    page: i32,
    limit: i32,
    offset: i32,
}

impl Pagination {
    /// Normalizes a page-based request (beans, grinders).
    ///
    /// `page` defaults to 1 and floors to 1; `limit` defaults to
    /// [`DEFAULT_LIMIT`] and clamps into `[1, MAX_LIMIT]`. The `offset` is
    /// derived from the normalized page and limit so it can never disagree with
    /// them.
    pub fn from_page(page: Option<i32>, limit: Option<i32>) -> Self {
        let page = page.unwrap_or(1).max(1);
        let limit = normalize_limit(limit);
        let offset = (page - 1) * limit;
        Self { page, limit, offset }
    }

    /// Normalizes an offset-based request (sessions).
    ///
    /// `limit` defaults to [`DEFAULT_LIMIT`] and clamps into `[1, MAX_LIMIT]`;
    /// `offset` defaults to 0 and floors to 0. The equivalent 1-based `page` is
    /// derived from the normalized offset and limit so page-style metadata
    /// stays consistent for offset-based callers too.
    pub fn from_offset(limit: Option<i32>, offset: Option<i32>) -> Self {
        let limit = normalize_limit(limit);
        let offset = normalize_offset(offset);
        // Which 1-based page this offset lands on. Integer division floors, so
        // an offset that is not a whole number of pages still reports the page
        // it begins within.
        let page = offset / limit + 1;
        Self { page, limit, offset }
    }

    /// The 1-based page number.
    pub fn page(&self) -> i32 {
        self.page
    }

    /// The normalized page size, clamped into `[1, MAX_LIMIT]`. This is the
    /// value the response must report as `page_size`.
    pub fn limit(&self) -> i32 {
        self.limit
    }

    /// Alias for [`Pagination::limit`] used where the response field is named
    /// `page_size`; both read the one normalized value.
    pub fn page_size(&self) -> i32 {
        self.limit
    }

    /// The normalized, non-negative row offset for the SQL `OFFSET`.
    pub fn offset(&self) -> i32 {
        self.offset
    }

    /// Whether more rows exist beyond this page, given the TOTAL match count.
    ///
    /// Derived from the normalized `offset`/`limit`: there is more when the
    /// rows already skipped plus this page's worth do not yet cover the total.
    /// Because it reads the normalized window, it agrees with the rows the
    /// query returns even for `limit=0`/negative/over-ceiling requests.
    pub fn has_more(&self, total: i64) -> bool {
        (self.offset as i64) + (self.limit as i64) < total
    }
}

/// Normalizes a requested `limit` into `[1, MAX_LIMIT]`, defaulting to
/// [`DEFAULT_LIMIT`] when unset. Pure and total.
pub fn normalize_limit(limit: Option<i32>) -> i32 {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

/// Normalizes a requested `offset` to a non-negative value, defaulting to 0.
/// Pure and total.
pub fn normalize_offset(offset: Option<i32>) -> i32 {
    offset.unwrap_or(0).max(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_limit_defaults_and_clamps() {
        assert_eq!(normalize_limit(None), DEFAULT_LIMIT);
        assert_eq!(normalize_limit(Some(10)), 10);
        // Below 1 clamps up to 1 (covers limit=0 and negative).
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
    fn from_page_defaults_when_unset() {
        let p = Pagination::from_page(None, None);
        assert_eq!(p.page(), 1);
        assert_eq!(p.limit(), DEFAULT_LIMIT);
        assert_eq!(p.page_size(), DEFAULT_LIMIT);
        assert_eq!(p.offset(), 0);
    }

    #[test]
    fn from_page_floors_page_and_clamps_limit() {
        // Page below 1 floors to 1; the derived offset is 0.
        let zero_page = Pagination::from_page(Some(0), Some(20));
        assert_eq!(zero_page.page(), 1);
        assert_eq!(zero_page.offset(), 0);

        let neg_page = Pagination::from_page(Some(-3), Some(20));
        assert_eq!(neg_page.page(), 1);
        assert_eq!(neg_page.offset(), 0);

        // limit=0 and negative clamp up to 1, so page_size reports 1 (not 0).
        assert_eq!(Pagination::from_page(Some(1), Some(0)).page_size(), 1);
        assert_eq!(Pagination::from_page(Some(1), Some(-5)).page_size(), 1);

        // limit over the ceiling clamps down.
        assert_eq!(Pagination::from_page(Some(1), Some(500)).page_size(), MAX_LIMIT);
    }

    #[test]
    fn from_page_derives_offset_from_normalized_values() {
        // Page 3 at limit 20 skips the first two pages.
        let p = Pagination::from_page(Some(3), Some(20));
        assert_eq!(p.page(), 3);
        assert_eq!(p.limit(), 20);
        assert_eq!(p.offset(), 40);
    }

    #[test]
    fn from_offset_defaults_when_unset() {
        let p = Pagination::from_offset(None, None);
        assert_eq!(p.limit(), DEFAULT_LIMIT);
        assert_eq!(p.offset(), 0);
        assert_eq!(p.page(), 1);
    }

    #[test]
    fn from_offset_floors_offset_and_clamps_limit() {
        // Negative offset floors to 0.
        let neg = Pagination::from_offset(Some(20), Some(-5));
        assert_eq!(neg.offset(), 0);
        assert_eq!(neg.page(), 1);

        // limit=0/negative clamp to 1; over-ceiling clamps down.
        assert_eq!(Pagination::from_offset(Some(0), Some(0)).page_size(), 1);
        assert_eq!(Pagination::from_offset(Some(-1), Some(0)).page_size(), 1);
        assert_eq!(Pagination::from_offset(Some(999), Some(0)).page_size(), MAX_LIMIT);
    }

    #[test]
    fn from_offset_derives_page_from_normalized_values() {
        // Offset 40 at limit 20 is the start of page 3.
        let whole = Pagination::from_offset(Some(20), Some(40));
        assert_eq!(whole.page(), 3);
        // A partial offset reports the page it begins within.
        let partial = Pagination::from_offset(Some(20), Some(45));
        assert_eq!(partial.page(), 3);
    }

    #[test]
    fn has_more_is_derived_from_normalized_window() {
        // First page of 20 with 50 total: more remain.
        let first = Pagination::from_page(Some(1), Some(20));
        assert!(first.has_more(50));
        // Last page exactly covers the total: no more.
        let last = Pagination::from_page(Some(3), Some(20));
        assert!(!last.has_more(60));
        assert!(!last.has_more(50));
        // Beyond the end: no more.
        assert!(!first.has_more(20));
        assert!(!first.has_more(0));
    }

    #[test]
    fn has_more_uses_clamped_limit_not_raw_request() {
        // A limit=0 request clamps to 1, so with 5 rows there IS more after the
        // first (single-row) page. Computing from the RAW 0 would have wrongly
        // reported no-more (offset 0 + 0 >= 5 is false -> actually true... ) and
        // disagreed with the single row the clamped query returns.
        let p = Pagination::from_page(Some(1), Some(0));
        assert_eq!(p.page_size(), 1);
        assert!(p.has_more(5));
        // And an over-ceiling limit clamps to 100, so 50 rows all fit: no more.
        let big = Pagination::from_page(Some(1), Some(10_000));
        assert_eq!(big.page_size(), MAX_LIMIT);
        assert!(!big.has_more(50));
    }
}
