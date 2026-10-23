//! Shared pagination normalization (ticket #167).
//!
//! Before this module, every list endpoint clamped `page`/`limit` on its own
//! (`services/beans.rs`, `services/grinders.rs`) while the HTTP handlers
//! computed `page_size`/`has_more` from the RAW, unclamped query parameters
//! (`api/beans.rs`, `api/grinders.rs`). That split meant a request with
//! `limit=0`, a negative limit, or `limit=1000` queried one page size but
//! REPORTED a different one in the response metadata (e.g. `page_size=0` with
//! `has_more` computed against a zero-wide page).
//!
//! [`Page`] is the single source of truth: given the raw `page` and `limit`
//! query parameters it normalizes them ONCE and exposes the normalized values
//! that BOTH the SQL query (`limit`, `offset`) AND the response metadata
//! (`page`, `page_size`, `has_more`) must be derived from. The limit is clamped
//! to the same `[1, MAX_LIMIT]` band and the same
//! [`DEFAULT_LIMIT`](crate::session_query::DEFAULT_LIMIT) default used
//! by the sessions path ([`crate::session_query::normalize_limit`]), so all
//! three list surfaces agree.

use crate::session_query::normalize_limit;

/// A normalized pagination window.
///
/// Construct with [`Page::from_params`]; the raw query parameters are clamped
/// once at construction and never re-read, so the query and the response
/// metadata can only ever be computed from the SAME normalized values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Page {
    /// 1-based page number, floored at 1.
    page: i32,
    /// Page size, clamped to `[1, MAX_LIMIT]`, defaulting to
    /// [`DEFAULT_LIMIT`](crate::session_query::DEFAULT_LIMIT).
    limit: i32,
}

impl Page {
    /// Normalizes raw `page`/`limit` query parameters.
    ///
    /// `page` floors at 1 (page numbers are 1-based). `limit` reuses
    /// [`normalize_limit`], so it defaults to
    /// [`DEFAULT_LIMIT`](crate::session_query::DEFAULT_LIMIT) when absent and
    /// clamps into `[1, MAX_LIMIT]`; `0`, negatives and values above the
    /// ceiling are all brought into range. Pure and total.
    pub fn from_params(page: Option<i32>, limit: Option<i32>) -> Self {
        Self {
            page: page.unwrap_or(1).max(1),
            limit: normalize_limit(limit),
        }
    }

    /// The normalized 1-based page number.
    pub fn page(&self) -> i32 {
        self.page
    }

    /// The normalized page size (what a full page holds). This is the value the
    /// response must report as `page_size`.
    pub fn limit(&self) -> i32 {
        self.limit
    }

    /// The SQL `OFFSET` for this page: `(page - 1) * limit`. Always `>= 0`.
    pub fn offset(&self) -> i32 {
        (self.page - 1) * self.limit
    }

    /// Whether more rows exist beyond this page, given the TOTAL match count.
    ///
    /// Computed from the NORMALIZED page/limit (not the raw params) so it can
    /// never disagree with the page the query actually returned. There are more
    /// rows when the number already covered by the end of this page
    /// (`offset + limit`) is still strictly less than `total`.
    pub fn has_more(&self, total: i64) -> bool {
        (self.offset() as i64 + self.limit as i64) < total
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session_query::{DEFAULT_LIMIT, MAX_LIMIT};

    #[test]
    fn defaults_when_params_absent() {
        let page = Page::from_params(None, None);
        assert_eq!(page.page(), 1);
        assert_eq!(page.limit(), DEFAULT_LIMIT);
        assert_eq!(page.offset(), 0);
    }

    #[test]
    fn page_floors_at_one() {
        assert_eq!(Page::from_params(Some(0), Some(10)).page(), 1);
        assert_eq!(Page::from_params(Some(-5), Some(10)).page(), 1);
        assert_eq!(Page::from_params(Some(3), Some(10)).page(), 3);
    }

    #[test]
    fn limit_zero_is_clamped_up_to_one() {
        let page = Page::from_params(Some(1), Some(0));
        assert_eq!(page.limit(), 1);
        // The reported page_size matches the clamped limit, not the raw 0.
        assert!(page.has_more(5), "with a 1-wide page and 5 rows there is more");
    }

    #[test]
    fn negative_limit_is_clamped_up_to_one() {
        assert_eq!(Page::from_params(Some(1), Some(-20)).limit(), 1);
    }

    #[test]
    fn limit_above_ceiling_is_clamped_down() {
        assert_eq!(Page::from_params(Some(1), Some(1000)).limit(), MAX_LIMIT);
    }

    #[test]
    fn limit_boundaries_are_kept() {
        assert_eq!(Page::from_params(Some(1), Some(1)).limit(), 1);
        assert_eq!(Page::from_params(Some(1), Some(MAX_LIMIT)).limit(), MAX_LIMIT);
    }

    #[test]
    fn offset_is_zero_based_on_normalized_values() {
        // page 1 -> offset 0
        assert_eq!(Page::from_params(Some(1), Some(20)).offset(), 0);
        // page 3 at limit 20 -> offset 40
        assert_eq!(Page::from_params(Some(3), Some(20)).offset(), 40);
        // page from a clamped 0 falls back to 1 -> offset 0
        assert_eq!(Page::from_params(Some(0), Some(20)).offset(), 0);
    }

    #[test]
    fn has_more_uses_normalized_limit_not_raw() {
        // Raw limit 0 would make (page * 0) = 0 and wrongly report has_more for
        // any positive total. Normalized to 1, a total of 1 on page 1 has no
        // more rows, but a total of 2 does.
        let page = Page::from_params(Some(1), Some(0));
        assert!(!page.has_more(1));
        assert!(page.has_more(2));
    }

    #[test]
    fn has_more_at_exact_boundary_is_false() {
        // 50 rows, default page of 50: page 1 covers all of them.
        let page = Page::from_params(Some(1), Some(DEFAULT_LIMIT));
        assert!(!page.has_more(DEFAULT_LIMIT as i64));
        // 51 rows: there is one more on page 2.
        assert!(page.has_more(DEFAULT_LIMIT as i64 + 1));
    }

    #[test]
    fn has_more_on_last_page_is_false() {
        // 45 rows across pages of 20: page 3 starts at offset 40 and ends at 60.
        let page = Page::from_params(Some(3), Some(20));
        assert!(!page.has_more(45));
        // page 2 (offset 20, end 40) still has more when total is 45.
        let page2 = Page::from_params(Some(2), Some(20));
        assert!(page2.has_more(45));
    }
}
