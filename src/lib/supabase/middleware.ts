import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in proxy')
      // Permitir acesso a rotas públicas mesmo sem config
      const publicRoutes = ['/login', '/registar', '/verificar-email', '/esqueci-password', '/reset-password', '/api/webhooks', '/api/alerts', '/forms']
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

    // Rotas públicas
    const publicRoutes = ['/login', '/registar', '/verificar-email', '/esqueci-password', '/reset-password', '/api/webhooks', '/api/alerts', '/forms']
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && request.nextUrl.pathname === '/login') {
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
