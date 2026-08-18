import { NextResponse } from 'next/server'
import { getRuntimeConfig } from '../../config/route'

export async function POST() {
  const config = getRuntimeConfig()
  if (!config.token) return NextResponse.json({ error: 'Save a bot token first.' }, { status: 400 })
  const { getLayout } = await import('../layout/route')
  const current = getLayout()
  const channel = current?.channels[0]
  if (!channel?.webhookId || !channel?.webhookToken) return NextResponse.json({ error: 'Create the archive layout first so webhook endpoints exist.' }, { status: 400 })
  const response = await fetch(`https://discord.com/api/v10/webhooks/${channel.webhookId}/${channel.webhookToken}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: config.webhookName || 'Archive Courier', avatar_url: config.webhookAvatar || undefined, content: 'Courier Ledger connection test — webhook delivery is working.' }) })
  if (!response.ok) { const detail = await response.text(); return NextResponse.json({ error: `Discord rejected the webhook test (${response.status}). ${detail.slice(0, 180)}` }, { status: response.status }) }
  return NextResponse.json({ ok: true, message: `Webhook test sent to ${channel.name}.` })
}
