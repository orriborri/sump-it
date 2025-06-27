'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { GrinderForm } from '../../GrinderForm'
import { updateGrinder, GrinderFormData } from '../../actions'

interface GrinderData {
  id: number
  name: string
  min_setting: number
  max_setting: number
  step_size: number
  setting_type: string
}

interface EditGrinderClientProps {
  grinder: GrinderData
}

export const EditGrinderClient: React.FC<EditGrinderClientProps> = ({
  grinder,
}) => {
  const router = useRouter()

  const handleSubmit = async (data: GrinderFormData) => {
    await updateGrinder(grinder.id, data)
    // Redirect is handled by the server action
  }

  const handleCancel = () => {
    router.push('/manage/grinders')
  }

  return (
    <GrinderForm
      initialData={{
        name: grinder.name,
        min_setting: grinder.min_setting,
        max_setting: grinder.max_setting,
        step_size: grinder.step_size,
        setting_type: grinder.setting_type,
      }}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isEditing={true}
    />
  )
}
