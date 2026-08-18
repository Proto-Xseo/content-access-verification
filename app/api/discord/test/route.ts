import { NextResponse } from 'next/server'
import { getRuntimeConfig } from '../../config/route'

export async function POST() {
  const config = getRuntimeConfig()
  if (!config.token || !config.channels.length) return NextResponse.json({ error: 'Save a bot token and channel ID first.' }, { status: 400 })
  const channel = config.channels[0]
  const response = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channel)}/messages`, { method: 'POST', headers: { authorization: `Bot ${config.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ content: 'Courier Ledger connection test — normal message delivery is working.' }) })
  if (!response.ok) { const detail = await response.text(); return NextResponse.json({ error: `Discord rejected the test (${response.status}). ${detail.slice(0, 180)}` }, { status: response.status }) }
  return NextResponse.json({ ok: true, message: `Test message sent to channel ${channel}.` })
}
