import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { first_name, last_name, email, phone, account_status } = body

  console.log('[create-client] Request received', { first_name, last_name, email, account_status })

  const temp_code = Math.floor(100000 + Math.random() * 900000).toString()
  console.log('[create-client] Generated temp_code:', temp_code)

  // Step 1: Create auth user — password IS the 6-digit code
  console.log('[create-client] Step 1: Creating auth user', { email })
  let auth_user_id: string
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temp_code,
      email_confirm: true,
    })
    if (authError) {
      console.error('[create-client] Step 1 FAILED:', authError.message, authError)
      return NextResponse.json({ error: `Auth-Fehler: ${authError.message}` }, { status: 400 })
    }
    auth_user_id = authData.user.id
    console.log('[create-client] Step 1 OK — auth_user_id:', auth_user_id)
  } catch (err) {
    console.error('[create-client] Step 1 exception:', err)
    return NextResponse.json({ error: `Auth-Exception: ${String(err)}` }, { status: 500 })
  }

  // Step 2: Insert client record via SQL function
  console.log('[create-client] Step 2: Calling RPC create_client_with_code', {
    auth_user_id, first_name, last_name, email, phone, account_status,
  })
  let client_id: string
  try {
    const { data: clientData, error: clientError } = await supabaseAdmin.rpc(
      'create_client_with_code',
      { auth_user_id, first_name, last_name, email, phone: phone || null, account_status },
    )
    if (clientError) {
      console.error('[create-client] Step 2 FAILED:', clientError.message, clientError)
      return NextResponse.json({ error: `DB-Fehler: ${clientError.message}` }, { status: 400 })
    }
    client_id = clientData
    console.log('[create-client] Step 2 OK — client_id:', client_id)
  } catch (err) {
    console.error('[create-client] Step 2 exception:', err)
    return NextResponse.json({ error: `DB-Exception: ${String(err)}` }, { status: 500 })
  }

  // Step 3: Send welcome email via Edge Function
  console.log('[create-client] Step 3: Calling edge function send-welcome-email', { email, first_name, temp_code })
  try {
    const emailRes = await fetch(
      'https://kgjchaliqzjlbmkzqejh.supabase.co/functions/v1/send-welcome-email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, first_name, last_name, temp_code }),
      },
    )
    const emailBody = await emailRes.text()
    console.log('[create-client] Step 3 response:', emailRes.status, emailBody)
    if (!emailRes.ok) {
      return NextResponse.json(
        { error: `E-Mail-Fehler (${emailRes.status}): ${emailBody}` },
        { status: 500 },
      )
    }
  } catch (err) {
    console.error('[create-client] Step 3 exception:', err)
    return NextResponse.json({ error: `E-Mail-Exception: ${String(err)}` }, { status: 500 })
  }

  console.log('[create-client] All steps OK — returning success', { client_id, email })
  return NextResponse.json({ success: true, client_id, temp_code, email })
}
