'use server'

import { revalidatePath } from 'next/cache'
import { db } from '../../lib/database'
import { BeansModel } from '../../lib/generated-models/Beans'

/** Permanently deletes a coffee bean by ID and revalidates the beans page. */
export async function deleteBean(id: number) {
  const beansModel = new BeansModel(db)
  await beansModel.deleteById(id)
  revalidatePath('/manage/beans')
}
