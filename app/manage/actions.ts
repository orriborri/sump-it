'use server'

import { db } from '../lib/database'
import { BeansModel } from '../lib/generated-models/Beans'
import { MethodsModel } from '../lib/generated-models/Methods'
import { GrindersModel } from '../lib/generated-models/Grinders'

export interface BeanFormData {
  name: string
  roster?: string
  rostery?: string
  roast_level?: string
}

export interface MethodFormData {
  name: string
}

export interface GrinderFormData {
  name: string
}

export async function addBean(data: BeanFormData) {
  const beansModel = new BeansModel(db)
  return await beansModel.create(data)
}

export async function addMethod(data: MethodFormData) {
  const methodsModel = new MethodsModel(db)
  return await methodsModel.create(data)
}

export async function addGrinder(data: GrinderFormData) {
  const grindersModel = new GrindersModel(db)
  return await grindersModel.create(data)
}

// Actions to get existing items for validation
export async function getBeans() {
  const beansModel = new BeansModel(db)
  return await beansModel.findAll()
}

export async function getMethods() {
  const methodsModel = new MethodsModel(db)
  return await methodsModel.findAll()
}

export async function getGrinders() {
  const grindersModel = new GrindersModel(db)
  return await grindersModel.findAll()
}
