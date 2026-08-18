import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import { getRuntimeConfig } from '../../config/route'
import { getLayout } from '../../discord/layout/route'

let processRef: ReturnType<typeof spawn> | null = null
let transferStatus = { state: 'idle', message: 'Ready to start.', startedAt: null as string | null }

export async function POST(request: Request) {
  if (processRef && !processRef.killed) return NextResponse.json({ ...transferStatus, message: 'Transfer is already running.' })
  const body = await request.json().catch(() => null)
  const album = String(body?.album || '')
  const config = getRuntimeConfig()
  const current = getLayout()
  if (!album) return NextResponse.json({ error: 'Enter the Bunkr album URL first.' }, { status: 400 })
  if (!config.token || !current?.channels?.length) return NextResponse.json({ error: 'Save the bot token and create the archive layout first.' }, { status: 400 })
  const channels = current.channels.map((channel) => channel.id).join(',')
  const webhooks = current.channels.filter((channel) => channel.webhookId && channel.webhookToken).map((channel) => `https://discord.com/api/webhooks/${channel.webhookId}/${channel.webhookToken}`).join(',')
  transferStatus = { state: 'running', message: 'Transfer worker started.', startedAt: new Date().toISOString() }
  processRef = spawn('python3', ['/vercel/share/v0-project/discord_courier.py', '--token', config.token, '--channels', channels, '--album', album, '--out', '/tmp/courier-data', '--concurrency', String(config.concurrency || 8), '--split-mb', String(config.splitSize || 10), '--webhooks', webhooks], { detached: false, stdio: 'ignore' })
  processRef.on('exit', (code) => { transferStatus = { ...transferStatus, state: code === 0 ? 'complete' : 'failed', message: code === 0 ? 'Transfer complete.' : `Transfer stopped with code ${code}.` }; processRef = null })
  return NextResponse.json(transferStatus)
}

export async function GET() { return NextResponse.json(transferStatus) }
export const maxDuration = 60
