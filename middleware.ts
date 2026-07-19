import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isAdminPath = path.startsWith("/admin")
  const isAddPath = path.startsWith("/dodaj-wydarzenie")

  if (!isAdminPath && !isAddPath) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // /dodaj-wydarzenie: publiczne dla wszystkich, ale admin leci do panelu.
  if (isAddPath) {
    if (!session) return res

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profile?.role === "admin" || profile?.role === "moderator") {
      return NextResponse.redirect(new URL("/admin", req.url))
    }

    return res
  }

  // /admin: bez zmian — wymaga sesji i roli.
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return res
}

export const config = {
  matcher: ["/admin/:path*", "/dodaj-wydarzenie/:path*", "/dodaj-wydarzenie"],
}