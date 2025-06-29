import { describe, it, expect } from 'vitest'
import { useRatioCalculation } from './useRatioCalculation'
import { renderHook, act } from '@testing-library/react'

describe('Ratio Calculation Logic - Coffee Mathematics', () => {
  it('calculates water amount based on dose and ratio', () => {
    // Given: User sets 20g coffee dose with 1:16 ratio
    const { result } = renderHook(() =>
      useRatioCalculation({ dose: 20, ratio: 16, water: 320 })
    )

    // When: System has these values
    const { water, dose, ratio } = result.current.values

    // Then: Values should be consistent
    expect(dose).toBe(20)
    expect(ratio).toBe(16)
    expect(water).toBe(320)
  })

  it('updates water calculation when dose changes', () => {
    // Given: User starts with 20g dose, 16:1 ratio
    const { result } = renderHook(() =>
      useRatioCalculation({ dose: 20, ratio: 16, water: 320 })
    )

    // When: User increases dose to 25g
    act(() => {
      result.current.updateDose(25)
    })

    // Then: Ratio should recalculate (320ml ÷ 25g = ~13:1)
    expect(result.current.values.dose).toBe(25)
    expect(result.current.values.water).toBe(320)
    expect(result.current.values.ratio).toBe(13) // 320/25 = 12.8, rounded to 13
  })

  it('updates water calculation when ratio changes', () => {
    // Given: User has 20g dose with current water amount
    const { result } = renderHook(() =>
      useRatioCalculation({ dose: 20, ratio: 16, water: 320 })
    )

    // When: User changes to 1:15 ratio (stronger coffee)
    act(() => {
      result.current.updateRatio(15)
    })

    // Then: Water should update to 300ml (20g × 15)
    expect(result.current.values.dose).toBe(20)
    expect(result.current.values.ratio).toBe(15)
    expect(result.current.values.water).toBe(300)
  })

  it('handles water input changes correctly', () => {
    // Given: User has 20g dose setup
    const { result } = renderHook(() =>
      useRatioCalculation({ dose: 20, ratio: 16, water: 320 })
    )

    // When: User manually changes water to 350ml
    act(() => {
      result.current.updateWater(350)
    })

    // Then: Ratio should recalculate (350ml ÷ 20g = 17.5, rounded to 18)
    expect(result.current.values.dose).toBe(20)
    expect(result.current.values.water).toBe(350)
    expect(result.current.values.ratio).toBe(18) // 350/20 = 17.5, rounded to 18
  })

  it('maintains mathematical consistency across updates', () => {
    // Given: User starts with balanced parameters
    const { result } = renderHook(() =>
      useRatioCalculation({ dose: 18, ratio: 16, water: 288 })
    )

    // When: User makes a series of adjustments
    act(() => {
      result.current.updateDose(22) // Change dose
    })

    const afterDoseChange = result.current.values

    act(() => {
      result.current.updateRatio(15) // Change ratio
    })

    const afterRatioChange = result.current.values

    // Then: Each change should maintain mathematical relationships
    expect(afterDoseChange.dose).toBe(22)
    expect(afterDoseChange.water).toBe(288) // Water stays same
    expect(afterDoseChange.ratio).toBe(13) // 288/22 = ~13

    expect(afterRatioChange.dose).toBe(22)
    expect(afterRatioChange.ratio).toBe(15)
    expect(afterRatioChange.water).toBe(330) // 22 * 15 = 330
  })

  it('provides tools for brewing strength optimization', () => {
    // Given: User wants to experiment with strength
    const { result } = renderHook(() =>
      useRatioCalculation({ dose: 20, ratio: 16, water: 320 })
    )

    // When: User tries different strength levels

    // Strong coffee (1:12 ratio)
    act(() => {
      result.current.updateRatio(12)
    })
    const strongBrew = result.current.values
    expect(strongBrew.water).toBe(240) // 20g * 12 = 240ml

    // Weak coffee (1:20 ratio)
    act(() => {
      result.current.updateRatio(20)
    })
    const weakBrew = result.current.values
    expect(weakBrew.water).toBe(400) // 20g * 20 = 400ml

    // Then: User has precise control over brew strength
    expect(strongBrew.ratio).toBeLessThan(weakBrew.ratio)
    expect(strongBrew.water).toBeLessThan(weakBrew.water)
  })
})
