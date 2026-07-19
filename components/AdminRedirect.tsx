'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Wrzucony na /dodaj-wydarzenie: jeśli zalogowany user ma rolę admin/moderator,
 * przerzuca go na panel zamiast publicznego formularza. Nic nie renderuje.
 */
export default function AdminRedirect() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return

      supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profile }) => {
          if (cancelled) return
          if (profile?.role === 'admin' || profile?.role === 'moderator') {
            router.replace('/admin/wydarzenia')
          }
        })
    })

    return () => {
      cancelled = true
    }
  }, [router])

  return null
}