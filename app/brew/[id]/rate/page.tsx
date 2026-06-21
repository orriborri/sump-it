import React from 'react'
import { ShareableBrew } from '../../feedback/ShareableBrew'
import { getBrewDetails } from '../actions'

interface RatePageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function RatePage({ params, searchParams }: RatePageProps) {
  const { id } = await params
  const searchParamsResolved = searchParams ? await searchParams : {}
  const brewData = await getBrewDetails(parseInt(id))

  if (!brewData) {
    return <div>Brew not found</div>
  }

  const brewTimeParam = searchParamsResolved.brew_time
  const brewTimeStr = Array.isArray(brewTimeParam) ? brewTimeParam[0] : brewTimeParam
  const brewTime = brewTimeStr ? parseInt(brewTimeStr, 10) : undefined
  const validBrewTime = brewTime !== undefined && !isNaN(brewTime) ? brewTime : undefined

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <ShareableBrew brewData={brewData} brewTime={validBrewTime} />
    </div>
  )
}
