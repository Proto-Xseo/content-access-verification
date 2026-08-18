import { NextResponse } from 'next/server'
import { getRuntimeConfig } from '../../config/route'

let layout: { guildId: string; categoryId: string; channels: { id: string; name: string; capacity: number }[] } | null = null

export function getLayout() { return layout }

export async function POST(request: Request) {
  const config = getRuntimeConfig()
  const body = await request.json().catch(() => null)
  const guildId = String(body?.guildId || '')
  const total = Math.max(1, Number(body?.total) || 2528)
  const target = Math.max(500, Math.min(800, Number(body?.target) || 650))
  if (!config.token || !guildId) return NextResponse.json({ error: 'Save the bot token and select a server first.' }, { status: 400 })
  if (layout?.guildId === guildId && layout.channels.length === Math.ceil(total / target)) return NextResponse.json({ ok: true, layout, reused: true })
  const headers = { authorization: `Bot ${config.token}`, 'content-type': 'application/json' }
  const categoryResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { method: 'POST', headers, body: JSON.stringify({ name: `archive-${new Date().toISOString().slice(0, 10)}`, type: 4 }) })
  const category = await categoryResponse.json().catch(() => null)
  if (!categoryResponse.ok) return NextResponse.json({ error: `Could not create category (${categoryResponse.status}).` }, { status: categoryResponse.status })
  const count = Math.ceil(total / target)
  const channels = []
  for (let index = 0; index < count; index++) {
    const capacity = index === count - 1 ? total - target * index : target
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { method: 'POST', headers, body: JSON.stringify({ name: `archive-${String(index + 1).padStart(2, '0')}`, type: 0, parent_id: category.id }) })
    const channel = await response.json().catch(() => null)
    if (!response.ok) return NextResponse.json({ error: `Could not create channel ${index + 1} (${response.status}).` }, { status: response.status })
    channels.push({ id: channel.id, name: channel.name, capacity })
  }
  layout = { guildId, categoryId: category.id, channels }
  return NextResponse.json({ ok: true, layout, reused: false })
}
