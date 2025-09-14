import React from 'react'
import { db } from '../../lib/database'
import { MethodsModel } from '../../lib/generated-models/Methods'
import { MethodsPageClient } from './MethodsPageClient'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const MethodsPage = async () => {
  const methodsModel = new MethodsModel(db)
  const methods = await methodsModel.findAll()

  return <MethodsPageClient methods={methods} />
}

export default MethodsPage
