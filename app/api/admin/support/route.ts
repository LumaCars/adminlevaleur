import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET() {
  console.log('[/api/admin/support] Fetching admin_support_view')

  const { data, error } = await supabaseAdmin
    .from('admin_support_view')
    .select('*')

  if (error) {
    console.error('[/api/admin/support] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tickets = (data ?? []).map((row: any) => {
    const rawDate = row.received_at ?? row.created_at ?? ''
    let receivedAt = rawDate
    if (rawDate) {
      try {
        const d = new Date(rawDate)
        receivedAt =
          d.toLocaleDateString('de-AT') +
          ' · ' +
          d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
      } catch {
        receivedAt = rawDate
      }
    }

    const firstName: string = row.first_name ?? ''
    const lastName: string = row.last_name ?? ''
    const clientName: string =
      row.client_name ?? (firstName || lastName ? `${firstName} ${lastName}`.trim() : '')

    return {
      id: String(row.id),
      status: row.status ?? 'Offen',
      contractNo: row.contract_number ?? row.contract_no ?? '',
      clientName,
      firstName,
      lastName,
      email: row.email ?? '',
      subject: row.subject ?? '',
      amount: row.amount ? Number(row.amount) : undefined,
      receivedAt,
      message: row.message ?? undefined,
    }
  })

  console.log('[/api/admin/support] Returning', tickets.length, 'tickets')
  return NextResponse.json({ tickets })
}
