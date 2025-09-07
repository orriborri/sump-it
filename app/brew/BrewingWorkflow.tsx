'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { Step } from './Step'
import { useForm } from './useForm'
import { saveBrew } from './actions'
import type { RuntimeType } from '@/app/lib/types'
import type { Beans, Methods, Grinders } from '@/app/lib/db.d'

interface BrewingWorkflowProps {
  beans: RuntimeType<Beans>[]
  methods: RuntimeType<Methods>[]
  grinders: RuntimeType<Grinders>[]
}

export const BrewingWorkflow: React.FC<BrewingWorkflowProps> = ({
  beans,
  methods,
  grinders,
}) => {
  const form = useForm()
  const router = useRouter()
  
  const handleSubmit = async () => {
    console.log('Saving brew...', form.formData)
    const result = await saveBrew(form.formData)
    console.log('Save result:', result)
    
    if (result.success && result.brew) {
      console.log('Redirecting to:', `/brew/${result.brew.id}/rate`)
      router.push(`/brew/${result.brew.id}/rate`)
    } else {
      console.error('Failed to save brew:', result)
    }
  }

  return (
    <Step
      form={form}
      onSubmit={handleSubmit}
      beans={beans}
      methods={methods}
      grinders={grinders}
    />
  )
}
