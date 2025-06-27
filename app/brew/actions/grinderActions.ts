"use server";

import { db } from '@/app/lib/database';
import { GrindersModel } from '@/app/lib/generated-models/Grinders';

export interface GrinderSettings {
  id: number;
  name: string;
  min_setting: number;
  max_setting: number;
  step_size: number;
  setting_type: string;
}

export async function getGrinderSettings(grinderId: string): Promise<GrinderSettings | null> {
  try {
    const grindersModel = new GrindersModel(db);
    const grinder = await grindersModel.findById(parseInt(grinderId));
    
    if (!grinder) {
      return null;
    }

    return {
      id: grinder.id,
      name: grinder.name || 'Unknown Grinder',
      min_setting: grinder.min_setting || 1,
      max_setting: grinder.max_setting || 40,
      step_size: grinder.step_size || 1.0,
      setting_type: grinder.setting_type || 'numeric'
    };
  } catch (error) {
    console.error('Error fetching grinder settings:', error);
    return null;
  }
}
