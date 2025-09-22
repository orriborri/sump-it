'use server'

import { db } from '@/app/lib/database'
import { GrindersModel } from '@/app/lib/generated-models/Grinders'

export interface GrinderFormData {
  name: string
  min_setting: number
  max_setting: number
  step_size: number
  setting_type: string
}

export async function createGrinder(data: GrinderFormData) {
  try {
    const grindersModel = new GrindersModel(db)

    const result = await grindersModel.create({
      name: data.name,
      min_setting: data.min_setting,
      max_setting: data.max_setting,
      step_size: data.step_size,
      setting_type: data.setting_type,
    })

    return { success: true, data: result }
  } catch {
    return { success: false, error: 'Failed to create grinder' }
  }
}

export async function updateGrinder(id: number, data: GrinderFormData) {
  try {
    const grindersModel = new GrindersModel(db)

    const result = await grindersModel.updateById(id, {
      name: data.name,
      min_setting: data.min_setting,
      max_setting: data.max_setting,
      step_size: data.step_size,
      setting_type: data.setting_type,
    })

    return { success: true, data: result }
  } catch {
    return { success: false, error: 'Failed to update grinder' }
  }
}

export async function deleteGrinder(id: number) {
  try {
    const grindersModel = new GrindersModel(db)
    await grindersModel.deleteById(id)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete grinder' }
  }
}
