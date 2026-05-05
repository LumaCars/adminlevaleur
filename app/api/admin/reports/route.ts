import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET() {
  console.log('[/api/admin/reports] Fetching reports table')

  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('[/api/admin/reports] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reports = (data ?? []).map((row: any) => ({
    id: String(row.id),
    name: row.name ?? '',
    contractNo: row.contract_no ?? '',
    type: row.type ?? 'Performance',
    date: row.date ?? '',
    period: row.period ?? '',
    size: row.size ?? '—',
    status: row.status ?? 'Bereit',
    visible: row.visible ?? true,
    scope: row.scope ?? 'Allgemein',
    clientId: row.client_id ?? undefined,
    clientName: row.client_name ?? undefined,
  }))

  console.log('[/api/admin/reports] Returning', reports.length, 'reports')
  return NextResponse.json({ reports })
}
