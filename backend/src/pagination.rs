//! Shared pagination normalization and response metadata.
//!
//! This module is the SINGLE source of truth for how the list endpoints clamp
//! pagination inputs and derive the response metadata (`page`, `page_size`,
//! `has_more`). It was previously duplicated: the session path clamped cleanly
//! in `session_query` while the bean/grinder HANDLERS recomputed metadata from
//! the raw, unclamped request values. That divergence let a request with
//! `limit=0`, a negative limit, or a limit above [`MAX_LIMIT`] fetch with the
//! clamped value but REPORT the unclamped value in `page_size`/`has_more`, so a
//! client paging on that metadata could loop or stall.
//!
//! Everything here is pure and total: given the same `Option<i32>` inputs it
//! always produces the same normalized values, so it is exhaustively covered by
//! the `#[cfg(test)]` unit tests below (no database required), matching the
//! style of `crate::session_query`.
//!
//! SAFETY: the normalized `limit`/`offset` are the ONLY values that should be
//! used for BOTH the SQL `LIMIT`/`OFFSET` binds and the response metadata, so
//! what a client is told always matches what was actually fetched.

/// Default page size when a request does not specify `limit`.
pub const DEFAULT_LIMIT: i32 = 50;
/// Hard ceiling on page size so a client cannot request an unbounded page.
pub const MAX_LIMIT: i32 = 100;

/// Normalises a request's `limit` into the inclusive range `[1, MAX_LIMIT]`,
/// defaulting to [`DEFAULT_LIMIT`] when unset. Pure and total.
pub fn normalize_limit(limit: Option<i32>) -> i32 {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

/// Normalises a request's `offset` to a non-negative value, defaulting to 0.
/// Pure and total.
pub fn normalize_offset(offset: Option<i32>) -> i32 {
    offset.unwrap_or(0).max(0)
}

/// A normalized pagination window shared by every list endpoint.
///
/// Construct it ONCE from the raw request values via [`Pagination::from_page`]
/// (beans/grinders accept `page` + `limit`) or [`Pagination::from_offset`]
/// (sessions accept `limit` + `offset`, with an optional `page`). All three
/// fields are already clamped, so [`page`](Self::page),
/// [`page_size`](Self::page_size) and [`has_more`](Self::has_more) can be read
/// straight off it for the response, and `limit`/`offset` can be used for the
/// query, with no risk of the two diverging.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pagination {
    /// 1-based page number (always `>= 1`).
    page: i32,
    /// Page size, clamped to `[1, MAX_LIMIT]`.
    limit: i32,
    /// Row offset, floored to `>= 0`.
    offset: i32,
}

impl Pagination {
    /// Builds a window from page-based inputs (beans/grinders): `limit` is
    /// clamped to `[1, MAX_LIMIT]` (default [`DEFAULT_LIMIT`]), `page` is
    /// floored to `>= 1` (default 1), and the offset is derived as
    /// `(page - 1) * limit`.
    pub fn from_page(page: Option<i32>, limit: Option<i32>) -> Self {
        let limit = normalize_limit(limit);
        let requested_page = page.unwrap_or(1).max(1);
        // OFFSET is represented as i32 throughout the request model. Clamp the
        // effective page before multiplying so even i32::MAX input stays total
        // and can never wrap into a negative SQL offset.
        let max_page = (i64::from(i32::MAX) / i64::from(limit) + 1).min(i64::from(i32::MAX)) as i32;
        let page = requested_page.min(max_page);
        let offset = (page - 1) * limit;
        Self {
            page,
            limit,
            offset,
        }
    }

    /// Builds a window from offset-based inputs (sessions): `limit` is clamped
    /// to `[1, MAX_LIMIT]` (default [`DEFAULT_LIMIT`]); the offset is taken from
    /// `offset` (floored to `>= 0`) when present, else derived from `page` as
    /// `(page - 1) * limit`, else 0. The 1-based `page` reported back is always
    /// derived from the resolved offset/limit so the metadata is internally
    /// consistent regardless of which input style the client used.
    pub fn from_offset(limit: Option<i32>, offset: Option<i32>, page: Option<i32>) -> Self {
        match offset {
            Some(offset) => {
                let limit = normalize_limit(limit);
                let offset = normalize_offset(Some(offset));
                // The final i32 offset at limit=1 corresponds to page 2^31.
                // Keep the exact SQL offset and saturate only the page label.
                let page = (offset / limit).saturating_add(1);
                Self {
                    page,
                    limit,
                    offset,
                }
            }
            None => Self::from_page(page, limit),
        }
    }

    /// Normalized page size for the response (`page_size`). Always `>= 1`.
    pub fn page_size(&self) -> i32 {
        self.limit
    }

    /// Normalized 1-based page number for the response.
    pub fn page(&self) -> i32 {
        self.page
    }

    /// Normalized row offset for the SQL query.
    pub fn offset(&self) -> i32 {
        self.offset
    }

