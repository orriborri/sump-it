import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Drop the old columns
  await db.schema
    .alterTable("brew_feedback")
    .dropColumn("strength_rating")
    .dropColumn("taste_balance")
    .execute();

  // Add the new columns
  await db.schema
    .alterTable("brew_feedback")
    .addColumn("too_strong", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("too_weak", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("is_sour", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("is_bitter", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove the new columns
  await db.schema
    .alterTable("brew_feedback")
    .dropColumn("too_strong")
    .dropColumn("too_weak")
    .dropColumn("is_sour")
    .dropColumn("is_bitter")
    .execute();

  // Add back the old columns
  await db.schema
    .alterTable("brew_feedback")
    .addColumn("strength_rating", "integer", (col) => col.notNull())
    .addColumn("taste_balance", "integer", (col) => col.notNull())
    .execute();
}
