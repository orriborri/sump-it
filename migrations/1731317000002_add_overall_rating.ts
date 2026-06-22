import { Kysely, sql } from "kysely";
import { DB } from "./db-types";

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .alterTable("brew_feedback")
    .addColumn("overall_rating", "integer")
    .execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema
    .alterTable("brew_feedback")
    .dropColumn("overall_rating")
    .execute();
}