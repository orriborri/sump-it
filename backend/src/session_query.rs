//! Pure, DB-free assembly of the brewing-session list/filter/search query
//! (ticket #146).
//!
//! The actual SQL execution lives in the binary (`services/sessions.rs`) and
//! needs a live Postgres; it is exercised by the `#[ignore]`d DB integration
//! tests, which `make coverage-backend` and CI run against a real Postgres. To
//! keep the interesting logic covered by the library coverage gate (`cargo
//! llvm-cov --lib`), everything that decides WHICH predicates apply, in what
//! order, and how pagination is clamped is expressed here as pure functions over a
//! [`crate::models::SessionFilter`] plus an optional free-text search term.
//!
//! SAFETY: user input is NEVER interpolated into SQL. This module only emits
//! fixed SQL fragments containing numbered placeholders (`$1`, `$2`, ...) and a
//! parallel, ordered list of [`QueryBind`] values describing what to bind to
//! each placeholder. The service walks that list and calls `.bind(..)` for each
//! entry, so every user value travels as a bound parameter. The search term is
//! wrapped as an ILIKE pattern (`%term%`) and bound once, then reused across
//! the four searched columns by referencing the same placeholder.

use chrono::NaiveDate;

use crate::models::{BrewingMethod, GrinderType, SessionFilter};

/// Default page size when a filter does not specify `limit`.
///
/// Re-exported from [`crate::pagination`] so there is exactly ONE definition of
/// the pagination policy; this alias keeps the historical `session_query::`
/// spelling working for callers that already reference it.
pub use crate::pagination::{DEFAULT_LIMIT, MAX_LIMIT};

/// A single value to bind to a numbered placeholder, in placeholder order.
///
/// The service matches on each variant and calls the corresponding sqlx
/// `.bind(..)`. Keeping the value in a typed enum (rather than a stringified
/// form) means the driver handles escaping/encoding, so there is no SQL
/// injection surface.
#[derive(Debug, Clone, PartialEq)]
pub enum QueryBind {
    /// A bean-origin equality match (`coffee_beans.origin = $n`).
    Text(String),
    /// A roast-date bound (`coffee_beans.roast_date >= $n` / `<= $n`).
    Date(NaiveDate),
    /// A grinder-type equality match (`grinders.grinder_type = $n`).
    Grinder(GrinderType),
    /// A brewing-method equality match (`brewing_sessions.brewing_method = $n`).
    Method(BrewingMethod),
    /// A minimum-rating bound (`brewing_sessions.rating >= $n`).
    Float(f32),
    /// An ILIKE search pattern (already wrapped as `%term%`).
    Pattern(String),
    /// An integer bound used for `LIMIT`/`OFFSET`.
    Int(i64),
}

/// A fully assembled, parameterised query: the SQL text (with `$1`..`$n`
/// placeholders) and the ordered binds to attach to it.
#[derive(Debug, Clone, PartialEq)]
pub struct BuiltQuery {
    /// SQL with numbered placeholders only; contains no user input.
    pub sql: String,
    /// Values to bind, in placeholder order.
    pub binds: Vec<QueryBind>,
}

/// Normalises a filter's `limit` into the inclusive range `[1, MAX_LIMIT]`,
/// defaulting to [`DEFAULT_LIMIT`] when unset. Pure and total.
///
/// Delegates to [`crate::pagination::normalize_limit`], the single source of
/// truth for the clamp policy (ticket #167); this thin wrapper preserves the
/// `session_query::normalize_limit` call sites unchanged.
pub fn normalize_limit(limit: Option<i32>) -> i32 {
    crate::pagination::normalize_limit(limit)
}

/// Normalises a filter's `offset` to a non-negative value, defaulting to 0.
/// Pure and total.
///
/// Delegates to [`crate::pagination::normalize_offset`] so the offset floor is
/// defined in exactly one place.
pub fn normalize_offset(offset: Option<i32>) -> i32 {
    crate::pagination::normalize_offset(offset)
}

