import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin-client'

export async function GET(req: NextRequest) {
  const clientId = new URL(req.url).searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ wallets: [], cards: [] })

  const [walletsRes, cardsRes] = await Promise.all([
    supabaseAdmin.from('wallet_addresses').select('id, coin, address, exchange').eq('client_id', clientId).order('created_at'),
    supabaseAdmin.from('bb_cards').select('id, card_number, email').eq('client_id', clientId).order('created_at'),
  ])

  return NextResponse.json({
    wallets: walletsRes.data ?? [],
    cards: cardsRes.data ?? [],
  })
}
