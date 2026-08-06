'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Map, PlusCircle, Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'

export default function BottomNav() {
  const pathname = usePathname()
  const { count } = useFavorites()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  // Wszystkie taby mają teraz JEDEN styl. Wcześniej „Dodaj" był wypukłym zielonym kołem,
  // co przy 4 pozycjach rozwalało symetrię paska.
  const linkClass = (href: string) =>
    `flex flex-col items-center gap-0.5 flex-1 pt-2 ${
      isActive(href) ? 'text-green-500' : 'text-[#555]'
    }`

  const labelClass = (href: string) =>
    `text-[10px] font-medium ${isActive(href) ? 'text-green-500' : 'text-[#555]'}`

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#161616] border-t border-[#222]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 px-2">

        {/* Odkrywaj */}
        <Link href="/" className={linkClass('/')}>
          <Compass size={22} />
          <span className={labelClass('/')}>Odkrywaj</span>
        </Link>

        {/* Ulubione — licznik zapisanych (localStorage) */}
        <Link href="/ulubione" className={linkClass('/ulubione')}>
          <div className="relative">
            <Heart size={22} className={isActive('/ulubione') ? 'fill-current' : ''} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </div>
          <span className={labelClass('/ulubione')}>Ulubione</span>
        </Link>

        {/* Dodaj — teraz zwykły tab, spójny z resztą */}
        <Link href="/dodaj-wydarzenie" className={linkClass('/dodaj-wydarzenie')}>
          <PlusCircle size={22} />
          <span className={labelClass('/dodaj-wydarzenie')}>Dodaj</span>
        </Link>

        {/* Mapa */}
        <Link href="/mapa" className={linkClass('/mapa')}>
          <Map size={22} />
          <span className={labelClass('/mapa')}>Mapa</span>
        </Link>

      </div>
    </nav>
  )
}