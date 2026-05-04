import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  const { first_name, last_name, email, phone, account_status } = await req.json()

  const temp_code = Math.floor(100000 + Math.random() * 900000).toString()

  // Step 1: Create auth user — password IS the 6-digit code
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temp_code,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const auth_user_id = authData.user.id

  // Step 2: Insert client record via SQL function
  const { data: clientData, error: clientError } = await supabaseAdmin.rpc(
    'create_client_with_code',
    { auth_user_id, first_name, last_name, email, phone: phone || null, account_status }
  )

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 400 })
  }

  // Step 3: Send welcome email via Edge Function
  console.log('Calling edge function with:', { email, first_name, temp_code })
  const emailRes = await fetch(
    'https://kgjchaliqzjlbmkzqejh.supabase.co/functions/v1/send-welcome-email',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, first_name, last_name, temp_code }),
    }
  )

  const emailBody = await emailRes.text()
  console.log('Edge function response:', emailRes.status, emailBody)

  if (!emailRes.ok) {
    return NextResponse.json({ error: `E-Mail-Versand fehlgeschlagen: ${emailBody}` }, { status: 500 })
  }

  // Step 4: Return success
  return NextResponse.json({ success: true, client_id: clientData, temp_code, email })
}
