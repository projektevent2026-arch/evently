'use client'

import { useEffect, useState } from 'react'
import MobileEventDetail from '@/components/MobileEventDetail'
import EventPageClient from '@/components/EventPageClient'

export default function EventDetailWrapper({ slug }: { slug: string }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile === null) return <div className="min-h-screen bg-[#0a0a0a]" />
  if (isMobile) return <MobileEventDetail slug={slug} />
  return <EventPageClient slug={slug} />
}