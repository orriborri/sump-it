import React from 'react'
import { ShareableBrew } from '../../feedback/ShareableBrew'
import { getBrewDetails } from '../actions'

interface RatePageProps {
  params: { id: string }
}

export default async function RatePage({ params }: RatePageProps) {
  const brewData = await getBrewDetails(parseInt(params.id))

  if (!brewData) {
    return <div>Brew not found</div>
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <ShareableBrew brewData={brewData} />
    </div>
  )
}
