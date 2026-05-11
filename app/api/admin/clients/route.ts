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
    capital: parseFloat(row.total_investment) || 0,
    nextPayout: fmtDateStr(row.next_payout_date ?? row.next_payout ?? row.nextpayout),
    notes: row.notes ?? undefined,
    status: 'Aktiv' as const,
  }))

  if (data && data.length > 0) {
    const r = data[0] as Record<string, unknown>
    console.log('[/api/admin/clients] First row keys:', Object.keys(r).join(', '))
    console.log('[/api/admin/clients] First row contract_count:', r.contract_count, 'total_investment:', r.total_investment)
  }
  console.log('[/api/admin/clients] Returning', clients.length, 'clients')
  return NextResponse.json({ clients })
}

export async function PUT(request: Request) {
  const { id, first_name, last_name, phone, account_status, notes } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('clients')
    .update({
      first_name,
      last_name,
      phone: phone || null,
      account_status: account_status || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
