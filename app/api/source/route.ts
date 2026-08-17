import { NextRequest, NextResponse } from 'next/server'

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|mkv|avi)(?:[?#].*)?$/i
const FILE_PAGE = /\/f\/[A-Za-z0-9_-]+(?:[?#].*)?$/i
const ABSOLUTE_URL = /^https?:\/\//i

function absoluteUrl(value: string, base: string) {
  try { return new URL(value, base).toString() } catch { return null }
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

function extractItems(html: string, pageUrl: string) {
  const items: { id: string; title: string; url: string; pageUrl: string; kind: 'video' | 'file' }[] = []
  const seen = new Set<string>()
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchorPattern.exec(html))) {
    const url = absoluteUrl(match[1], pageUrl)
    if (!url || seen.has(url) || url.startsWith('javascript:')) continue
    const label = stripTags(match[2]) || decodeURIComponent(url.split('/').pop() || 'Untitled video')
    const isFilePage = FILE_PAGE.test(new URL(url).pathname)
    const likelyMedia = VIDEO_EXTENSIONS.test(url) || isFilePage || /download|video|media|file/i.test(`${url} ${label}`)
    if (!likelyMedia) continue
    seen.add(url)
    items.push({ id: `source-${items.length + 1}`, title: label.slice(0, 180) || 'Untitled video', url, pageUrl, kind: VIDEO_EXTENSIONS.test(url) ? 'video' : 'file' })
  }
  return items
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('url')
  if (!source) return NextResponse.json({ error: 'Missing source URL.' }, { status: 400 })
  let origin: URL
  try { origin = new URL(source) } catch { return NextResponse.json({ error: 'Enter a valid URL.' }, { status: 400 }) }

  try {
    const response = await fetch(origin, { headers: { accept: 'text/html,application/xhtml+xml' }, cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: `Source returned ${response.status}.` }, { status: 502 })
    const firstHtml = await response.text()
    const pageLinks = [...firstHtml.matchAll(/href=["']([^"']+)["']/gi)]
      .map((match) => absoluteUrl(match[1], origin.toString()))
      .filter((url): url is string => Boolean(url) && new URL(url).origin === origin.origin && /[?&]page=\d+/i.test(url))
    const detectedPages = pageLinks.map((value) => Number(new URL(value).searchParams.get('page') || 1)).filter((value) => Number.isFinite(value))
    const lastPage = Math.max(1, ...detectedPages)
    const pages = Array.from({ length: lastPage }, (_, index) => {
      const page = index + 1
      return page === 1 ? origin.toString() : `${origin.origin}${origin.pathname}?page=${page}`
    })
    const htmls = await Promise.all(pages.map(async (page) => page === origin.toString() ? firstHtml : await fetch(page, { headers: { accept: 'text/html,application/xhtml+xml' }, cache: 'no-store' }).then((result) => result.ok ? result.text() : '')))
    const items = htmls.flatMap((html, index) => extractItems(html, pages[index]))
    const uniqueItems = [...new Map(items.map((item) => [item.url, item])).values()].map((item, index) => ({ ...item, id: `source-${index + 1}` }))
    return NextResponse.json({ source: origin.toString(), items: uniqueItems, pagesDiscovered: pages.length, scannedAt: new Date().toISOString(), note: `Scanned ${pages.length} collection pages. File pages are included; open one to resolve its authorized media player.` })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to reach source.' }, { status: 502 })
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60
