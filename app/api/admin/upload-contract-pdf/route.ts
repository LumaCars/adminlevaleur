import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const client_id = formData.get('client_id') as string | null
  const contract_number = formData.get('contract_number') as string | null

  if (!file || !client_id || !contract_number) {
    return NextResponse.json(
      { error: 'file, client_id und contract_number sind erforderlich' },
      { status: 400 },
    )
  }

  const path = `${client_id}/${contract_number}.pdf`
  console.log('[upload-contract-pdf] Uploading to bucket "contracts", path:', path)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('contracts')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    console.error('[upload-contract-pdf] Upload failed:', uploadError.message)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  console.log('[upload-contract-pdf] Upload OK — generating signed URL')

  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('contracts')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  if (signedError) {
    console.error('[upload-contract-pdf] Signed URL failed:', signedError.message)
    return NextResponse.json({ error: signedError.message }, { status: 500 })
  }

  console.log('[upload-contract-pdf] Success — pdf_url:', signedData.signedUrl)
  return NextResponse.json({ success: true, pdf_url: signedData.signedUrl, path })
}
