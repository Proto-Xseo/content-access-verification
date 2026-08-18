import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'

const CONFIG_FILE = `${process.cwd()}/.courier-config.json`
const DEFAULT_CONFIG = { token: '', channels: [] as string[], webhookName: 'Archive Courier', webhookAvatar: '', concurrency: 8, splitSize: 10 }
let runtimeConfig = { ...DEFAULT_CONFIG }

export async function GET() { try { const saved = JSON.parse(await readFile(CONFIG_FILE, 'utf8')); runtimeConfig = { ...runtimeConfig, ...saved } } catch {} return NextResponse.json({ config: { ...runtimeConfig, token: runtimeConfig.token ? '••••••••' : '' } }) }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.token) return NextResponse.json({ error: 'Bot token is required.' }, { status: 400 })
  const channels = String(body.channels || '').split(',').map((value) => value.trim()).filter(Boolean)
  runtimeConfig = { token: String(body.token), channels, webhookName: String(body.webhookName || 'Archive Courier'), webhookAvatar: String(body.webhookAvatar || ''), concurrency: Math.max(1, Math.min(20, Number(body.concurrency) || 8)), splitSize: Math.max(1, Number(body.splitSize) || 10) }
  await writeFile(CONFIG_FILE, JSON.stringify(runtimeConfig), 'utf8')
  return NextResponse.json({ ok: true, message: 'Configuration saved server-side for this private session.' })
}

export function getRuntimeConfig() {
  // Always reconcile with the on-disk config so route handlers that run after a
  // server restart (test, layout, transfer) never fall back to stale defaults.
  try { const saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); runtimeConfig = { ...DEFAULT_CONFIG, ...saved } } catch {}
  return runtimeConfig
}
