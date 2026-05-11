import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json()

  if (!email || !pin) {
    return NextResponse.json({ error: 'E-Mail und PIN erforderlich' }, { status: 400 })
  }

  // Check whitelist first
  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id, email, name, role')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!admin) {
    return NextResponse.json({ error: 'Kein Zugang' }, { status: 403 })
  }

  const response = NextResponse.json({ success: true, admin })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
  if (error) {
    return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
  }

  return response
}
