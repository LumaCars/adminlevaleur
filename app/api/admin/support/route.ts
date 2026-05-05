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
  const tickets = (data ?? []).map((row: any) => ({
    id: String(row.id),
    status: row.status ?? 'Offen',
    contractNo: row.contract_no ?? '',
    clientName: row.client_name ?? '',
    subject: row.subject ?? '',
    amount: row.amount ? Number(row.amount) : undefined,
    receivedAt: row.received_at ?? row.created_at ?? '',
    message: row.message ?? undefined,
  }))

  console.log('[/api/admin/support] Returning', tickets.length, 'tickets')
  return NextResponse.json({ tickets })
}
