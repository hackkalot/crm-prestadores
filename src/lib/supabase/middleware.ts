import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Cookie name for 2FA pending state (must match the one in auth/actions.ts)
const PENDING_2FA_COOKIE = '2fa_pending'

export async function updateSession(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in proxy')
      // Permitir acesso a rotas públicas mesmo sem config
      const publicRoutes = ['/login', '/registar', '/verificar-email', '/esqueci-password', '/reset-password', '/verificar-2fa', '/api/webhooks', '/api/alerts', '/forms']
      const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))
      if (isPublicRoute) {
        return NextResponse.next({ request })
      }
      // Redirecionar para login se não é rota pública
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Rotas públicas (incluindo verificação 2FA)
    const publicRoutes = ['/login', '/registar', '/verificar-email', '/esqueci-password', '/reset-password', '/verificar-2fa', '/api/webhooks', '/api/alerts', '/forms']
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

    // Check for 2FA pending state (format: "userId:method")
    const pending2FAValue = request.cookies.get(PENDING_2FA_COOKIE)?.value
    const [pending2FAUserId, pending2FAMethod] = pending2FAValue?.split(':') || [null, null]

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // If user has a session but 2FA is pending, redirect to verification page
    // (except if they're already on the verification page)
    if (user && pending2FAUserId && !request.nextUrl.pathname.startsWith('/verificar-2fa')) {
      // Redirect to 2FA verification with userId and method
      const url = request.nextUrl.clone()
      url.pathname = '/verificar-2fa'
      url.searchParams.set('uid', pending2FAUserId)
      if (pending2FAMethod) {
        url.searchParams.set('method', pending2FAMethod)
      }
      const returnTo = request.nextUrl.searchParams.get('returnTo') || request.nextUrl.pathname
      if (returnTo !== '/login' && returnTo !== '/verificar-2fa') {
        url.searchParams.set('returnTo', returnTo)
      }
      return NextResponse.redirect(url)
    }

    // Don't redirect to candidaturas if 2FA is pending
    if (user && request.nextUrl.pathname === '/login' && !pending2FAUserId) {
      const url = request.nextUrl.clone()
      url.pathname = '/candidaturas'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Proxy error:', error)
    // Em caso de erro, permitir a request continuar
    return NextResponse.next({ request })
  }
}