/// Trims a raw search term and returns `Some(trimmed)` only when it contains
/// non-whitespace; a blank or whitespace-only term becomes `None` (no search
/// predicate is added). Pure and total.
pub fn normalize_search(term: Option<&str>) -> Option<String> {
    let trimmed = term?.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Wraps a normalised search term as a case-insensitive `ILIKE` pattern,
/// escaping the LIKE metacharacters `\`, `%` and `_` so they match literally
/// (the term is data, not a pattern the user controls). Pure and total.
pub fn search_pattern(term: &str) -> String {
    let mut escaped = String::with_capacity(term.len() + 2);
    escaped.push('%');
    for ch in term.chars() {
        if ch == '\\' || ch == '%' || ch == '_' {
            escaped.push('\\');
        }
        escaped.push(ch);
    }
    escaped.push('%');
    escaped
}

/// Builds the ordered list of WHERE predicates and their binds for a filter and
/// optional search term, numbering placeholders starting at `start_index`.
///
/// Returns the predicate fragments (each a complete boolean expression ready to
/// be joined with ` AND `) and the parallel bind list. This is the heart of the
/// filter/search logic and is unit tested exhaustively without a database.
///
/// Column references are fixed (the three tables are joined by
/// [`list_sessions_sql`]); only VALUES are placeholdered and bound.
pub fn build_predicates(
    filter: &SessionFilter,
    search: Option<&str>,
    start_index: usize,
) -> (Vec<String>, Vec<QueryBind>) {
    let mut predicates: Vec<String> = Vec::new();
    let mut binds: Vec<QueryBind> = Vec::new();
    let mut next = start_index;

    // Helper closure state is avoided to keep the control flow obvious and each
    // branch independently testable.
    if let Some(origin) = filter.bean_origin.as_ref() {
        predicates.push(format!("b.origin = ${next}"));
        binds.push(QueryBind::Text(origin.clone()));
        next += 1;
    }

    if let Some(from) = filter.roast_date_from {
        predicates.push(format!("b.roast_date >= ${next}"));
        binds.push(QueryBind::Date(from));
        next += 1;
    }

    if let Some(to) = filter.roast_date_to {
        predicates.push(format!("b.roast_date <= ${next}"));
        binds.push(QueryBind::Date(to));
        next += 1;
    }

    if let Some(grinder_type) = filter.grinder_type.as_ref() {
        predicates.push(format!("g.grinder_type = ${next}"));
        binds.push(QueryBind::Grinder(grinder_type.clone()));
        next += 1;
    }

    if let Some(method) = filter.brewing_method.as_ref() {
        predicates.push(format!("s.brewing_method = ${next}"));
        binds.push(QueryBind::Method(method.clone()));
        next += 1;
    }

    if let Some(rating_min) = filter.rating_min {
        predicates.push(format!("s.rating >= ${next}"));
        binds.push(QueryBind::Float(rating_min));
        next += 1;
    }

    if let Some(term) = normalize_search(search) {
        // One placeholder, reused across the four searched columns. Searching
        // is case-insensitive (ILIKE) across bean name, bean origin, grinder
        // brand and the session's tasting notes.
        predicates.push(format!(
            "(b.name ILIKE ${next} OR b.origin ILIKE ${next} \
             OR g.brand ILIKE ${next} OR s.tasting_notes ILIKE ${next})"
        ));
        binds.push(QueryBind::Pattern(search_pattern(&term)));
        // next is not advanced further; this is the last predicate.
        let _ = next;
    }

    (predicates, binds)
}

/// Assembles the complete `SELECT ... FROM brewing_sessions ...` statement that
/// lists sessions newest-first with paging, applying all active filters and the
/// optional search. Placeholders are numbered `$1..$n`; the returned
/// [`BuiltQuery::binds`] lists the values in that order, ending with the
/// `LIMIT`/`OFFSET` binds.
pub fn list_sessions_sql(filter: &SessionFilter, search: Option<&str>) -> BuiltQuery {
    let (predicates, mut binds) = build_predicates(filter, search, 1);

    let mut sql = String::from(
        "SELECT \
            s.id, s.bean_id, s.grinder_id, s.brewing_method, s.grind_setting, \
            s.water_temp_celsius, s.brew_time_seconds, s.coffee_grams, s.water_grams, \
            s.rating, s.tasting_notes, s.feedback, s.suggestions, s.is_template, \
            s.coffee_ratio, s.created_at, s.updated_at \
         FROM brewing_sessions s \
         JOIN coffee_beans b ON s.bean_id = b.id \
         JOIN grinders g ON s.grinder_id = g.id",
    );

    if !predicates.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&predicates.join(" AND "));
    }

    // Newest-first, stable: created_at then id so ties are deterministic.
    sql.push_str(" ORDER BY s.created_at DESC, s.id DESC");

    let limit_index = binds.len() + 1;
    let offset_index = binds.len() + 2;
    sql.push_str(&format!(" LIMIT ${limit_index} OFFSET ${offset_index}"));
    binds.push(QueryBind::Int(normalize_limit(filter.limit) as i64));
    binds.push(QueryBind::Int(normalize_offset(filter.offset) as i64));

    BuiltQuery { sql, binds }
}

