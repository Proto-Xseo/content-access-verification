import { NextResponse } from 'next/server'

let runtimeConfig = { token: '', channels: [] as string[], webhookName: 'Archive Courier', webhookAvatar: '', concurrency: 8, splitSize: 10 }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.token || !body?.channels) return NextResponse.json({ error: 'Bot token and at least one channel ID are required.' }, { status: 400 })
  const channels = String(body.channels).split(',').map((value) => value.trim()).filter(Boolean)
  runtimeConfig = { token: String(body.token), channels, webhookName: String(body.webhookName || 'Archive Courier'), webhookAvatar: String(body.webhookAvatar || ''), concurrency: Math.max(1, Math.min(20, Number(body.concurrency) || 8)), splitSize: Math.max(1, Number(body.splitSize) || 10) }
  return NextResponse.json({ ok: true, message: 'Configuration saved server-side for this private session.' })
}

export function getRuntimeConfig() { return runtimeConfig }
