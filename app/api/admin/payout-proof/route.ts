import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const payoutId = form.get('payout_id') as string | null

  if (!file || !payoutId) {
    return NextResponse.json({ error: 'file and payout_id required' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 400 })
  }

  const mimeType = file.type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: 'Ungültiges Dateiformat (PDF, PNG, JPG erlaubt)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const fileName = `${Date.now()}.${ext}`
  const storagePath = `${payoutId}/${fileName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error } = await supabaseAdmin.storage
    .from('payout-proofs')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: signedUrl } = await supabaseAdmin.storage
    .from('payout-proofs')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year

  return NextResponse.json({
    url: signedUrl?.signedUrl ?? storagePath,
    path: storagePath,
    name: file.name,
  })
}
