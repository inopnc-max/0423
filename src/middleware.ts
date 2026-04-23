import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROUTES } from '@/lib/routes'
import { getSupabasePublicConfig } from '@/lib/supabase/config'

export async function middleware(request: NextRequest) {
  const { url, publishableKey } = getSupabasePublicConfig()

  let response = NextResponse.next({ request })

  const supabase = createSupabaseServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options as { [key: string]: unknown } | undefined)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if ([ROUTES.login, ROUTES.register].some(route => pathname.startsWith(route))) {
    if (user) return NextResponse.redirect(new URL(ROUTES.home, request.url))
    return NextResponse.next()
  }

  if (!user) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url))
  }

  if (pathname.startsWith(ROUTES.admin)) {
    const { data } = await supabase.from('workers').select('role').eq('id', user.id).single()

    const resolvedRole =
      typeof data?.role === 'string'
        ? data.role
        : typeof user.user_metadata?.role === 'string'
          ? user.user_metadata.role
          : ''

    if (resolvedRole !== 'admin') {
      return NextResponse.redirect(new URL(ROUTES.home, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
