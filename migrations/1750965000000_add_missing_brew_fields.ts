import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add missing columns to brews table
  await db.schema
    .alterTable("brews")
    .addColumn("water", "integer")
    .addColumn("dose", "integer") 
    .addColumn("grind", "integer")
    .addColumn("ratio", "integer")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove the added columns
  await db.schema
    .alterTable("brews")
    .dropColumn("water")
    .dropColumn("dose")
    .dropColumn("grind")
    .dropColumn("ratio")
    .dropColumn("created_at")
    .execute();
}
