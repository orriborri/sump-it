"use server";

import { db } from "../lib/database";

export interface BeanFormData {
  name: string;
  roster: string;
  rostery: string;
}

export interface MethodFormData {
  name: string;
}

export interface GrinderFormData {
  name: string;
}

export async function addBean(data: BeanFormData) {
  return await db.insertInto("beans").values(data).execute();
}

export async function addMethod(data: MethodFormData) {
  return await db.insertInto("methods").values(data).execute();
}

export async function addGrinder(data: GrinderFormData) {
  return await db.insertInto("grinders").values(data).execute();
}

// Actions to get existing items for validation
export async function getBeans() {
  return await db.selectFrom("beans").selectAll().execute();
}

export async function getMethods() {
  return await db.selectFrom("methods").selectAll().execute();
}

export async function getGrinders() {
  return await db.selectFrom("grinders").selectAll().execute();
}
