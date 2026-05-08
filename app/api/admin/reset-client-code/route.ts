import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  let body: { client_id?: string; email?: string; first_name?: string; last_name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const { client_id, email, first_name = '', last_name = '' } = body

  if (!client_id || !email) {
    return NextResponse.json({ error: 'client_id und email sind erforderlich' }, { status: 400 })
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString()

  console.log('[reset-client-code] Step 1: Updating auth password for', email)
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(client_id, {
    password: newCode,
  })
  if (authError) {
    console.error('[reset-client-code] Auth update error:', authError.message)
    return NextResponse.json({ error: `Auth-Fehler: ${authError.message}` }, { status: 500 })
  }

  console.log('[reset-client-code] Step 2: Updating temp_code in clients table')
  const { error: dbError } = await supabaseAdmin
    .from('clients')
    .update({
      temp_code: newCode,
      temp_code_created_at: new Date().toISOString(),
      force_password_change: true,
    })
    .eq('id', client_id)
  if (dbError) {
    console.error('[reset-client-code] DB update error:', dbError.message)
    return NextResponse.json({ error: `DB-Fehler: ${dbError.message}` }, { status: 500 })
  }

  console.log('[reset-client-code] Step 3: Sending welcome email to', email)
  const emailRes = await fetch(
    'https://kgjchaliqzjlbmkzqejh.supabase.co/functions/v1/send-welcome-email',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, first_name, last_name, temp_code: newCode }),
    }
  )
  const emailBody = await emailRes.text()
  console.log('[reset-client-code] Step 3 response:', emailRes.status, emailBody)

  if (!emailRes.ok) {
    console.error('[reset-client-code] Email send failed:', emailBody)
  }

  // Close any open RESET-REQUEST support tickets for this client
  console.log('[reset-client-code] Step 4: Closing open reset support tickets')
  await supabaseAdmin
    .from('support_requests')
    .update({ status: 'Gelöst' })
    .eq('client_id', client_id)
    .eq('contract_number', 'RESET-REQUEST')
    .neq('status', 'Gelöst')

  if (!emailRes.ok) {
    return NextResponse.json({
      success: true,
      temp_code: newCode,
      warning: `Code gesetzt, E-Mail fehlgeschlagen: ${emailBody}`,
    })
  }

  return NextResponse.json({ success: true, temp_code: newCode })
}
