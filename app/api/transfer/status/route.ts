import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'

const DATA_DIR = `${process.cwd()}/.courier-data`

export async function GET() {
  let progress: Record<string, unknown> | null = null
  let logTail = ''
  try { progress = JSON.parse(await readFile(`${DATA_DIR}/progress.json`, 'utf8')) } catch {}
  try { const log = await readFile(`${DATA_DIR}/worker.log`, 'utf8'); logTail = log.split('\n').slice(-12).join('\n') } catch {}
  return NextResponse.json({ progress, logTail })
}
