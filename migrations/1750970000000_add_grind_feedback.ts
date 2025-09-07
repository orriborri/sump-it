import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Add grind feedback columns to brew_feedback table
  await db.schema
    .alterTable('brew_feedback')
    .addColumn('grind_too_fine', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('grind_too_coarse', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('grind_perfect', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('recommended_grind_adjustment', 'integer') // -2 to +2 (much finer to much coarser)
    .addColumn('grind_notes', 'text')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove grind feedback columns
  await db.schema
    .alterTable('brew_feedback')
    .dropColumn('grind_too_fine')
    .dropColumn('grind_too_coarse')
    .dropColumn('grind_perfect')
    .dropColumn('recommended_grind_adjustment')
    .dropColumn('grind_notes')
    .execute()
}
