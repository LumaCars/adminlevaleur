import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')

  console.log('[/api/admin/contracts] Fetching admin_contracts_view', { clientId })

  let query = supabaseAdmin.from('admin_contracts_view').select('*')
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query

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
    deposit: Number(row.deposit ?? row.investment_amount ?? row.total_investment ?? 0),
    yieldPa: Number(row.yield_pa ?? row.rendite_pa ?? row.yield_rate ?? 0),
    interval: row.interval ?? row.payout_interval ?? 'Jährlich',
    startYear: Number(row.start_year ?? (row.contract_start_date ? new Date(row.contract_start_date).getFullYear() : new Date().getFullYear())),
    durationYears: Number(row.duration_years ?? row.duration ?? 1),
    endYear: Number(row.end_year ?? (row.contract_end_date ? new Date(row.contract_end_date).getFullYear() : new Date().getFullYear() + 1)),
    status: row.status ?? 'In Vorbereitung',
    pdfUrl: row.pdf_url ?? undefined,
    startDate: row.contract_start_date ?? row.start_date ?? undefined,
    endDate: row.contract_end_date ?? row.end_date ?? undefined,
  }))

  console.log('[/api/admin/contracts] Returning', contracts.length, 'contracts')
  return NextResponse.json({ contracts })
}
