'use client'

import dynamic from 'next/dynamic'

const EventMap = dynamic(() => import('@/components/EventMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Ładowanie mapy…</p>
      </div>
    </div>
  ),
})

export default function MapaPage() {
  return <EventMap />
}