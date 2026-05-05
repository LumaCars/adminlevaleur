import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

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
    contractsCount: Number(row.contracts_count ?? 0),
    capital: Number(row.total_capital ?? row.capital ?? 0),
    nextPayout: row.next_payout_date ?? row.next_payout ?? undefined,
    notes: row.notes ?? undefined,
    status: (row.status === 'active' || row.status === 'Aktiv') ? 'Aktiv' : 'Inaktiv',
  }))

  console.log('[/api/admin/clients] Returning', clients.length, 'clients')
  return NextResponse.json({ clients })
}
