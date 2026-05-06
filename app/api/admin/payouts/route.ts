import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contractId = searchParams.get('contract_id')
  const summary = searchParams.get('summary') === 'true'

  if (summary) {
    const { data, error } = await supabaseAdmin.from('payouts').select('amount, status, scheduled_date')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    let total_paid = 0
    let current_month_due = 0
    let overdue = 0

    for (const row of data ?? []) {
      const amount = parseFloat(String(row.amount)) || 0
      if (row.status === 'Ausgezahlt') {
        total_paid += amount
      } else if (row.status === 'Ausstehend') {
        const d = new Date(row.scheduled_date)
        if (d < today) {
          overdue += amount
        } else if (d >= monthStart && d <= monthEnd) {
          current_month_due += amount
        }
      }
    }

    return NextResponse.json({ total_paid, current_month_due, overdue })
  }

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
    clientName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.client_name || '',
    contractNo: row.contract_number ?? row.contract_no ?? '',
    amount: parseFloat(String(row.amount ?? 0)) || 0,
    date: row.scheduled_date ?? row.paid_date ?? row.date ?? '',
    interval: row.payout_interval ?? row.interval ?? 'Jährlich',
    status: row.status ?? 'Ausstehend',
    receipt: row.proof_link ?? row.receipt ?? undefined,
  }))

  console.log('[/api/admin/payouts] Returning', payouts.length, 'payouts')
  return NextResponse.json({ payouts })
}
