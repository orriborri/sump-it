'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { Step } from './Step'
import { useForm } from './useForm'
import { saveBrew } from './actions'
import { QuickBrew } from './QuickBrew'
import type { QuickBrewConfig } from './quickBrewActions'
import type { FormData } from './types'
import type { RuntimeType } from '@/app/lib/types'
import type { Beans, Methods, Grinders } from '@/app/lib/db.d'

interface BrewingWorkflowProps {
  beans: RuntimeType<Beans>[]
  methods: RuntimeType<Methods>[]
  grinders: RuntimeType<Grinders>[]
  recentConfigs: QuickBrewConfig[]
}

/**
 * Orchestrates the complete brewing workflow including quick brew shortcuts
 * Manages form state, submission, and navigation between quick brew and step-by-step flow
 */
export const BrewingWorkflow: React.FC<BrewingWorkflowProps> = ({
  beans,
  methods,
  grinders,
  recentConfigs,
}) => {
  const form = useForm()
  const router = useRouter()

  /**
   * Handles brew form submission by saving to the database and navigating to the timer page
   */
  const handleSubmit = async () => {
    const result = await saveBrew(form.formData)

    if (result.success && result.brew) {
      router.push(`/brew/${result.brew.id}/timer`)
    }
    // Error handling could be added here
  }

  /**
   * Pre-fills the form with a quick brew configuration and skips to the parameters step
   * @param config - The form data from the selected quick brew configuration
   */
  const handleQuickBrewSelect = (config: FormData) => {
    // Pre-fill the form and skip to Step 2 (Brewing Parameters)
    form.prefillForm(config, { skipToStep: 1 })
  }

  return (
    <>
      <QuickBrew configs={recentConfigs} onSelect={handleQuickBrewSelect} />
      <Step
        form={form}
        onSubmit={handleSubmit}
        beans={beans}
        methods={methods}
        grinders={grinders}
      />
    </>
  )
}
