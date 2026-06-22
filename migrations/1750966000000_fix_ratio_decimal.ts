import { Kysely, sql } from "kysely";
import { DB } from "./db-types";

export async function up(db: Kysely<DB>): Promise<void> {
	// Change ratio column from integer to decimal to support precise ratios like 16.67
	await db.schema
		.alterTable("brews")
		.alterColumn("ratio", (col) => col.setDataType(sql`numeric(5,2)`))
		.execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
	// Revert back to integer (this will truncate decimal values)
	await db.schema
		.alterTable("brews")
		.alterColumn("ratio", (col) => col.setDataType(sql`integer`))
		.execute();
}
