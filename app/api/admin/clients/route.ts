import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

function fmtDateStr(d: string | Date | null | undefined): string | undefined {
  if (!d) return undefined
  const date = new Date(d)
  if (isNaN(date.getTime())) return String(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

export async function GET() {
  console.log('[/api/admin/clients] Fetching admin_clients_view')

  const { data, error } = await supabaseAdmin
    .from('admin_clients_view')
    .select('*')

  if (error) {
    console.error('[/api/admin/clients] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients = (data ?? []).map((row: any, i: number) => ({
    id: String(row.id ?? i),
    initials: ((row.first_name?.[0] ?? '') + (row.last_name?.[0] ?? '')).toUpperCase() || '??',
    name: row.full_name ?? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? '',
    phone: row.phone ?? undefined,
    premium: ['Premium', 'VIP'].includes(row.account_status ?? row.tier ?? ''),
    tier: row.account_status ?? row.tier,
    // Try all plausible column names the view might use
    contractsCount: Number(
      row.contract_count ?? row.contracts_count ?? row.contract_count_active ?? 0
    ),
    capital: Number(
      row.total_investment ?? row.total_capital ?? row.capital ?? row.investment_total ?? 0
    ),
    nextPayout: fmtDateStr(row.next_payout_date ?? row.next_payout ?? row.nextpayout),
    notes: row.notes ?? undefined,
    status: 'Aktiv' as const,
  }))

  console.log('[/api/admin/clients] Returning', clients.length, 'clients')
  return NextResponse.json({ clients })
}
