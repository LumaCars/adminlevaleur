import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('reports')
    .select(`
      id, title, type, period_start, period_end,
      file_url, file_name, file_size_mb, status,
      visible_to_client, client_id, contract_id, created_at,
      clients ( first_name, last_name )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[/api/admin/reports] GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reports = (data ?? []).map((row: any) => {
    const clientName = row.clients
      ? `${row.clients.first_name ?? ''} ${row.clients.last_name ?? ''}`.trim()
      : undefined
    return {
      id: String(row.id),
      name: row.title ?? '',
      title: row.title ?? '',
      contractNo: row.contract_id ? String(row.contract_id) : 'Allgemein',
      type: row.type ?? 'Performance',
      date: row.created_at ? new Date(row.created_at).toLocaleDateString('de-AT') : '',
      period: row.period_start
        ? `${fmtDate(row.period_start)} – ${fmtDate(row.period_end)}`
        : '—',
      size: row.file_size_mb ? `${Number(row.file_size_mb).toFixed(1)} MB` : '—',
      status: 'Bereit' as const,
      visible: row.visible_to_client ?? true,
      scope: (row.client_id ? 'Kundenspezifisch' : 'Allgemein') as 'Allgemein' | 'Kundenspezifisch',
      clientId: row.client_id ?? undefined,
      clientName,
      fileUrl: row.file_url ?? undefined,
      fileName: row.file_name ?? undefined,
    }
  })

  return NextResponse.json({ reports })
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const title = form.get('title') as string
    const type = (form.get('type') as string) || 'Performance'
    const period_start = (form.get('period_start') as string) || null
    const period_end = (form.get('period_end') as string) || null
    const client_id = (form.get('client_id') as string) || null
    const contract_id = (form.get('contract_id') as string) || null

    if (!file || !title) {
      return NextResponse.json({ error: 'file and title are required' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const ts = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = client_id
      ? `clients/${client_id}/${ts}_${safeName}`
      : `general/${ts}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('reports')
      .upload(storagePath, arrayBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[/api/admin/reports] Upload error:', uploadError.message)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get signed URL valid for 10 years
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('reports')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)

    if (signedError || !signedData?.signedUrl) {
      console.error('[/api/admin/reports] Signed URL error:', signedError?.message)
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
    }

    const file_size_mb = parseFloat((file.size / 1048576).toFixed(2))

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('reports')
      .insert({
        title,
        type,
        period_start: period_start || null,
        period_end: period_end || null,
        file_url: signedData.signedUrl,
        file_name: file.name,
        file_size_mb,
        client_id: client_id || null,
        contract_id: contract_id || null,
        visible_to_client: true,
        status: 'Verfügbar',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[/api/admin/reports] Insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = inserted as any
    return NextResponse.json({
      report: {
        id: String(row.id),
        name: row.title,
        title: row.title,
        contractNo: row.contract_id ? String(row.contract_id) : 'Allgemein',
        type: row.type,
        date: new Date(row.created_at).toLocaleDateString('de-AT'),
        period: row.period_start ? `${fmtDate(row.period_start)} – ${fmtDate(row.period_end)}` : '—',
        size: `${file_size_mb.toFixed(1)} MB`,
        status: 'Bereit' as const,
        visible: true,
        scope: client_id ? 'Kundenspezifisch' : 'Allgemein',
        clientId: client_id ?? undefined,
        fileUrl: signedData.signedUrl,
        fileName: file.name,
      },
    })
  } catch (err) {
    console.error('[/api/admin/reports] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}
