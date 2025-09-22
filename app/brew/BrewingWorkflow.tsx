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
    const result = await saveBrew(form.formData)
    
    if (result.success && result.brew) {
      router.push(`/brew/${result.brew.id}/rate`)
    }
    // Error handling could be added here
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