    /// Whether more rows exist beyond the current window, given the total match
    /// count. Computed from the NORMALIZED offset/limit so it is always
    /// consistent with what was actually fetched.
    pub fn has_more(&self, total: i64) -> bool {
        (i64::from(self.offset) + i64::from(self.limit)) < total
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
    fn from_page_defaults() {
        let p = Pagination::from_page(None, None);
        assert_eq!(p.page, 1);
        assert_eq!(p.limit, DEFAULT_LIMIT);
        assert_eq!(p.offset, 0);
    }

    #[test]
    fn from_page_clamps_limit() {
        // limit=0 and negative clamp up to 1.
        assert_eq!(Pagination::from_page(Some(1), Some(0)).limit, 1);
        assert_eq!(Pagination::from_page(Some(1), Some(-5)).limit, 1);
        // >MAX clamps down.
        assert_eq!(Pagination::from_page(Some(1), Some(1000)).limit, MAX_LIMIT);
        // Boundaries kept.
        assert_eq!(Pagination::from_page(Some(1), Some(1)).limit, 1);
        assert_eq!(
            Pagination::from_page(Some(1), Some(MAX_LIMIT)).limit,
            MAX_LIMIT
        );
    }

    #[test]
    fn from_page_floors_page_and_derives_offset() {
        // page None/0/negative floor to 1 => offset 0.
        assert_eq!(Pagination::from_page(None, Some(10)).page, 1);
        assert_eq!(Pagination::from_page(Some(0), Some(10)).page, 1);
        assert_eq!(Pagination::from_page(Some(-3), Some(10)).page, 1);
        assert_eq!(Pagination::from_page(Some(0), Some(10)).offset, 0);
        // page 3, limit 10 => offset 20.
        let p = Pagination::from_page(Some(3), Some(10));
        assert_eq!(p.page, 3);
        assert_eq!(p.offset, 20);
    }

    #[test]
    fn page_arithmetic_never_overflows() {
        let p = Pagination::from_page(Some(i32::MAX), Some(MAX_LIMIT));
        assert!(p.offset >= 0);
        assert_eq!(p.offset, (p.page - 1) * p.limit);
        assert!(!p.has_more(i64::from(i32::MAX)));

        let p = Pagination::from_offset(Some(MAX_LIMIT), None, Some(i32::MAX));
        assert!(p.offset >= 0);
        assert_eq!(p.offset, (p.page - 1) * p.limit);
    }

    #[test]
    fn maximum_offset_with_minimum_limit_does_not_overflow() {
        let p = Pagination::from_offset(Some(1), Some(i32::MAX), None);
        assert_eq!(p.offset, i32::MAX);
        assert_eq!(p.page(), i32::MAX);
        assert!(!p.has_more(2_147_483_648));
        assert!(p.has_more(2_147_483_649));
    }

    #[test]
    fn from_offset_defaults() {
        let p = Pagination::from_offset(None, None, None);
        assert_eq!(p.page, 1);
        assert_eq!(p.limit, DEFAULT_LIMIT);
        assert_eq!(p.offset, 0);
    }

    #[test]
    fn from_offset_floors_offset_and_derives_page() {
        // Negative offset floors to 0 => page 1.
        let p = Pagination::from_offset(Some(10), Some(-1), None);
        assert_eq!(p.offset, 0);
        assert_eq!(p.page, 1);
        // Positive offset preserved; page derived from offset/limit.
        let p = Pagination::from_offset(Some(10), Some(40), None);
        assert_eq!(p.offset, 40);
        assert_eq!(p.page, 5);
    }

    #[test]
    fn from_offset_wins_over_page() {
        // offset present => page param ignored for offset, page re-derived.
        let p = Pagination::from_offset(Some(10), Some(20), Some(99));
        assert_eq!(p.offset, 20);
        assert_eq!(p.page, 3);
    }

    #[test]
    fn from_offset_page_derived_when_no_offset() {
        // No offset, page given => offset (page-1)*limit, page floored to 1.
        let p = Pagination::from_offset(Some(10), None, Some(3));
        assert_eq!(p.offset, 20);
        assert_eq!(p.page, 3);
        let p = Pagination::from_offset(Some(10), None, Some(0));
        assert_eq!(p.offset, 0);
        assert_eq!(p.page, 1);
    }

    #[test]
    fn page_size_reports_normalized_limit() {
        // The bug fix: an out-of-range limit reports the CLAMPED page_size.
        assert_eq!(Pagination::from_page(Some(1), Some(0)).page_size(), 1);
        assert_eq!(Pagination::from_page(Some(1), Some(-5)).page_size(), 1);
        assert_eq!(
            Pagination::from_page(Some(1), Some(1000)).page_size(),
            MAX_LIMIT
        );
        assert_eq!(Pagination::from_offset(Some(0), None, None).page_size(), 1);
        assert_eq!(
            Pagination::from_offset(Some(1000), None, None).page_size(),
            MAX_LIMIT
        );
    }

    #[test]
    fn has_more_uses_normalized_values() {
        // limit=0 clamps to 1; with total=2 and offset 0 there IS more.
        let p = Pagination::from_page(Some(1), Some(0));
        assert_eq!(p.page_size(), 1);
        assert!(p.has_more(2));
        assert!(!p.has_more(1));
        // Last page: offset+limit == total => no more.
        let p = Pagination::from_page(Some(2), Some(10));
        assert_eq!(p.offset, 10);
        assert!(!p.has_more(20));
        assert!(p.has_more(21));
        // Zero total never has more.
        assert!(!Pagination::from_page(None, None).has_more(0));
    }

    #[test]
    fn normalized_metadata_is_consistent_for_page_and_offset_requests() {
        for (raw_limit, expected_size, expected_offset) in [
            (0, 1, 1),
            (-5, 1, 1),
            (101, 100, 100),
            (i32::MIN, 1, 1),
            (i32::MAX, 100, 100),
        ] {
            let by_page = Pagination::from_page(Some(2), Some(raw_limit));
            let by_offset =
                Pagination::from_offset(Some(raw_limit), Some(expected_offset), Some(99));
            assert_eq!(by_page, by_offset);
            assert_eq!(by_page.page(), 2);
            assert_eq!(by_page.page_size(), expected_size);
            let end = i64::from(expected_offset + expected_size);
            assert!(!by_page.has_more(end));
            assert!(by_page.has_more(end + 1));
        }
    }

    #[test]
    fn page_getter_matches_field() {
        let p = Pagination::from_page(Some(4), Some(10));
        assert_eq!(p.page(), 4);
        assert_eq!(p.page(), p.page);
    }
}
