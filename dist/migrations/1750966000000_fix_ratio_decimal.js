import { sql } from "kysely";
// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db) {
    // Change ratio column from integer to decimal to support precise ratios like 16.67
    await db.schema
        .alterTable("brews")
        .alterColumn("ratio", (col) => col.setDataType(sql `numeric(5,2)`))
        .execute();
}
// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db) {
    // Revert back to integer (this will truncate decimal values)
    await db.schema
        .alterTable("brews")
        .alterColumn("ratio", (col) => col.setDataType(sql `integer`))
        .execute();
}
