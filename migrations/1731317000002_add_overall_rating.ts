import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("brew_feedback")
    .addColumn("overall_rating", "integer")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("brew_feedback")
    .dropColumn("overall_rating")
    .execute();
}