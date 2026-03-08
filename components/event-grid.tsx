"use client"

import { useState, useEffect } from "react"
import { Calendar, MapPin, Users, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

interface Event {
  id: string
  title: string
  start_date: string
  city: string
  venue: string
  image: string
  category: string
}

export default function EventGrid() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Błąd:', error)
      } else {
        setEvents(data || [])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [])

  if (loading) return <p style={{ padding: '2rem' }}>Ładowanie wydarzeń...</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {events.map((event) => (
        <div key={event.id} className="border rounded-xl p-4 shadow-sm">
          <h2 className="text-xl font-bold">{event.title}</h2>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-2">
            <Calendar size={14} />
            {new Date(event.start_date).toLocaleDateString('pl-PL')}
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <MapPin size={14} />
            {event.city}
          </p>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
            {event.category}
          </span>
        </div>
      ))}
    </div>
  )
}