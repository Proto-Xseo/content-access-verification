import { NextResponse } from 'next/server'
import { getRuntimeConfig } from '../../config/route'

export async function GET() {
  const { token } = getRuntimeConfig()
  if (!token) return NextResponse.json({ error: 'Save the bot token first.' }, { status: 400 })
  const response = await fetch('https://discord.com/api/v10/users/@me/guilds', { headers: { authorization: `Bot ${token}` }, cache: 'no-store' })
  const data = await response.json().catch(() => null)
  if (!response.ok) return NextResponse.json({ error: `Discord rejected guild discovery (${response.status}).` }, { status: response.status })
  return NextResponse.json({ guilds: Array.isArray(data) ? data.map((guild) => ({ id: guild.id, name: guild.name, icon: guild.icon })) : [] })
}
