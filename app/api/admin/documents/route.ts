import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contractId = searchParams.get('contract_id')

  if (!contractId) {
    return NextResponse.json({ error: 'contract_id erforderlich' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('contract_documents')
    .select('*')
    .eq('contract_id', contractId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('[/api/admin/documents] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documents: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id erforderlich' }, { status: 400 })
  }

  // Fetch the document to get the storage path before deleting
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('contract_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 })
  }

  // Extract storage path from the URL (path after /object/sign/contracts/)
  try {
    const url = new URL(doc.file_url)
    const pathParts = url.pathname.split('/object/sign/contracts/')
    if (pathParts[1]) {
      const storagePath = decodeURIComponent(pathParts[1].split('?')[0])
      await supabaseAdmin.storage.from('contracts').remove([storagePath])
    }
  } catch {
    // Non-fatal — still delete the DB record
  }

  const { error: deleteError } = await supabaseAdmin
    .from('contract_documents')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
