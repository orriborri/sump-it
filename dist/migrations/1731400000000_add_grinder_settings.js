export async function up(db) {
    // Add grinder setting columns
    await db.schema
        .alterTable("grinders")
        .addColumn("min_setting", "integer", (col) => col.defaultTo(1))
        .addColumn("max_setting", "integer", (col) => col.defaultTo(40))
        .addColumn("step_size", "real", (col) => col.defaultTo(1.0))
        .addColumn("setting_type", "varchar", (col) => col.defaultTo('numeric'))
        .execute();
}
export async function down(db) {
    await db.schema
        .alterTable("grinders")
        .dropColumn("min_setting")
        .dropColumn("max_setting")
        .dropColumn("step_size")
        .dropColumn("setting_type")
        .execute();
}
