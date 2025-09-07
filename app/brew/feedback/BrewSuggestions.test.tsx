import { generateBrewSuggestions } from './BrewSuggestions'

describe('BrewSuggestions', () => {
  it('suggests finer grind when too weak', () => {
    const feedback = {
      too_weak: true,
      too_strong: false,
      grind_too_coarse: false,
      grind_too_fine: false
    }
    
    const suggestions = generateBrewSuggestions(feedback, { grind: 20, ratio: 16 })
    
    expect(suggestions.grind).toBeLessThan(20)
    expect(suggestions.reason).toContain('finer')
  })

  it('suggests coarser grind when too strong', () => {
    const feedback = {
      too_weak: false,
      too_strong: true,
      grind_too_coarse: false,
      grind_too_fine: false
    }
    
    const suggestions = generateBrewSuggestions(feedback, { grind: 20, ratio: 16 })
    
    expect(suggestions.grind).toBeGreaterThan(20)
    expect(suggestions.reason).toContain('coarser')
  })

  it('suggests higher ratio when too weak', () => {
    const feedback = {
      too_weak: true,
      too_strong: false,
      grind_too_coarse: false,
      grind_too_fine: false
    }
    
    const suggestions = generateBrewSuggestions(feedback, { grind: 20, ratio: 16 })
    
    expect(suggestions.ratio).toBeLessThan(16)
    expect(suggestions.reason).toContain('stronger')
  })

  it('suggests lower ratio when too strong', () => {
    const feedback = {
      too_weak: false,
      too_strong: true,
      grind_too_coarse: false,
      grind_too_fine: false
    }
    
    const suggestions = generateBrewSuggestions(feedback, { grind: 20, ratio: 16 })
    
    expect(suggestions.ratio).toBeGreaterThan(16)
    expect(suggestions.reason).toContain('weaker')
  })
})
