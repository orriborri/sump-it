import { sql } from "kysely";
export async function up(db) {
    await db.schema
        .createTable("beans")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("name", "varchar")
        .addColumn("roster", "varchar")
        .addColumn("rostery", "varchar")
        .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql `now()`).notNull())
        .execute();
    await db.schema
        .createTable("methods")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("name", "varchar", (col) => col.notNull().unique())
        .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql `now()`).notNull())
        .execute();
    await db.schema
        .createTable("grinders")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("name", "varchar")
        .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql `now()`).notNull())
        .execute();
    await db.schema
        .createTable("brews")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("bean_id", "integer", (col) => col.references("beans.id"))
        .addColumn("method_id", "integer", (col) => col.references("methods.id"))
        .addColumn("grinder_id", "integer", (col) => col.references("grinders.id"))
        .addColumn("water", "integer")
        .addColumn("dose", "integer")
        .addColumn("grind", "integer")
        .addColumn("ratio", "integer")
        .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql `now()`).notNull())
        .execute();
    // up migration code goes here...
    // note: up migrations are mandatory. you must implement this function.
    // For more info, see: https://kysely.dev/docs/migrations
}
export async function down(db) {
    // down migration code goes here...
    // note: down migrations are optional. you can safely delete this function.
    // For more info, see: https://kysely.dev/docs/migrations
    await db.schema.dropTable("brews").execute();
    await db.schema.dropTable("beans").execute();
    await db.schema.dropTable("methods").execute();
    await db.schema.dropTable("grinders").execute();
}
