'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Map, Plus, Bookmark, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const linkClass = (href: string) =>
    `flex flex-col items-center gap-0.5 pt-2 min-w-[52px] ${
      isActive(href) ? 'text-green-500' : 'text-[#555]'
    }`

  const labelClass = (href: string) =>
    `text-[10px] font-medium ${isActive(href) ? 'text-green-500' : 'text-[#555]'}`

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#161616] border-t border-[#222]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end justify-around h-16 px-2">

        <Link href="/" className={linkClass('/')}>
          <Compass size={22} />
          <span className={labelClass('/')}>Odkrywaj</span>
        </Link>

        <Link href="/mapa" className={linkClass('/mapa')}>
          <Map size={22} />
          <span className={labelClass('/mapa')}>Mapa</span>
        </Link>

        <Link href="/dodaj-wydarzenie" className="flex flex-col items-center gap-1 -mt-4">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center"
               style={{ boxShadow: '0 4px 18px rgba(34,197,94,0.45)' }}>
            <Plus size={24} className="text-black" />
          </div>
          <span className="text-[10px] text-[#555]">Dodaj</span>
        </Link>

        <Link href="/zapisane" className={linkClass('/zapisane')}>
          <Bookmark size={22} />
          <span className={labelClass('/zapisane')}>Zapisane</span>
        </Link>

        <Link href="/profil" className={linkClass('/profil')}>
          <User size={22} />
          <span className={labelClass('/profil')}>Profil</span>
        </Link>

      </div>
    </nav>
  )
}