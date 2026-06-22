'use server'

import { db } from '../lib/database'
import { BeansModel } from '../lib/generated-models/Beans'
import { MethodsModel } from '../lib/generated-models/Methods'
import { GrindersModel } from '../lib/generated-models/Grinders'

/** Form data for creating a new coffee bean entry. */
export interface BeanFormData {
  name: string
  roster?: string
  rostery?: string
  roast_level?: string
}

/** Form data for creating a new brewing method. */
export interface MethodFormData {
  name: string
}

/** Form data for creating a new grinder (simplified, name only). */
export interface GrinderFormData {
  name: string
}

/** Creates a new coffee bean entry in the database. */
export async function addBean(data: BeanFormData) {
  const beansModel = new BeansModel(db)
  return await beansModel.create(data)
}

/** Creates a new brewing method entry in the database. */
export async function addMethod(data: MethodFormData) {
  const methodsModel = new MethodsModel(db)
  return await methodsModel.create(data)
}

/** Creates a new grinder entry in the database. */
export async function addGrinder(data: GrinderFormData) {
  const grindersModel = new GrindersModel(db)
  return await grindersModel.create(data)
}

/** Retrieves all coffee beans from the database. */
export async function getBeans() {
  const beansModel = new BeansModel(db)
  return await beansModel.findAll()
}

/** Retrieves all brewing methods from the database. */
export async function getMethods() {
  const methodsModel = new MethodsModel(db)
  return await methodsModel.findAll()
}

/** Retrieves all grinders from the database. */
export async function getGrinders() {
  const grindersModel = new GrindersModel(db)
  return await grindersModel.findAll()
}

/** Deletes a brewing method by ID, throwing if it is referenced by existing brews. */
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
