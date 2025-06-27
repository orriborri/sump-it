import { useState } from 'react'

interface RatioCalculationProps {
  water: number
  dose: number
  ratio: number
  setValue?: (_field: string, _value: number) => void
}

export const useRatioCalculation = (props: RatioCalculationProps) => {
  const { water, dose, ratio, setValue } = props
  const [values, setValues] = useState({ water, dose, ratio })

  const updateWater = (newWater: number) => {
    const newRatio = newWater / values.dose
    const roundedRatio = Math.round(newRatio)
    setValues(prev => ({ ...prev, water: newWater, ratio: roundedRatio }))
    if (setValue) {
      setValue('water', newWater)
      setValue('ratio', roundedRatio)
    }
  }

  const updateDose = (newDose: number) => {
    const newRatio = values.water / newDose
    const roundedRatio = Math.round(newRatio)
    setValues(prev => ({ ...prev, dose: newDose, ratio: roundedRatio }))
    if (setValue) {
      setValue('dose', newDose)
      setValue('ratio', roundedRatio)
    }
  }

  const updateRatio = (newRatio: number) => {
    const newWater = values.dose * newRatio
    const roundedWater = Math.round(newWater)
    setValues(prev => ({ ...prev, ratio: newRatio, water: roundedWater }))
    if (setValue) {
      setValue('ratio', newRatio)
      setValue('water', roundedWater)
    }
  }

  return {
    values,
    updateWater,
    updateDose,
    updateRatio,
  }
}
