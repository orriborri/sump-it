'use server'

import { db } from '@/app/lib/database'
import { logger } from '@/app/lib/logger'

/**
 * Represents a recent brew configuration used for the Quick Brew feature
 * Contains equipment IDs, parameter values, and metadata about the brew history
 */
export interface QuickBrewConfig {
  id: number
  bean_id: number
  method_id: number
  grinder_id: number
  bean_name: string
  method_name: string
  grinder_name: string
  dose: number
  water: number
  grind: number
  ratio: number
  last_brewed_at: string
  brew_count: number
  last_rating: number | null
  suggested_grind: number | null
  suggested_ratio: number | null
}

/**
 * Fetches the most recent unique brew configurations (by bean/method/grinder combo).
 * Returns up to 5 configs, ordered by most recently brewed.
 * Includes the latest feedback suggestions if available.
 */
export async function getRecentBrewConfigs(): Promise<QuickBrewConfig[]> {
  try {
    // Get the most recent brew for each unique bean/method/grinder combination
    // along with joined names and latest feedback
    const results = await db
      .selectFrom('brews')
      .innerJoin('beans', 'brews.bean_id', 'beans.id')
      .innerJoin('methods', 'brews.method_id', 'methods.id')
      .innerJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .leftJoin('brew_feedback', 'brews.id', 'brew_feedback.brew_id')
      .select([
        'brews.id',
        'brews.bean_id',
        'brews.method_id',
        'brews.grinder_id',
        'beans.name as bean_name',
        'methods.name as method_name',
        'grinders.name as grinder_name',
        'brews.dose',
        'brews.water',
        'brews.grind',
        'brews.ratio',
        'brews.created_at',
        'brew_feedback.overall_rating',
        'brew_feedback.recommended_grind_adjustment',
      ])
      .where('brews.bean_id', 'is not', null)
      .where('brews.method_id', 'is not', null)
      .where('brews.grinder_id', 'is not', null)
      .orderBy('brews.created_at', 'desc')
      .execute()

    // Group by unique combo and take the most recent for each
    const seenCombos = new Map<string, QuickBrewConfig>()
    const comboCounts = new Map<string, number>()

    for (const row of results) {
      const key = `${row.bean_id}-${row.method_id}-${row.grinder_id}`

      // Count occurrences
      comboCounts.set(key, (comboCounts.get(key) || 0) + 1)

      // Only take the first (most recent) for each combo
      if (!seenCombos.has(key)) {
        const grindAdjustment = row.recommended_grind_adjustment || 0
        const currentGrind = row.grind || 20
        const currentRatio = row.ratio ? parseFloat(String(row.ratio)) : 16.67

        seenCombos.set(key, {
          id: row.id,
          bean_id: row.bean_id!,
          method_id: row.method_id!,
          grinder_id: row.grinder_id!,
          bean_name: row.bean_name || 'Unknown Bean',
          method_name: row.method_name || 'Unknown Method',
          grinder_name: row.grinder_name || 'Unknown Grinder',
          dose: row.dose || 15,
          water: row.water || 250,
          grind: grindAdjustment !== 0
            ? currentGrind + grindAdjustment
            : currentGrind,
          ratio: currentRatio,
          last_brewed_at: row.created_at.toISOString(),
          brew_count: 0, // Will be updated below
          last_rating: row.overall_rating ?? null,
          suggested_grind: grindAdjustment !== 0
            ? currentGrind + grindAdjustment
            : null,
          suggested_ratio: null, // Could be extended later
        })
      }
    }

    // Update brew counts
    for (const [key, config] of seenCombos) {
      config.brew_count = comboCounts.get(key) || 1
    }

    // Return top 5 most recent unique configs
    return Array.from(seenCombos.values()).slice(0, 5)
  } catch (error) {
    logger.error('Failed to fetch recent brew configs', { error: String(error) })
    return []
  }
}
