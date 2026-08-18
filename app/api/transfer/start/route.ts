import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import { openSync, mkdirSync } from 'node:fs'
import { getRuntimeConfig } from '../../config/route'
import { getLayout } from '../../discord/layout/route'

const DATA_DIR = `${process.cwd()}/.courier-data`

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const album = String(body?.album || '')
  const config = getRuntimeConfig()
  const current = getLayout()
  if (!album) return NextResponse.json({ error: 'Enter the Bunkr album URL first.' }, { status: 400 })
  if (!config.token || !current?.channels?.length) return NextResponse.json({ error: 'Save the bot token and create the archive layout first.' }, { status: 400 })

  const channels = current.channels.map((channel) => channel.id).join(',')
  const webhooks = current.channels
    .filter((channel) => channel.webhookId && channel.webhookToken)
    .map((channel) => `https://discord.com/api/webhooks/${channel.webhookId}/${channel.webhookToken}`)
    .join(',')
  if (!webhooks) return NextResponse.json({ error: 'The layout has no webhooks. Recreate the archive layout.' }, { status: 400 })

  mkdirSync(DATA_DIR, { recursive: true })
  const logFd = openSync(`${DATA_DIR}/worker.log`, 'a')

  const child = spawn('python3', [
    `${process.cwd()}/discord_courier.py`,
    '--token', config.token,
    '--channels', channels,
    '--webhooks', webhooks,
    '--webhook-name', config.webhookName || '',
    '--webhook-avatar', config.webhookAvatar || '',
    '--album', album,
    '--out', DATA_DIR,
    '--concurrency', String(config.concurrency || 4),
    '--split-mb', String(config.splitSize || 10),
  ], { cwd: process.cwd(), detached: true, stdio: ['ignore', logFd, logFd] })
  child.unref()

  return NextResponse.json({ ok: true, state: 'running', message: 'Transfer worker started. Watch the live progress below.' })
}
