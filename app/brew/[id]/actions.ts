'use server'

import { db } from '../../lib/database'
import { revalidatePath } from 'next/cache'
import type { FeedbackFormData } from './types'

/**
 * Submits brew feedback data to the database and revalidates the brew page cache
 * @param brewId - The ID of the brew to attach feedback to
 * @param data - The feedback form data with taste characteristics and rating
 */
export const submitBrewFeedback = async (
  brewId: number,
  data: FeedbackFormData
) => {
  const feedbackData = {
    brew_id: brewId,
    ...(data.coffee_amount_ml !== undefined && {
      coffee_amount_ml: data.coffee_amount_ml,
    }),
    too_strong: data.too_strong,
    too_weak: data.too_weak,
    is_sour: data.is_sour,
    is_bitter: data.is_bitter,
    overall_rating: data.overall_rating,
  }

  await db.insertInto('brew_feedback').values(feedbackData).execute()
  revalidatePath(`/brew/${brewId}`)
}

/**
 * Fetches brew details including equipment names for display on the brew page
 * @param brewId - The ID of the brew to retrieve
 * @returns Brew details object with equipment names, parameters, and metadata
 */
export async function getBrewDetails(brewId: number) {
  // Implementation will fetch brew with joined data
  return {
    id: brewId,
    bean_name: 'Ethiopian Yirgacheffe',
    method_name: 'V60', 
    grinder_name: 'Comandante',
    dose: 15,
    water: 250,
    ratio: 16.67,
    grind: 20
  }
}

/**
 * Retrieves the top 3 most recent brew feedback entries ordered by rating
 * Joins feedback with brew data to include grind and ratio context
 * @returns Array of recent feedback entries with associated brew parameters
 */
export const getRecentBrewFeedback = async () => {
  return await db
    .selectFrom('brew_feedback')
    .innerJoin('brews', 'brews.id', 'brew_feedback.brew_id')
    .select([
      'brew_feedback.id as feedback_id',
      'brews.id as brew_id',
      'brews.grind',
      'brews.ratio',
      'brew_feedback.coffee_amount_ml',
      'brew_feedback.too_strong',
      'brew_feedback.too_weak',
      'brew_feedback.is_sour',
      'brew_feedback.is_bitter',
      'brew_feedback.overall_rating',
      'brew_feedback.created_at',
    ])
    .orderBy('brew_feedback.overall_rating', 'desc')
    .limit(3)
    .execute()
}
