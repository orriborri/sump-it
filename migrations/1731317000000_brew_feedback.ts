import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("brew_feedback")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("brew_id", "integer", (col) =>
      col.references("brews.id").onDelete("cascade").notNull()
    )
    .addColumn("coffee_amount_ml", "integer")
    .addColumn("strength_rating", "integer", (col) => col.notNull())
    .addColumn("taste_balance", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("brew_feedback").execute();
}
