import { useState } from 'react'
import { FormData } from '../types'
import { saveBrew, saveBrewFeedback } from '../enhanced-actions'

type WorkflowView = 'form' | 'feedback'

interface BrewWorkflowState {
  currentView: WorkflowView
  brewData: FormData | null
  brewId: number | null
  isLoading: boolean
  isTransitioning: boolean
  error: string | null
}

const initialState: BrewWorkflowState = {
  currentView: 'form',
  brewData: null,
  brewId: null,
  isLoading: false,
  isTransitioning: false,
  error: null,
}

export const useBrewWorkflow = () => {
  const [state, setState] = useState<BrewWorkflowState>(initialState)

  const actions = {
    submitBrew: async (data: FormData) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await saveBrew(data)

        if (result.success && result.brew) {
          setState(prev => ({
            ...prev,
            brewData: data,
            brewId: result.brew!.id,
            isLoading: false,
            isTransitioning: true,
          }))

          // Transition to feedback
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              currentView: 'feedback',
              isTransitioning: false,
            }))
          }, 300)
        } else {
          setState(prev => ({
            ...prev,
            error: result.error || 'Failed to save brew',
            isLoading: false,
          }))
        }
      } catch (_error) {
        setState(prev => ({
          ...prev,
          error: 'An unexpected error occurred',
          isLoading: false,
        }))
      }
    },

    submitFeedback: async (feedback: any) => {
      if (!state.brewId) return

      setState(prev => ({ ...prev, isLoading: true }))

      try {
        const result = await saveBrewFeedback(state.brewId, feedback)

        if (result.success) {
          actions.resetWorkflow()
        } else {
          setState(prev => ({
            ...prev,
            error: result.error || 'Failed to save feedback',
            isLoading: false,
          }))
        }
      } catch (_error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to save feedback',
          isLoading: false,
        }))
      }
    },

    resetWorkflow: () => {
      setState(prev => ({ ...prev, isTransitioning: true }))

      setTimeout(() => {
        setState(initialState)
      }, 300)
    },

    clearError: () => {
      setState(prev => ({ ...prev, error: null }))
    },
  }

  return { state, actions }
}
