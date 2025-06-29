export async function up(db) {
    await db.schema
        .alterTable("brew_feedback")
        .addColumn("overall_rating", "integer")
        .execute();
}
export async function down(db) {
    await db.schema
        .alterTable("brew_feedback")
        .dropColumn("overall_rating")
        .execute();
}
