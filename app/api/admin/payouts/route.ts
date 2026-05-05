import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contractId = searchParams.get('contract_id')

  console.log('[/api/admin/payouts] Fetching', contractId ? `for contract ${contractId}` : 'all')

  let query = supabaseAdmin.from('admin_payouts_view').select('*')
  if (contractId) query = query.eq('contract_id', contractId)

  const { data, error } = await query

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
    date: row.date ?? row.due_date ?? row.payout_date ?? row.scheduled_date ?? '',
    interval: row.interval ?? row.payout_interval ?? 'Jährlich',
    status: row.status ?? 'Ausstehend',
    receipt: row.receipt ?? undefined,
  }))

  console.log('[/api/admin/payouts] Returning', payouts.length, 'payouts')
  return NextResponse.json({ payouts })
}
