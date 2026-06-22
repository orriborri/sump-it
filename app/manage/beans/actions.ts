'use server'

import { revalidatePath } from 'next/cache'
import { db } from '../../lib/database'
import { BeansModel } from '../../lib/generated-models/Beans'

/**
 * Server action to permanently delete a coffee bean from the database.
 * Revalidates the beans page cache after deletion.
 * @param id - The ID of the bean to delete
 */
export async function deleteBean(id: number) {
  const beansModel = new BeansModel(db)
  await beansModel.deleteById(id)
  revalidatePath('/manage/beans')
}
