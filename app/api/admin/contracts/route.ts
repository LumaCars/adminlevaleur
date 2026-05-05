import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET() {
  console.log('[/api/admin/contracts] Fetching admin_contracts_view')

  const { data, error } = await supabaseAdmin
    .from('admin_contracts_view')
    .select('*')

  if (error) {
    console.error('[/api/admin/contracts] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = (data ?? []).map((row: any, i: number) => ({
    id: String(row.id ?? i),
    no: row.no ?? String(i + 1).padStart(2, '0'),
    contractNo: row.contract_no ?? row.contract_number ?? row.contractno ?? '',
    clientId: String(row.client_id ?? ''),
    clientName: row.client_name ?? '',
    deposit: Number(row.deposit ?? row.investment_amount ?? 0),
    yieldPa: Number(row.yield_pa ?? row.yield_rate ?? 0),
    interval: row.interval ?? row.payout_interval ?? 'Jährlich',
    startYear: Number(row.start_year ?? new Date().getFullYear()),
    durationYears: Number(row.duration_years ?? row.duration ?? 1),
    endYear: Number(row.end_year ?? (new Date().getFullYear() + 1)),
    status: row.status ?? 'In Vorbereitung',
    pdfUrl: row.pdf_url ?? undefined,
  }))

  console.log('[/api/admin/contracts] Returning', contracts.length, 'contracts')
  return NextResponse.json({ contracts })
}
