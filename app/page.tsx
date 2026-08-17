'use client'

import { useEffect, useMemo, useState } from 'react'
import { Archive, Check, Download, FileVideo, Grid2X2, LayoutList, Loader2, Play, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'

type Item = { id: string; title: string; url: string; pageUrl: string; kind: 'video' | 'file' }
type ItemStatus = 'ready' | 'downloading' | 'verifying' | 'downloaded' | 'failed'
type Scan = { source: string; items: Item[]; pagesDiscovered: number; scannedAt: string; note?: string }
const defaultSource = 'https://bunkr.cr/a/ZRRy6S9v'

export default function Page() {
  const [source, setSource] = useState(defaultSource)
  const [scan, setScan] = useState<Scan | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({})
  const [active, setActive] = useState<Item | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [autoStarted, setAutoStarted] = useState(false)

  async function scanSource() {
    setLoading(true); setError('')
    try { const response = await fetch(`/api/source?url=${encodeURIComponent(source)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to scan source.'); setScan(data); setSelected([]); setStatuses(Object.fromEntries(data.items.map((item: Item) => [item.id, 'ready']))); void downloadItems(data.items) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to scan source.') } finally { setLoading(false) }
  }

  useEffect(() => { if (!autoStarted) { setAutoStarted(true); void scanSource() } }, [autoStarted])

  const filtered = useMemo(() => (scan?.items ?? []).filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [scan, query])
  const allSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.id))
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const setStatus = (id: string, status: ItemStatus) => setStatuses((current) => ({ ...current, [id]: status }))

  async function downloadItems(items: Item[]) {
    if (!items.length || downloading) return
    setDownloading(true); setError('')
    for (const item of items) {
      setStatus(item.id, 'downloading')
      try {
        const response = await fetch(`/api/download?url=${encodeURIComponent(item.url)}`)
        if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.error || `Download failed (${response.status})`) }
        const blob = await response.blob()
        setStatus(item.id, 'verifying')
        if (blob.size < 1024) throw new Error('Downloaded response was empty.')
        if (blob.type.startsWith('video/')) {
          await new Promise<void>((resolve, reject) => { const video = document.createElement('video'); const url = URL.createObjectURL(blob); video.preload = 'metadata'; video.onloadedmetadata = async () => { try { video.muted = true; await video.play(); video.pause(); URL.revokeObjectURL(url); resolve() } catch { URL.revokeObjectURL(url); reject(new Error('Downloaded video could not be played.')) } }; video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Downloaded video failed media validation.')) }; video.src = url; video.load() })
        }
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = item.title || 'video.mp4'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000)
        setStatus(item.id, 'downloaded')
      } catch (caught) { setStatus(item.id, 'failed'); setError(caught instanceof Error ? caught.message : 'A download failed.') }
    }
    setDownloading(false)
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border/70"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Archive className="size-4" /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Live source recovery</p><h1 className="text-lg font-semibold">Vaultline</h1></div></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Signed downloads, fresh per file</div></div></header>
    <section className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10"><div className="mb-8 max-w-3xl"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Live collection</p><h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Recover your actual archive.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Opening this page starts recovery automatically. Each file resolves a fresh signed media URL, downloads sequentially, and is checked by the browser before being marked complete.</p></div>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 md:flex-row"><input value={source} onChange={(event) => setSource(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="Collection URL" /><button onClick={scanSource} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {loading ? 'Scanning source' : 'Scan collection'}</button></div>
      {error && <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      {scan && <><div className="mt-8 grid gap-3 sm:grid-cols-3"><Stat label="Items discovered" value={scan.items.length.toLocaleString()} /><Stat label="Pages detected" value={scan.pagesDiscovered.toString()} /><Stat label="Downloaded" value={Object.values(statuses).filter((status) => status === 'downloaded').length.toString()} /></div><div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search discovered filenames..." className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" /></div><button onClick={() => downloadItems(scan.items.filter((item) => selected.includes(item.id)))} disabled={!selected.length || downloading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"><Download className="size-4" /> {downloading ? 'Downloading…' : `Download ${selected.length || ''}`}</button><div className="flex items-center gap-1 rounded-xl border border-border p-1"><button onClick={() => setView('grid')} className={`rounded-lg p-2 ${view === 'grid' ? 'bg-muted' : 'text-muted-foreground'}`} aria-label="Grid view"><Grid2X2 className="size-4" /></button><button onClick={() => setView('list')} className={`rounded-lg p-2 ${view === 'list' ? 'bg-muted' : 'text-muted-foreground'}`} aria-label="List view"><LayoutList className="size-4" /></button></div></div><div className="my-4 flex items-center justify-between text-xs text-muted-foreground"><button onClick={() => setSelected(allSelected ? [] : filtered.map((item) => item.id))} className="inline-flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-md border border-border">{allSelected && <Check className="size-3 text-primary" />}</span>{selected.length ? `${selected.length} selected` : `${filtered.length} shown`}</button><span>{scan.note}</span></div><div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'flex flex-col gap-2'}>{filtered.map((item) => <article key={item.id} className="group rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><button onClick={() => toggle(item.id)} className="flex items-center gap-3 text-left"><span className={`flex size-5 items-center justify-center rounded-md border ${selected.includes(item.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{selected.includes(item.id) && <Check className="size-3" />}</span><FileVideo className="size-5 text-primary" /><span className="line-clamp-2 text-sm font-medium">{item.title}</span></button><Status status={statuses[item.id] || 'ready'} /></div><p className="mt-3 truncate font-mono text-[10px] text-muted-foreground">{item.url}</p><div className="mt-4 flex gap-2"><button onClick={() => setActive(item)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"><Play className="size-3" /> Preview</button><button onClick={() => downloadItems([item])} disabled={downloading} className="inline-flex items-center justify-center rounded-lg bg-secondary px-3 py-2 text-xs disabled:opacity-50" aria-label={`Download ${item.title}`}><Download className="size-3" /></button></div></article>)}</div></>}
    </section>{active && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6 backdrop-blur-md"><div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-4"><h2 className="font-medium">{active.title}</h2><button onClick={() => setActive(null)} aria-label="Close preview"><X className="size-5" /></button></div><div className="p-4"><video key={active.id} className="max-h-[62vh] w-full rounded-xl bg-background" controls autoPlay muted playsInline src={`/api/download?inline=1&url=${encodeURIComponent(active.url)}`}><track kind="captions" /></video><p className="mt-3 text-sm text-muted-foreground">Previewing the verified media stream through the recovery route.</p><a href={active.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm text-secondary-foreground"><Play className="size-4" /> Open source page</a></div></div></div>}</main>
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div> }
function Status({ status }: { status: ItemStatus }) { return <span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">{status}</span> }
