interface Feedback {
  too_weak?: boolean
  too_strong?: boolean
  grind_too_coarse?: boolean
  grind_too_fine?: boolean
  is_bitter?: boolean
  is_sour?: boolean
}

interface CurrentBrew {
  grind: number
  ratio: number
}

interface Suggestions {
  grind: number
  ratio: number
  reason: string
}

export function generateBrewSuggestions(feedback: Feedback, current: CurrentBrew): Suggestions {
  let grindAdjustment = 0
  let ratioAdjustment = 0
  let reasons = []

  if (feedback.too_weak) {
    grindAdjustment -= 2 // Finer grind
    ratioAdjustment -= 1 // Stronger ratio
    reasons.push('finer grind and stronger ratio for more extraction')
  }

  if (feedback.too_strong) {
    grindAdjustment += 2 // Coarser grind  
    ratioAdjustment += 1 // Weaker ratio
    reasons.push('coarser grind and weaker ratio for less extraction')
  }

  if (feedback.is_bitter) {
    grindAdjustment += 1 // Coarser grind
    reasons.push('coarser grind to reduce bitterness')
  }

  if (feedback.is_sour) {
    grindAdjustment -= 1 // Finer grind
    reasons.push('finer grind to reduce sourness')
  }

  if (feedback.grind_too_fine) {
    grindAdjustment += 3
    reasons.push('grind coarser to reduce over-extraction')
  }

  if (feedback.grind_too_coarse) {
    grindAdjustment -= 3
    reasons.push('grind finer to increase extraction')
  }

  const reason = reasons.length > 0 ? `Try ${reasons.join(' and ')}` : 'Current settings look good'

  return {
    grind: Math.max(1, Math.min(40, current.grind + grindAdjustment)),
    ratio: Math.max(10, Math.min(20, current.ratio + ratioAdjustment)),
    reason
  }
}
