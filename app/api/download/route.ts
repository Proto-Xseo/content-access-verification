import { NextRequest, NextResponse } from 'next/server'

const UA = process.env.UA || 'Mozilla/5.0'
const API_META = process.env.API_META || 'https://bunkr.cr/api/_001_v2'
const API_SIGN = process.env.API_SIGN || 'https://glb-apisign.cdn.cr/sign'

async function pageText(url: string) {
  const response = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, cache: 'no-store' })
  if (!response.ok) throw new Error(`File page returned ${response.status}`)
  return response.text()
}

async function resolve(fileUrl: string) {
  const html = await pageText(fileUrl)
  const fileId = html.match(/data-file-id=["'](\d+)/i)?.[1] || html.match(/\/file\/(\d+)/i)?.[1]
  const pageSource = html.match(/var\s+jsCDN\s*=\s*["']([^"']+)/i)?.[1]?.replaceAll('\\/', '/')
  const title = html.match(/<title>\s*([^<]+?)\s*\|\s*Bunkr/i)?.[1]?.trim()
  let meta: { mediafiles?: string; path?: string; original?: string } = {}
  if (fileId) {
    const metaResponse = await fetch(API_META, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/json' }, body: JSON.stringify({ id: String(fileId) }), cache: 'no-store' })
    if (metaResponse.ok) meta = await metaResponse.json()
  }
  const source = pageSource || (meta.mediafiles && meta.path ? `${meta.mediafiles.replace(/\/$/, '')}${meta.path}` : '')
  if (!source) throw new Error('No authorized media source was exposed for this file.')
  const parsed = new URL(source)
  const signResponse = await fetch(`${API_SIGN}?path=${encodeURIComponent(parsed.pathname)}`, { headers: { 'user-agent': UA }, cache: 'no-store' })
  if (!signResponse.ok) throw new Error(`Signing request returned ${signResponse.status}`)
  const sign = await signResponse.json()
  const mediaUrl = `${source}${parsed.search ? '&' : '?'}${new URLSearchParams({ n: meta.original || title || '', token: sign.token, ex: sign.ex })}`
  return { mediaUrl, filename: meta.original || title || `${fileId || 'video'}.mp4` }
}

export async function GET(request: NextRequest) {
  const fileUrl = request.nextUrl.searchParams.get('url')
  if (!fileUrl) return NextResponse.json({ error: 'Missing file URL.' }, { status: 400 })
  try {
    const { mediaUrl, filename } = await resolve(fileUrl)
    const upstream = await fetch(mediaUrl, { headers: { 'user-agent': UA, referer: `${process.env.DEFAULT_HOST || 'https://bunkr.cr'}/` }, cache: 'no-store' })
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: `Media returned ${upstream.status}.` }, { status: 502 })
    const inline = request.nextUrl.searchParams.get('inline') === '1'
    return new Response(upstream.body, { status: 200, headers: { 'content-type': upstream.headers.get('content-type') || 'application/octet-stream', 'content-length': upstream.headers.get('content-length') || '', 'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename.replaceAll('"', '')}"`, 'cache-control': 'no-store', 'accept-ranges': 'bytes' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to resolve download.' }, { status: 502 })
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60
        
        
