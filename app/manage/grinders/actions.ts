"use server";

import { db } from '@/app/lib/database';
import { GrindersModel } from '@/app/lib/generated-models';
import { redirect } from 'next/navigation';

export interface GrinderFormData {
  name: string;
  min_setting: number;
  max_setting: number;
  step_size: number;
  setting_type: string;
}

export async function createGrinder(data: GrinderFormData) {
  try {
    const grindersModel = new GrindersModel(db);
    
    await grindersModel.create({
      name: data.name,
      min_setting: data.min_setting,
      max_setting: data.max_setting,
      step_size: data.step_size,
      setting_type: data.setting_type
    });

    redirect('/manage/grinders');
  } catch (error) {
    console.error('Error creating grinder:', error);
    throw new Error('Failed to create grinder');
  }
}

export async function updateGrinder(id: number, data: GrinderFormData) {
  try {
    const grindersModel = new GrindersModel(db);
    
    await grindersModel.update(id, {
      name: data.name,
      min_setting: data.min_setting,
      max_setting: data.max_setting,
      step_size: data.step_size,
      setting_type: data.setting_type
    });

    redirect('/manage/grinders');
  } catch (error) {
    console.error('Error updating grinder:', error);
    throw new Error('Failed to update grinder');
  }
}

export async function deleteGrinder(id: number) {
  try {
    const grindersModel = new GrindersModel(db);
    await grindersModel.delete(id);
    redirect('/manage/grinders');
  } catch (error) {
    console.error('Error deleting grinder:', error);
    throw new Error('Failed to delete grinder');
  }
}