/// Assembles the `SELECT COUNT(*)` statement matching the SAME filters and
/// search as [`list_sessions_sql`], so the paginated response can report the
/// total number of matches (not just the current page). No `ORDER BY`,
/// `LIMIT` or `OFFSET` is applied.
pub fn count_sessions_sql(filter: &SessionFilter, search: Option<&str>) -> BuiltQuery {
    let (predicates, binds) = build_predicates(filter, search, 1);

    let mut sql = String::from(
        "SELECT COUNT(*) \
         FROM brewing_sessions s \
         JOIN coffee_beans b ON s.bean_id = b.id \
         JOIN grinders g ON s.grinder_id = g.id",
    );

    if !predicates.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&predicates.join(" AND "));
    }

    BuiltQuery { sql, binds }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    fn empty_filter() -> SessionFilter {
        SessionFilter {
            bean_origin: None,
            roast_date_from: None,
            roast_date_to: None,
            grinder_type: None,
            brewing_method: None,
            rating_min: None,
            limit: None,
            offset: None,
        }
    }

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
    fn normalize_search_trims_and_drops_blank() {
        assert_eq!(normalize_search(None), None);
        assert_eq!(normalize_search(Some("")), None);
        assert_eq!(normalize_search(Some("   ")), None);
        assert_eq!(normalize_search(Some("  floral ")), Some("floral".to_string()));
        assert_eq!(normalize_search(Some("v60")), Some("v60".to_string()));
    }

    #[test]
    fn search_pattern_wraps_and_escapes() {
        assert_eq!(search_pattern("floral"), "%floral%");
        // LIKE metacharacters are escaped so they match literally.
        assert_eq!(search_pattern("50%"), "%50\\%%");
        assert_eq!(search_pattern("a_b"), "%a\\_b%");
        assert_eq!(search_pattern("back\\slash"), "%back\\\\slash%");
        // Combined metacharacters.
        assert_eq!(search_pattern("%_\\"), "%\\%\\_\\\\%");
    }

    #[test]
    fn build_predicates_empty_filter_no_search() {
        let (predicates, binds) = build_predicates(&empty_filter(), None, 1);
        assert!(predicates.is_empty());
        assert!(binds.is_empty());
    }

    #[test]
    fn build_predicates_single_origin() {
        let filter = SessionFilter {
            bean_origin: Some("Ethiopia".to_string()),
            ..empty_filter()
        };
        let (predicates, binds) = build_predicates(&filter, None, 1);
        assert_eq!(predicates, vec!["b.origin = $1".to_string()]);
        assert_eq!(binds, vec![QueryBind::Text("Ethiopia".to_string())]);
    }

    #[test]
    fn build_predicates_roast_date_range() {
        let from = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
        let to = NaiveDate::from_ymd_opt(2026, 2, 1).unwrap();
        let filter = SessionFilter {
            roast_date_from: Some(from),
            roast_date_to: Some(to),
            ..empty_filter()
        };
        let (predicates, binds) = build_predicates(&filter, None, 1);
        assert_eq!(
            predicates,
            vec!["b.roast_date >= $1".to_string(), "b.roast_date <= $2".to_string()]
        );
        assert_eq!(binds, vec![QueryBind::Date(from), QueryBind::Date(to)]);
    }

    #[test]
    fn build_predicates_grinder_and_method_and_rating() {
        let filter = SessionFilter {
            grinder_type: Some(GrinderType::BurrConical),
            brewing_method: Some(BrewingMethod::Espresso),
            rating_min: Some(7.5),
            ..empty_filter()
        };
        let (predicates, binds) = build_predicates(&filter, None, 1);
        assert_eq!(
            predicates,
            vec![
                "g.grinder_type = $1".to_string(),
                "s.brewing_method = $2".to_string(),
                "s.rating >= $3".to_string(),
            ]
        );
        assert_eq!(
            binds,
            vec![
                QueryBind::Grinder(GrinderType::BurrConical),
                QueryBind::Method(BrewingMethod::Espresso),
                QueryBind::Float(7.5),
            ]
        );
    }

    #[test]
    fn build_predicates_search_only_reuses_one_placeholder() {
        let (predicates, binds) = build_predicates(&empty_filter(), Some("Floral"), 1);
        assert_eq!(predicates.len(), 1);
        assert_eq!(
            predicates[0],
            "(b.name ILIKE $1 OR b.origin ILIKE $1 OR g.brand ILIKE $1 OR s.tasting_notes ILIKE $1)"
        );
        assert_eq!(binds, vec![QueryBind::Pattern("%Floral%".to_string())]);
    }

    #[test]
    fn build_predicates_blank_search_adds_nothing() {
        let (predicates, binds) = build_predicates(&empty_filter(), Some("   "), 1);
        assert!(predicates.is_empty());
        assert!(binds.is_empty());
    }

    #[test]
    fn build_predicates_all_filters_and_search_are_ordered_and_numbered() {
        let from = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
        let to = NaiveDate::from_ymd_opt(2026, 3, 1).unwrap();
        let filter = SessionFilter {
            bean_origin: Some("Kenya".to_string()),
            roast_date_from: Some(from),
            roast_date_to: Some(to),
            grinder_type: Some(GrinderType::BurrFlat),
            brewing_method: Some(BrewingMethod::V60),
            rating_min: Some(6.0),
            limit: Some(10),
            offset: Some(5),
        };
        let (predicates, binds) = build_predicates(&filter, Some("fruity"), 1);
        assert_eq!(
            predicates,
            vec![
                "b.origin = $1".to_string(),
                "b.roast_date >= $2".to_string(),
                "b.roast_date <= $3".to_string(),
                "g.grinder_type = $4".to_string(),
                "s.brewing_method = $5".to_string(),
                "s.rating >= $6".to_string(),
                "(b.name ILIKE $7 OR b.origin ILIKE $7 OR g.brand ILIKE $7 OR s.tasting_notes ILIKE $7)"
                    .to_string(),
            ]
        );
        assert_eq!(
            binds,
            vec![
                QueryBind::Text("Kenya".to_string()),
                QueryBind::Date(from),
                QueryBind::Date(to),
                QueryBind::Grinder(GrinderType::BurrFlat),
                QueryBind::Method(BrewingMethod::V60),
                QueryBind::Float(6.0),
                QueryBind::Pattern("%fruity%".to_string()),
            ]
        );
    }

    #[test]
    fn build_predicates_respects_start_index() {
        let filter = SessionFilter {
            bean_origin: Some("Brazil".to_string()),
            rating_min: Some(5.0),
            ..empty_filter()
        };
        let (predicates, _binds) = build_predicates(&filter, None, 3);
        assert_eq!(
            predicates,
            vec!["b.origin = $3".to_string(), "s.rating >= $4".to_string()]
        );
    }

    #[test]
    fn list_sql_no_filters_has_join_order_limit_offset() {
        let built = list_sessions_sql(&empty_filter(), None);
        assert!(built.sql.contains("FROM brewing_sessions s"));
        assert!(built.sql.contains("JOIN coffee_beans b ON s.bean_id = b.id"));
        assert!(built.sql.contains("JOIN grinders g ON s.grinder_id = g.id"));
        // No WHERE when there are no predicates.
        assert!(!built.sql.contains(" WHERE "));
        assert!(built.sql.contains("ORDER BY s.created_at DESC, s.id DESC"));
        assert!(built.sql.contains("LIMIT $1 OFFSET $2"));
        // Only the pagination binds, defaulted.
        assert_eq!(
            built.binds,
            vec![
                QueryBind::Int(DEFAULT_LIMIT as i64),
                QueryBind::Int(0),
            ]
        );
    }

    #[test]
    fn list_sql_with_filters_numbers_pagination_after_predicates() {
        let filter = SessionFilter {
            bean_origin: Some("Ethiopia".to_string()),
            rating_min: Some(8.0),
            limit: Some(20),
            offset: Some(40),
            ..empty_filter()
        };
        let built = list_sessions_sql(&filter, Some("berry"));
        // Two filter predicates + one search = placeholders $1..$3, so
        // pagination is $4 and $5.
        assert!(built.sql.contains(" WHERE "));
        assert!(built.sql.contains("LIMIT $4 OFFSET $5"));
        assert_eq!(
            built.binds,
            vec![
                QueryBind::Text("Ethiopia".to_string()),
                QueryBind::Float(8.0),
                QueryBind::Pattern("%berry%".to_string()),
                QueryBind::Int(20),
                QueryBind::Int(40),
            ]
        );
    }

    #[test]
    fn count_sql_mirrors_filters_without_pagination() {
        let filter = SessionFilter {
            bean_origin: Some("Ethiopia".to_string()),
            limit: Some(20),
            offset: Some(40),
            ..empty_filter()
        };
        let built = count_sessions_sql(&filter, None);
        assert!(built.sql.starts_with("SELECT COUNT(*)"));
        assert!(built.sql.contains(" WHERE b.origin = $1"));
        // No ORDER/LIMIT/OFFSET in the count query.
        assert!(!built.sql.contains("ORDER BY"));
        assert!(!built.sql.contains("LIMIT"));
        assert!(!built.sql.contains("OFFSET"));
        // Only the filter bind, no pagination binds.
        assert_eq!(built.binds, vec![QueryBind::Text("Ethiopia".to_string())]);
    }

    #[test]
    fn count_sql_no_filters_has_no_where() {
        let built = count_sessions_sql(&empty_filter(), None);
        assert!(!built.sql.contains(" WHERE "));
        assert!(built.binds.is_empty());
    }
}
