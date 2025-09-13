'use server'

import { db } from '../lib/database'
import { BeansModel } from '../lib/generated-models/Beans'
import { MethodsModel } from '../lib/generated-models/Methods'
import { GrindersModel } from '../lib/generated-models/Grinders'

export interface BeanFormData {
  name: string
  roster?: string
  rostery?: string
}

export interface MethodFormData {
  name: string
}

export interface GrinderFormData {
  name: string
}

// Initialize models
const beansModel = new BeansModel(db)
const methodsModel = new MethodsModel(db)
const grindersModel = new GrindersModel(db)

export async function addBean(data: BeanFormData) {
  return await beansModel.create(data)
}

export async function addMethod(data: MethodFormData) {
  return await methodsModel.create(data)
}

export async function addGrinder(data: GrinderFormData) {
  return await grindersModel.create(data)
}

// Actions to get existing items for validation
export async function getBeans() {
  return await beansModel.findAll()
}

export async function getMethods() {
  return await methodsModel.findAll()
}

export async function getGrinders() {
  return await grindersModel.findAll()
}
