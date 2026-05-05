import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET() {
  console.log('[/api/admin/payouts] Fetching admin_payouts_view')

  const { data, error } = await supabaseAdmin
    .from('admin_payouts_view')
    .select('*')

  if (error) {
    console.error('[/api/admin/payouts] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payouts = (data ?? []).map((row: any) => ({
    id: String(row.id),
    clientName: row.client_name ?? '',
    contractNo: row.contract_no ?? '',
    amount: Number(row.amount ?? 0),
    date: row.date ?? row.due_date ?? row.payout_date ?? '',
    interval: row.interval ?? row.payout_interval ?? 'Jährlich',
    status: row.status ?? 'Ausstehend',
    receipt: row.receipt ?? undefined,
  }))

  console.log('[/api/admin/payouts] Returning', payouts.length, 'payouts')
  return NextResponse.json({ payouts })
}
