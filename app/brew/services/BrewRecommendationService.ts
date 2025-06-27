// Client-side service for recommendation logic only
export interface BrewRecommendation {
  water: number
  dose: number
  grind: number
  ratio: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  basedOnBrews?: number
}

export interface BrewWithFeedback {
  id: number
  bean_id: number | null
  method_id: number | null
  grinder_id: number | null
  water: number | null
  dose: number | null
  grind: number | null
  ratio: string | null // Changed to string to match database Numeric type
  created_at: string
  feedback?: {
    overall_rating: number | null
    too_strong: boolean
    too_weak: boolean
    is_sour: boolean
    is_bitter: boolean
    coffee_amount_ml: number | null
  }
}

export class BrewRecommendationService {
  // Pure client-side logic - no database operations

  static calculateRecommendation(
    brews: BrewWithFeedback[],
    methodName?: string
  ): BrewRecommendation | null {
    if (brews.length === 0) {
      return this.getDefaultRecommendation(methodName)
    }

    const goodBrews = this.filterGoodBrews(brews)

    if (goodBrews.length > 0) {
      return this.calculateOptimalParameters(goodBrews)
    }

    return this.analyzeAndImprove(brews)
  }

  private static filterGoodBrews(
    brews: BrewWithFeedback[]
  ): BrewWithFeedback[] {
    return brews.filter(
      brew =>
        brew.feedback &&
        brew.feedback.overall_rating &&
        brew.feedback.overall_rating >= 4 &&
        !brew.feedback.too_strong &&
        !brew.feedback.too_weak &&
        !brew.feedback.is_sour &&
        !brew.feedback.is_bitter
    )
  }

  private static calculateOptimalParameters(
    brews: BrewWithFeedback[]
  ): BrewRecommendation {
    // Filter out brews with null values
    const validBrews = brews.filter(
      brew =>
        brew.water !== null &&
        brew.dose !== null &&
        brew.grind !== null &&
        brew.ratio !== null
    )

    if (validBrews.length === 0) {
      // Return default values if no valid brews
      return {
        water: 250,
        dose: 15,
        grind: 20,
        ratio: 16.7,
        confidence: 'low',
        reasoning: 'No previous brews found with valid data',
        basedOnBrews: 0,
      }
    }

    const avgParams = validBrews.reduce(
      (acc, brew) => ({
        water: acc.water + (brew.water || 0),
        dose: acc.dose + (brew.dose || 0),
        grind: acc.grind + (brew.grind || 0),
        ratio: acc.ratio + (Number(brew.ratio) || 0),
      }),
      { water: 0, dose: 0, grind: 0, ratio: 0 }
    )

    const count = validBrews.length
    return {
      water: Math.round(avgParams.water / count),
      dose: Math.round(avgParams.dose / count),
      grind: Math.round(avgParams.grind / count),
      ratio: Math.round(avgParams.ratio / count),
      confidence: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low',
      reasoning: `Based on ${count} previous brew${count > 1 ? 's' : ''} with excellent feedback`,
      basedOnBrews: count,
    }
  }

  private static analyzeAndImprove(
    brews: BrewWithFeedback[]
  ): BrewRecommendation {
    const baseBrew = brews[0]
    let adjustedParams = {
      water: baseBrew.water,
      dose: baseBrew.dose,
      grind: baseBrew.grind,
      ratio: Number(baseBrew.ratio) || 0,
    }

    const adjustments: string[] = []
    const feedbackCounts = this.analyzeFeedbackPatterns(brews)

    // Apply intelligent adjustments
    if (feedbackCounts.tooStrong > feedbackCounts.tooWeak) {
      adjustedParams.ratio = Math.min((adjustedParams.ratio ?? 0) + 1, 20)
      adjustments.push('increased ratio to reduce strength')
    } else if (feedbackCounts.tooWeak > feedbackCounts.tooStrong) {
      adjustedParams.ratio = Math.max((adjustedParams.ratio ?? 0) - 1, 10)
      adjustments.push('decreased ratio to increase strength')
    }

    if (feedbackCounts.sour > 0) {
      adjustedParams.grind = Math.max((adjustedParams.grind ?? 0) - 1, 1)
      adjustments.push('finer grind to reduce sourness')
    }

    if (feedbackCounts.bitter > 0) {
      adjustedParams.grind = (adjustedParams.grind ?? 0) + 1
      adjustments.push('coarser grind to reduce bitterness')
    }

    return {
      water: adjustedParams.water ?? 250,
      dose: adjustedParams.dose ?? 15,
      grind: adjustedParams.grind ?? 20,
      ratio: adjustedParams.ratio ?? 17,
      confidence: brews.length >= 3 ? 'medium' : 'low',
      reasoning: `Adjusted based on feedback: ${adjustments.join(', ')}`,
      basedOnBrews: brews.length,
    }
  }

  private static analyzeFeedbackPatterns(brews: BrewWithFeedback[]) {
    return brews.reduce(
      (acc, brew) => {
        if (brew.feedback) {
          if (brew.feedback.too_strong) acc.tooStrong++
          if (brew.feedback.too_weak) acc.tooWeak++
          if (brew.feedback.is_sour) acc.sour++
          if (brew.feedback.is_bitter) acc.bitter++
        }
        return acc
      },
      { tooStrong: 0, tooWeak: 0, sour: 0, bitter: 0 }
    )
  }

  private static getDefaultRecommendation(
    methodName?: string
  ): BrewRecommendation {
    const defaults = this.getMethodDefaults(methodName?.toLowerCase() || '')

    return {
      ...defaults,
      confidence: 'low',
      reasoning: `Default parameters for ${methodName || 'this brewing method'} (no previous brews found)`,
      basedOnBrews: 0,
    }
  }

  private static getMethodDefaults(methodName: string) {
    if (methodName.includes('espresso')) {
      return { water: 60, dose: 18, grind: 5, ratio: 3 }
    } else if (methodName.includes('pour over') || methodName.includes('v60')) {
      return { water: 250, dose: 15, grind: 15, ratio: 17 }
    } else if (methodName.includes('french press')) {
      return { water: 350, dose: 21, grind: 30, ratio: 17 }
    } else if (methodName.includes('aeropress')) {
      return { water: 200, dose: 12, grind: 12, ratio: 17 }
    }

    return { water: 250, dose: 15, grind: 20, ratio: 17 } // Generic default
  }
}
