import React from 'react'
import { db } from '../../lib/database'
import { BeansModel } from '../../lib/generated-models/Beans'
import { BeansPageClient } from './BeansPageClient'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const BeansPage = async () => {
  const beansModel = new BeansModel(db)
  const beans = await beansModel.findAll()

  return <BeansPageClient beans={beans} />
}

export default BeansPage
