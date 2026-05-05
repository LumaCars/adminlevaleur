import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const contractId = formData.get('contract_id') as string | null
  const clientId = formData.get('client_id') as string | null
  const fileName = formData.get('file_name') as string | null

  if (!file || !contractId || !clientId) {
    return NextResponse.json({ error: 'file, contract_id und client_id sind erforderlich' }, { status: 400 })
  }

  const name = fileName || file.name
  const safeName = name.replace(/[^a-zA-Z0-9._\-]/g, '_')
  const storagePath = `${clientId}/${contractId}/${Date.now()}_${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('contracts')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    console.error('[upload-document] Storage upload error:', uploadError.message)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Signed URL valid for 10 years
  const { data: signedData, error: signError } = await supabaseAdmin.storage
    .from('contracts')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Signed URL konnte nicht erstellt werden' }, { status: 500 })
  }

  // Insert record in contract_documents table
  const { data: docRecord, error: dbError } = await supabaseAdmin
    .from('contract_documents')
    .insert({
      contract_id: contractId,
      client_id: clientId,
      file_name: safeName,
      file_url: signedData.signedUrl,
    })
    .select()
    .single()

  if (dbError) {
    console.error('[upload-document] DB insert error:', dbError.message)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({
    url: signedData.signedUrl,
    file_name: safeName,
    id: docRecord.id,
  })
}
