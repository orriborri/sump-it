'use server'

import { db } from '../lib/database'
import { BeansModel } from '../lib/generated-models/Beans'
import { MethodsModel } from '../lib/generated-models/Methods'
import { GrindersModel } from '../lib/generated-models/Grinders'

/** Form data for creating a new coffee bean entry */
export interface BeanFormData {
  name: string
  roster?: string
  rostery?: string
  roast_level?: string
}

/** Form data for creating a new brew method entry */
export interface MethodFormData {
  name: string
}

/** Form data for creating a new grinder entry (simplified version) */
export interface GrinderFormData {
  name: string
}

/**
 * Creates a new coffee bean entry in the database
 * @param data - The bean form data containing name, roster, roastery, and roast level
 * @returns The newly created bean record
 */
export async function addBean(data: BeanFormData) {
  const beansModel = new BeansModel(db)
  return await beansModel.create(data)
}

/**
 * Creates a new brew method entry in the database
 * @param data - The method form data containing the method name
 * @returns The newly created method record
 */
export async function addMethod(data: MethodFormData) {
  const methodsModel = new MethodsModel(db)
  return await methodsModel.create(data)
}

/**
 * Creates a new grinder entry in the database with a simplified form
 * @param data - The grinder form data containing the grinder name
 * @returns The newly created grinder record
 */
export async function addGrinder(data: GrinderFormData) {
  const grindersModel = new GrindersModel(db)
  return await grindersModel.create(data)
}

/**
 * Retrieves all coffee bean records from the database
 * @returns Array of all bean records
 */
export async function getBeans() {
  const beansModel = new BeansModel(db)
  return await beansModel.findAll()
}

/**
 * Retrieves all brew method records from the database
 * @returns Array of all method records
 */
export async function getMethods() {
  const methodsModel = new MethodsModel(db)
  return await methodsModel.findAll()
}

/**
 * Retrieves all grinder records from the database
 * @returns Array of all grinder records
 */
export async function getGrinders() {
  const grindersModel = new GrindersModel(db)
  return await grindersModel.findAll()
}

/**
 * Deletes a brew method by ID after verifying it is not used in any existing brews
 * @param id - The ID of the method to delete
 * @throws Error if the method is currently referenced by existing brew records
 */
export async function deleteMethod(id: number) {
  const methodsModel = new MethodsModel(db)
  
  // Check if method is used in any brews
  const brewsUsingMethod = await db
    .selectFrom('brews')
    .where('method_id', '=', id)
    .select('id')
    .executeTakeFirst()
  
  if (brewsUsingMethod) {
    throw new Error('Cannot delete method that is used in existing brews')
  }
  
  return await methodsModel.deleteById(id)
}
