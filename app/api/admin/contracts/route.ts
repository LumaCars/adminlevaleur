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
    no: String(i + 1).padStart(2, '0'),
    contractNo: row.contract_number ?? row.contract_no ?? '',
    clientId: String(row.client_id ?? ''),
    clientName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.client_name || '',
    deposit: Number(row.investment_amount ?? row.deposit ?? 0),
    yieldPa: Number(row.rendite_pa ?? row.yield_pa ?? 0),
    interval: row.payout_interval ?? row.interval ?? 'Jährlich',
    startYear: Number(
      row.contract_start_date
        ? new Date(row.contract_start_date).getFullYear()
        : new Date().getFullYear()
    ),
    durationYears: Number(row.duration_years ?? 1),
    endYear: Number(
      row.contract_end_date
        ? new Date(row.contract_end_date).getFullYear()
        : new Date().getFullYear() + 1
    ),
    status: row.status ?? 'In Vorbereitung',
    pdfUrl: row.pdf_url ?? undefined,
    startDate: row.contract_start_date ?? undefined,
    endDate: row.contract_end_date ?? undefined,
  }))

  console.log('[/api/admin/contracts] Returning', contracts.length, 'contracts')
  return NextResponse.json({ contracts })
}

export async function POST(req: NextRequest) {
  console.log('[/api/admin/contracts] POST — creating new contract')

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const {
    client_id,
    contract_number,
    investment_amount,
    rendite_pa,
    duration_years,
    payout_interval,
    capital_received_date,
    portfolio_allocation,
    status,
  } = body as {
    client_id: string
    contract_number: string
    investment_amount: number
    rendite_pa: number
    duration_years: number
    payout_interval: string
    capital_received_date: string
    portfolio_allocation: Record<string, number>
    status: string
  }

  if (!client_id || !contract_number || !capital_received_date) {
    return NextResponse.json({ error: 'Pflichtfelder fehlen: client_id, contract_number, capital_received_date' }, { status: 400 })
  }

  // Calculate dates server-side
  const kapDate = new Date(capital_received_date)
  const startDate = new Date(kapDate)
  startDate.setDate(startDate.getDate() + 30)

  const endDate = new Date(startDate)
  endDate.setFullYear(endDate.getFullYear() + Number(duration_years))

  let firstPayoutDate: Date
  if (payout_interval === 'Halbjährlich') {
    firstPayoutDate = new Date(startDate)
    firstPayoutDate.setMonth(firstPayoutDate.getMonth() + 6)
    firstPayoutDate.setDate(firstPayoutDate.getDate() + 30)
  } else if (payout_interval === 'Endfällig') {
    firstPayoutDate = new Date(endDate)
    firstPayoutDate.setDate(firstPayoutDate.getDate() + 30)
  } else {
    // Jährlich
    firstPayoutDate = new Date(startDate)
    firstPayoutDate.setFullYear(firstPayoutDate.getFullYear() + 1)
    firstPayoutDate.setDate(firstPayoutDate.getDate() + 30)
  }

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  console.log('[/api/admin/contracts] Calculated dates:', {
    capital_received_date,
    contract_start_date: fmt(startDate),
    first_payout_date: fmt(firstPayoutDate),
    contract_end_date: fmt(endDate),
  })

  // Insert contract
  const { data: insertData, error: insertError } = await supabaseAdmin
    .from('contracts')
    .insert({
      client_id,
      contract_number,
      investment_amount: Number(investment_amount),
      rendite_pa: Number(rendite_pa),
      duration_years: Number(duration_years),
      payout_interval,
      capital_received_date,
      contract_start_date: fmt(startDate),
      first_payout_date: fmt(firstPayoutDate),
      contract_end_date: fmt(endDate),
      portfolio_allocation: portfolio_allocation ?? {},
      status: status ?? 'In Vorbereitung',
    })
    .select()
    .single()

  if (insertError) {
    console.error('[/api/admin/contracts] Insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  console.log('[/api/admin/contracts] Contract created:', insertData.id)

  // Generate payout schedule
  const { error: rpcError } = await supabaseAdmin.rpc('generate_payout_schedule', {
    p_contract_id: insertData.id,
  })

  if (rpcError) {
    console.error('[/api/admin/contracts] generate_payout_schedule error:', rpcError.message)
    // Non-fatal — contract is created, payouts can be generated later
  } else {
    console.log('[/api/admin/contracts] Payout schedule generated')
  }

  return NextResponse.json({ contract: insertData }, { status: 201 })
}
